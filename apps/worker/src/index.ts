import Fastify from 'fastify';
import { hostname } from 'node:os';
import { setTimeout as wait } from 'node:timers/promises';
import { SpanKind, SpanStatusCode } from '@opentelemetry/api';
import { channels, type Channel } from '../../../packages/contracts/core.js';
import { environment, integerEnv, providerTimeoutMs, required } from '../../../packages/contracts/policy.js';
import { database, ready } from '../../../packages/db/index.js';
import { telemetry, traceHeaders } from '../../../packages/telemetry/index.js';
import { finish, take, type Job, type Result } from './queue.js';

const channel = process.argv[2] as Channel;
if (!channels.includes(channel)) throw new Error('Especifica email o internal');
const tel = telemetry('vetnotify-worker-'+channel);
const pool = database();
const worker = hostname()+'-'+channel;
const simulator = channel === 'email' ? new URL('/deliver', required('SIMULATOR_URL')) : null;
const simulatorKey = channel === 'email' ? required('SIMULATOR_KEY') : '';
const concurrency = integerEnv('WORKER_CONCURRENCY', 2, 1, 8);
let lastPass = Date.now();
let stopping = false;
const app = Fastify({ disableRequestLogging: true, loggerInstance: tel.logger });
app.get('/health/live', async (_req, reply) => {
  if (Date.now()-lastPass > 25000) return reply.code(503).send({ status: 'stalled' });
  return { status: 'live' };
});
app.get('/health/ready', async (_req, reply) => {
  try { await ready(pool); return { status: 'ready' }; } catch { return reply.code(503).send({ status: 'unavailable' }); }
});

async function sendEmail(job: Job): Promise<Result> {
  return tel.span('email.provider.send', SpanKind.CLIENT, async span => {
    const deliveryKey = environment+':'+job.id;
    try {
      const response = await fetch(simulator!, {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(providerTimeoutMs),
        headers: { ...traceHeaders(), authorization: 'Bearer '+simulatorKey, 'content-type': 'application/json' },
        body: JSON.stringify({ deliveryKey, notificationId: job.id, address: job.recipient_email,
          subject: job.subject, body: job.body }),
      });
      span.setAttribute('http.response.status_code', response.status);
      if (response.ok) {
        const { receiptId } = await response.json() as { receiptId?: string };
        if (typeof receiptId !== 'string' || !/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(receiptId)) {
          return { outcome: 'uncertain', code: 'invalid_provider_receipt' };
        }
        return { outcome: 'delivered', code: 'provider_accepted', receiptId };
      }
      await response.body?.cancel();
      span.setStatus({ code: SpanStatusCode.ERROR });
      if (response.status === 422) return { outcome: 'permanent', code: 'provider_recipient_rejected' };
      if ([429,502,503,504].includes(response.status)) return { outcome: 'transient', code: 'provider_http_'+response.status };
      return { outcome: 'permanent', code: 'provider_unexpected_http_'+response.status };
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR });
      return { outcome: 'uncertain', code: (error as Error).name === 'TimeoutError' ? 'provider_timeout' : 'provider_transport_or_response' };
    }
  });
}

function parent(job: { traceparent: string | null; tracestate: string | null }) {
  return { traceparent: job.traceparent ?? undefined, tracestate: job.tracestate ?? undefined };
}

async function processJob(job: Job) {
  await tel.span('notification.deliver', SpanKind.CONSUMER, async span => {
    const attrs = { notification_id: job.id, attempt_id: job.attempt_id, number: job.attempt_count,
      application: job.application_id, channel, correlation_id: job.correlation_id };
    span.setAttributes({ 'vetnotify.notification_id': job.id, 'vetnotify.attempt_number': job.attempt_count,
      'vetnotify.channel': channel, 'vetnotify.queue_age_ms': Date.now()-job.accepted_at.getTime() });
    tel.logger.info({ ...attrs, ...tel.fields(), operation: 'attempt_claimed', result: 'processing' });
    const result: Result = channel === 'email' ? await sendEmail(job) : { outcome: 'delivered', code: 'inbox_persisted' };
    const state = await finish(pool, job, worker, result, tel.fields());
    if (result.outcome !== 'delivered') span.setStatus({ code: SpanStatusCode.ERROR });
    span.setAttribute('vetnotify.result', state ?? 'lease_lost');
    tel.logger.info({ ...attrs, ...tel.fields(), operation: 'attempt_finished', result: state ?? 'lease_lost',
      outcome: result.outcome, code: result.code, receipt_id: result.receiptId });
  }, parent(job));
}

async function loop() {
  while (!stopping) {
    lastPass = Date.now();
    try {
      const { job, recovered } = await take(pool, channel, worker);
      if (job) await processJob(job);
      else if (recovered) {
        await tel.span('notification.recover_lease', SpanKind.CONSUMER, async () => {
          tel.logger.warn({ ...tel.fields(), operation: 'lease_expired', result: recovered.next, channel,
            notification_id: recovered.id, attempt_id: recovered.attempt_id, number: recovered.number,
            application: recovered.application_id, correlation_id: recovered.correlation_id });
        }, parent(recovered));
      } else await wait(140);
    } catch {
      tel.logger.error({ operation: 'worker_iteration', result: 'database_or_work_error', channel });
      await wait(1000);
    }
  }
}

async function heartbeat() {
  while (!stopping) {
    if (Date.now()-lastPass < 20000) {
      await pool.query(`INSERT INTO worker_heartbeats VALUES($1,$2,clock_timestamp())
        ON CONFLICT(channel,worker_id) DO UPDATE SET updated_at=excluded.updated_at`, [channel,worker])
        .catch(() => undefined);
    }
    await wait(2500);
  }
}

await app.listen({ host: '0.0.0.0', port: 8080 });
for (const signal of ['SIGTERM','SIGINT']) process.once(signal, () => { stopping = true; });
await Promise.all([...Array.from({ length: concurrency }, loop), heartbeat()]);
await app.close();
await pool.end();
await tel.shutdown();
