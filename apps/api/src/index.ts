import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import { Type } from '@sinclair/typebox';
import { type TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { SpanKind } from '@opentelemetry/api';
import {
  acceptanceSchema, demoEventInput, faultInput, HttpError, idParams, keySchema, loginBody,
  notificationInput, pagination, reprocessBody, runId,
} from '../../../packages/contracts/core.js';
import { environment, faultsEnabled, idempotencyTtl, integerEnv, required } from '../../../packages/contracts/policy.js';
import { database, ready, transaction } from '../../../packages/db/index.js';
import { accept, cohorts, detail, list, listQuery, reprocess, statistics } from '../../../packages/db/notifications.js';
import { telemetry, traceHeaders } from '../../../packages/telemetry/index.js';
import { identity, security as createSecurity } from './security.js';
import { metrics } from './metrics.js';
import * as schema from './schemas.js';

const pool = database();
const tel = telemetry('vetnotify-api');
const app = Fastify({ loggerInstance: tel.logger, disableRequestLogging: true, bodyLimit: 16384,
  ajv: { customOptions: { removeAdditional: false } } }).withTypeProvider<TypeBoxTypeProvider>();
const publicOrigin = new URL(process.env.PUBLIC_ORIGIN ?? 'http://localhost:18080').origin;
const auth = createSecurity(pool, publicOrigin);
const prefix = '/api/v1';
const errors = schema.commonErrors;
const permissions = schema.security;
const sourceId = Type.Object({ appId: Type.Union([Type.Literal('agenda-veterinaria'), Type.Literal('laboratorio-veterinario')]) });
const writeKey = Type.Object({ 'idempotency-key': keySchema });
const health = Type.Object({ status: Type.String() });

await app.register(swagger, {
  openapi: {
    openapi: '3.0.3',
    info: { title: 'VetNotify', version: '1.0.0', description: 'Notificaciones multicanal. HTTP 202 indica aceptación durable. Todas las fechas del contrato usan UTC.' },
    servers: [{ url: '/' }],
    components: { securitySchemes: {
      applicationKey: { type: 'http', scheme: 'bearer', description: 'Clave de máquina de alta entropía. El origen se deriva de la clave.' },
      humanSession: { type: 'apiKey', in: 'cookie', name: 'vetnotify_session' },
      csrfToken: { type: 'apiKey', in: 'header', name: 'X-CSRF-Token' },
    } },
  },
});
await app.register(cookie);
await app.register(rateLimit, { global: false });

app.addHook('onRequest', async (_req, reply) => {
  reply.header('cache-control', 'no-store').header('x-content-type-options', 'nosniff');
});
app.setErrorHandler((err, req, reply) => {
  if (err instanceof HttpError) {
    if (err.statusCode === 401 || err.statusCode === 403) tel.logger.warn({
      operation: 'access_denied', path: req.routeOptions.url, result: err.code,
    });
    return reply.code(err.statusCode).send({ code: err.code, message: err.message });
  }
  const e = err as { code?: string; statusCode?: number; validation?: unknown };
  if (e.validation || (e.statusCode && [400,413,415,429].includes(e.statusCode))) {
    const status = e.statusCode ?? 400;
    return reply.code(status).send({ code: status === 429 ? 'rate_limited' : 'invalid_input',
      message: status === 429 ? 'Demasiados intentos. Espera un minuto.' : 'Revisa los campos y el formato de la solicitud.' });
  }
  const unavailable = !e.code || /^(08|53|57P0|57014|ECONN|ETIMEDOUT|ENET|EPIPE)/.test(e.code);
  tel.logger.error({ operation: 'request_failed', route: req.routeOptions.url, result: e.code ?? 'dependency_error' });
  return reply.code(unavailable ? 503 : 500).send({
    code: unavailable ? 'unavailable' : 'internal_error', message: 'La operación no se pudo completar.',
  });
});

app.get('/health/live', { schema: { summary: 'Liveness del proceso', response: { 200: health } } }, async () => ({ status: 'live' }));
app.get('/health/ready', { schema: { summary: 'Verifica PostgreSQL y migración', response: { 200: health, 503: errors[503] } } },
  async () => { await ready(pool); return { status: 'ready' }; });
app.get(prefix+'/version', { schema: { summary: 'Versión desplegada', response: { 200: schema.versionSchema } } },
  async () => ({ name: 'VetNotify', version: '1.0.0', commit: process.env.REVISION ?? 'local',
    image: process.env.IMAGE_REF ?? 'local', environment }));
app.get(prefix+'/openapi.json', { schema: { hide: true } }, async () => app.swagger());
app.get('/metrics', { schema: { hide: true } }, async (_req, reply) =>
  reply.type('text/plain; version=0.0.4; charset=utf-8').send(await metrics(pool)));

app.post(prefix+'/auth/login', { config: { rateLimit: { max: 12, timeWindow: '1 minute' } },
  schema: { summary: 'Inicia sesión y devuelve token CSRF', body: loginBody,
    response: { 200: schema.identitySchema, ...errors } } },
  async (req, reply) => auth.login(req, reply, req.body.username, req.body.password));
app.get(prefix+'/auth/me', { schema: { summary: 'Identidad y permisos efectivos', security: permissions.human,
  response: { 200: schema.identitySchema, ...errors } } }, async req => identity(await auth.human(req)));
app.post(prefix+'/auth/logout', { schema: { summary: 'Revoca sesión', security: permissions.writer,
  response: { 204: Type.Null(), ...errors } } }, async (req, reply) => auth.logout(req, reply));

app.post(prefix+'/notifications', { schema: { summary: 'Acepta una notificación de forma durable',
  description: 'La clave opcional se interpreta por emisor y canal. HTTP 202 para alta y HTTP 200 para replay. Destinos .test exclusivamente.',
  security: permissions.machine, body: notificationInput, headers: Type.Partial(writeKey),
  response: { 200: acceptanceSchema, 202: acceptanceSchema, ...errors } } }, async (req, reply) =>
  tel.span('notification.accept', SpanKind.SERVER, async span => {
    const application = await auth.machine(req);
    const result = await transaction(pool, client => accept(client, application, req.body, req.headers['idempotency-key']));
    span.setAttributes({ 'vetnotify.notification_id': result.id, 'vetnotify.channel': req.body.channel, 'vetnotify.application': application });
    tel.logger.info({ ...tel.fields(), operation: 'acceptance', result: result.replay ? 'replay' : 'committed',
      transitions: result.replay ? undefined : ['accepted','pending'], notification_id: result.id,
      correlation_id: result.correlationId, application, channel: req.body.channel }, 'Recepción durable');
    return reply.code(result.replay ? 200 : 202).header('location', prefix+'/notifications/'+result.id).send(result);
  }, { traceparent: req.headers.traceparent?.toString(), tracestate: req.headers.tracestate?.toString() }));

app.get(prefix+'/notifications', { schema: { summary: 'Lista filtrada y paginada',
  description: 'Orden aceptada DESC, ID DESC. Intervalo [from,to). La clave de máquina limita la lista al emisor.',
  querystring: listQuery, security: permissions.reader, response: { 200: schema.paged(schema.summary), ...errors } } },
  async req => list(pool, req.query, await auth.reader(req)));

app.get(prefix+'/notifications/:id', { schema: { summary: 'Detalle y cadena de reproceso', params: idParams,
  security: permissions.reader, response: { 200: schema.detailSchema, ...errors } } },
  async req => detail(pool, req.params.id, await auth.reader(req)));
app.get(prefix+'/notifications/:id/attempts', { schema: { summary: 'Intentos ordenados por número (máximo tres)', params: idParams,
  security: permissions.reader, response: { 200: Type.Array(schema.attemptSchema), ...errors } } }, async req => {
  await detail(pool, req.params.id, await auth.reader(req));
  return (await pool.query(`SELECT id,number,worker_id,started_at,finished_at,outcome,code,receipt_id,trace_id,span_id,
    round(extract(epoch FROM finished_at-started_at)*1000,2)::float8 AS duration_ms
    FROM attempts WHERE notification_id=$1 ORDER BY number`, [req.params.id])).rows;
});
app.get(prefix+'/notifications/:id/transitions', { schema: { summary: 'Historial inmutable de estados', params: idParams,
  security: permissions.reader, response: { 200: Type.Array(schema.transitionSchema), ...errors } } }, async req => {
  await detail(pool, req.params.id, await auth.reader(req));
  return (await pool.query(`SELECT from_state,to_state,at,reason,actor,correlation_id FROM transitions WHERE notification_id=$1 ORDER BY id`,
    [req.params.id])).rows;
});
app.post(prefix+'/notifications/:id/reprocess', { schema: { summary: 'Crea una derivada de un fallo',
  description: 'La original conserva su historial. Exige clave independiente y token CSRF.',
  params: idParams, headers: writeKey, body: reprocessBody, security: permissions.writer,
  response: { 200: acceptanceSchema, 202: acceptanceSchema, ...errors } } }, async (req, reply) =>
  tel.span('notification.reprocess', SpanKind.SERVER, async () => {
    const user = await auth.human(req, 'operator', true);
    const result = await transaction(pool, client => reprocess(client, req.params.id, user.id,
      req.headers['idempotency-key'], req.body.reason));
    tel.logger.info({ ...tel.fields(), operation: 'manual_reprocess', result: result.replay ? 'replay' : 'committed',
      notification_id: result.id, source_id: req.params.id, correlation_id: result.correlationId, actor: user.id });
    return reply.code(result.replay ? 200 : 202).header('location', prefix+'/notifications/'+result.id).send(result);
  }));

const inboxSelect = `SELECT n.id,n.application_id,n.subject,n.body,i.available_at,i.read_at
  FROM inbox i JOIN notifications n ON n.id=i.notification_id WHERE i.recipient_id=$1`;
app.get(prefix+'/me/inbox', { schema: { summary: 'Bandeja propia paginada', querystring: Type.Object(pagination),
  security: permissions.human, response: { 200: schema.paged(schema.inboxSchema), ...errors } } }, async req => {
  const user = await auth.human(req, 'recipient');
  const limit = req.query.limit ?? 25;
  const offset = req.query.offset ?? 0;
  const { rows: [result] } = await pool.query(`WITH page AS (
    ${inboxSelect} ORDER BY i.available_at DESC,n.id DESC LIMIT $2 OFFSET $3)
    SELECT (SELECT count(*)::int FROM inbox WHERE recipient_id=$1) AS total,
    COALESCE((SELECT jsonb_agg(page ORDER BY available_at DESC,id DESC) FROM page),'[]') AS items`, [user.recipient_id, limit, offset]);
  return { ...result, limit, offset };
});
app.get(prefix+'/me/inbox/:id', { schema: { summary: 'Detalle de un aviso propio', params: idParams,
  security: permissions.human, response: { 200: schema.inboxSchema, ...errors } } }, async req => {
  const user = await auth.human(req, 'recipient');
  const { rows: [item] } = await pool.query(inboxSelect+' AND i.notification_id=$2', [user.recipient_id, req.params.id]);
  if (!item) throw new HttpError(404, 'not_found', 'El aviso no está disponible.');
  return item;
});
app.patch(prefix+'/me/inbox/:id/read', { schema: { summary: 'Marca un aviso propio como leído',
  params: idParams, security: permissions.writer, response: { 204: Type.Null(), ...errors } } }, async (req, reply) => {
  const user = await auth.human(req, 'recipient', true);
  const result = await pool.query(`UPDATE inbox SET read_at=COALESCE(read_at,clock_timestamp())
    WHERE recipient_id=$1 AND notification_id=$2`, [user.recipient_id, req.params.id]);
  if (!result.rowCount) throw new HttpError(404, 'not_found', 'El aviso no está disponible.');
  return reply.code(204).send(null);
});

app.get(prefix+'/stats', { schema: { summary: 'Recuentos y tasas por canal y estado',
  description: 'La tasa es grupo / total del canal en el conjunto filtrado. Latencia media solo para entregadas.',
  querystring: listQuery, security: permissions.reader, response: { 200: schema.statsSchema, ...errors } } },
  async req => statistics(pool, req.query, await auth.reader(req)));
app.get(prefix+'/stats/cohorts', { schema: { summary: 'SLI de cohortes maduras de 15 minutos',
  security: permissions.human, response: { 200: schema.cohortSchema, ...errors } } }, async req => {
  await auth.human(req, 'operator');
  return cohorts(pool);
});
app.get(prefix+'/applications', { schema: { summary: 'Clientes registrados sin credenciales', security: permissions.human,
  response: { 200: schema.appSchema, ...errors } } }, async req => {
  await auth.human(req, 'operator');
  return (await pool.query('SELECT id,name,enabled FROM applications ORDER BY id')).rows;
});

app.post(prefix+'/demo/:appId/events', { schema: { summary: 'Envía un evento mediante el adaptador de su aplicación',
  params: sourceId, body: demoEventInput, security: permissions.writer, response: { 200: schema.demoSchema, ...errors } } },
  async req => tel.span('demo.emit', SpanKind.SERVER, async () => {
    await auth.human(req, 'operator', true);
    const adapter = req.params.appId === 'agenda-veterinaria' ? 'AGENDA_URL' : 'LAB_URL';
    const destination = process.env[adapter];
    if (!destination) throw new HttpError(503, 'emitter_unavailable', 'El emisor no está habilitado.');
    const result = await fetch(new URL('/events', destination), {
      method: 'POST', signal: AbortSignal.timeout(7000), redirect: 'error',
      headers: { ...traceHeaders(), 'content-type': 'application/json', authorization: 'Bearer '+required('ADAPTER_KEY') },
      body: JSON.stringify(req.body),
    });
    if (!result.ok) {
      const status = [400,403,409].includes(result.status) ? result.status : 503;
      await result.body?.cancel();
      throw new HttpError(status, 'emitter_error', 'El emisor no pudo registrar el evento. Revisa los datos o repite la acción.');
    }
    return result.json();
  }));

const profileParams = Type.Object({ runId });
app.get(prefix+'/admin/faults/:runId', { schema: { summary: 'Perfil temporal de simulador',
  params: profileParams, security: permissions.human, response: { 200: schema.profileSchema, ...errors } } }, async req => {
  await auth.human(req, 'admin');
  if (!faultsEnabled) throw new HttpError(403, 'faults_disabled', 'Fallos controlados deshabilitados en este entorno.');
  const { rows: [profile] } = await pool.query(`SELECT mode,first_n AS "firstN",address_prefix AS "addressPrefix",
    greatest(1,ceil(extract(epoch FROM expires_at-clock_timestamp())))::int AS "expiresIn"
    FROM fault_profiles WHERE run_id=$1 AND expires_at>clock_timestamp()`, [req.params.runId]);
  return profile ?? { mode: 'healthy', firstN: 0, addressPrefix: null, expiresIn: 0 };
});
app.put(prefix+'/admin/faults/:runId', { schema: { summary: 'Configura fallos temporales aislados por runId',
  params: profileParams, body: faultInput, security: permissions.writer, response: { 204: Type.Null(), ...errors } } },
  async (req, reply) => {
    const operator = await auth.human(req, 'admin', true);
    if (!faultsEnabled) throw new HttpError(403, 'faults_disabled', 'Fallos controlados deshabilitados en este entorno.');
    const { mode, firstN, addressPrefix, expiresIn } = req.body;
    await transaction(pool, async client => {
      if (mode === 'healthy') await client.query('DELETE FROM fault_profiles WHERE run_id=$1', [req.params.runId]);
      else await client.query(`INSERT INTO fault_profiles VALUES($1,$2,$3,$4,clock_timestamp()+make_interval(secs=>$5))
        ON CONFLICT(run_id) DO UPDATE SET mode=excluded.mode,first_n=excluded.first_n,address_prefix=excluded.address_prefix,expires_at=excluded.expires_at`,
        [req.params.runId, mode, mode === 'fail_first_n' ? firstN ?? 2 : 0, addressPrefix ?? null, expiresIn ?? 600]);
      await client.query(`INSERT INTO audit_log(actor,action,details) VALUES($1,'fault_profile',$2)`,
        [operator.id, { runId: req.params.runId, mode, firstN, addressPrefix, expiresIn }]);
    });
    return reply.code(204).send(null);
  });
app.get(prefix+'/admin/receipts/:id', { schema: { summary: 'Recibo persistente e historial HTTP del simulador',
  params: idParams, security: permissions.human, response: { 200: schema.receiptSchema, ...errors } } }, async req => {
  await auth.human(req, 'operator');
  const { rows: [receipt] } = await pool.query(`SELECT d.notification_id,d.calls,d.receipt_id,d.accepted_at,
    (SELECT jsonb_agg(jsonb_build_object('call_no',c.call_no,'mode',c.mode,'result',c.result,'at',c.at) ORDER BY c.call_no)
       FROM simulator_calls c WHERE c.delivery_key=d.delivery_key) AS history
     FROM simulator_deliveries d WHERE d.notification_id=$1`, [req.params.id]);
  if (!receipt) throw new HttpError(404, 'no_provider_record', 'El simulador aún no ha registrado intentos.');
  return receipt;
});
app.get(prefix+'/policy', { schema: { summary: 'Política de idempotencia pública',
  response: { 200: Type.Object({ idempotencyTtlSeconds: Type.Integer() }) } } },
  async () => ({ idempotencyTtlSeconds: idempotencyTtl }));

const port = integerEnv('PORT', 8080, 1024, 65535);
app.addHook('onClose', async () => { await pool.end(); await tel.shutdown(); });
for (const signal of ['SIGTERM','SIGINT']) process.once(signal, () => { void app.close(); });
await app.listen({ host: '0.0.0.0', port });
