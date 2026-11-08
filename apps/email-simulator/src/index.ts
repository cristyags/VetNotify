import Fastify from 'fastify';
import { Type } from '@sinclair/typebox';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { SpanKind, SpanStatusCode } from '@opentelemetry/api';
import { randomUUID } from 'node:crypto';
import { setTimeout as wait } from 'node:timers/promises';
import { emailSchema, uuid, type FaultMode } from '../../../packages/contracts/core.js';
import { environment, faultsEnabled, providerTimeoutMs, required } from '../../../packages/contracts/policy.js';
import { database, ready, transaction } from '../../../packages/db/index.js';
import { secureEqual } from '../../../packages/db/password.js';
import { telemetry } from '../../../packages/telemetry/index.js';

const pool = database();
const tel = telemetry('vetnotify-email-simulator');
const key = required('SIMULATOR_KEY');
const app = Fastify({ loggerInstance: tel.logger, disableRequestLogging: true, bodyLimit: 16384 }).withTypeProvider<TypeBoxTypeProvider>();
const payload = Type.Object({
  deliveryKey: Type.String({ minLength: 37, maxLength: 100 }), notificationId: uuid,
  address: emailSchema, subject: Type.String({ maxLength: 160 }), body: Type.String({ maxLength: 4000 }),
}, { additionalProperties: false });
app.get('/health/live', async () => ({ status: 'live' }));
app.get('/health/ready', async (_req, reply) => {
  try { await ready(pool); return { status: 'ready' }; } catch { return reply.code(503).send({ status: 'unavailable' }); }
});
app.setErrorHandler((error, _req, reply) => {
  const validation = (error as { validation?: unknown }).validation;
  if (validation) return reply.code(400).send({ code: 'invalid_input' });
  tel.logger.error({ operation: 'simulator', result: 'database_or_work_error' });
  return reply.code(503).send({ code: 'unavailable' });
});
app.post('/deliver', { schema: { body: payload } }, async (req, reply) => {
  if (!secureEqual(req.headers.authorization, 'Bearer '+key)) return reply.code(401).send({ code: 'unauthorized' });
  const { deliveryKey, notificationId, address } = req.body;
  if (deliveryKey !== environment+':'+notificationId) return reply.code(400).send({ code: 'invalid_delivery_key' });
  return tel.span('email.simulator.accept', SpanKind.SERVER, async span => {
    const result = await transaction(pool, async client => {
      const { rows: [n] } = await client.query<{ run_id: string | null; recipient_email: string; correlation_id: string }>(
        "SELECT run_id,recipient_email,correlation_id FROM notifications WHERE id=$1 AND channel='email'", [notificationId]);
      if (!n || n.recipient_email !== address) return { status: 422, mode: 'healthy', code: 'recipient_rejected' };
      await client.query(`INSERT INTO simulator_deliveries(delivery_key,notification_id) VALUES($1,$2)
        ON CONFLICT(delivery_key) DO NOTHING`, [deliveryKey, notificationId]);
      const { rows: [delivery] } = await client.query<{ receipt_id: string | null; calls: number }>(
        'SELECT receipt_id,calls FROM simulator_deliveries WHERE delivery_key=$1 FOR UPDATE', [deliveryKey]);
      const { rows: [profile] } = faultsEnabled ? await client.query<{ mode: FaultMode; first_n: number; address_prefix: string | null }>(
        'SELECT mode,first_n,address_prefix FROM fault_profiles WHERE run_id=$1 AND expires_at>clock_timestamp()', [n.run_id]) : { rows: [] };
      const mode = profile && (!profile.address_prefix || address.startsWith(profile.address_prefix)) ? profile.mode : 'healthy';
      const call = delivery.calls+1;
      let status = 202;
      let code = 'accepted';
      let delay = false;
      let receiptId = delivery.receipt_id;
      if (receiptId) {
        code = 'deduplicated';
      } else if (address.startsWith('reject-') || mode === 'permanent_rejection') {
        status = 422;
        code = 'recipient_rejected';
      } else if (mode === 'always_503' || (mode === 'fail_first_n' && call <= (profile?.first_n ?? 0))) {
        status = 503;
        code = 'temporary_unavailable';
      } else if (mode === 'timeout') {
        status = 503;
        code = 'delayed_without_acceptance';
        delay = true;
      } else {
        receiptId = randomUUID();
        delay = mode === 'accepted_then_timeout';
        if (delay) code = 'accepted_response_delayed';
      }
      await client.query(`UPDATE simulator_deliveries SET calls=$2,receipt_id=$3::uuid,
        accepted_at=CASE WHEN receipt_id IS NULL AND $3::uuid IS NOT NULL THEN clock_timestamp() ELSE accepted_at END WHERE delivery_key=$1`,
        [deliveryKey, call, receiptId]);
      await client.query(`INSERT INTO simulator_calls(delivery_key,call_no,mode,result) VALUES($1,$2,$3,$4)`,
        [deliveryKey, call, mode, code]);
      return { status, mode, code, delay, receiptId, correlation: n.correlation_id, call };
    });
    span.setAttributes({ 'vetnotify.notification_id': notificationId, 'vetnotify.simulator.mode': result.mode, 'http.response.status_code': result.status });
    if (result.status >= 400) span.setStatus({ code: SpanStatusCode.ERROR });
    tel.logger.info({ ...tel.fields(), operation: 'simulator_delivery', result: result.code, notification_id: notificationId,
      correlation_id: result.correlation, call: result.call, receipt_id: result.receiptId });
    if (result.delay) await wait(providerTimeoutMs+1500);
    return reply.code(result.status).send({ code: result.code, receiptId: result.receiptId });
  }, { traceparent: req.headers.traceparent?.toString(), tracestate: req.headers.tracestate?.toString() });
});
app.addHook('onClose', async () => { await pool.end(); await tel.shutdown(); });
for (const signal of ['SIGTERM','SIGINT']) process.once(signal, () => { void app.close(); });
await app.listen({ host: '0.0.0.0', port: 8080 });
