import { randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { fingerprint, HttpError, type Channel, type NotificationInput, type State } from '../contracts/core.js';
import { idempotencyTtl, maxAttempts } from '../contracts/policy.js';
import { traceHeaders } from '../telemetry/index.js';
import type { Static } from '@sinclair/typebox';
import { Type } from '@sinclair/typebox';
import { filters, pagination } from '../contracts/core.js';

export interface Notification {
  id: string;
  application_id: string;
  recipient_id: string;
  recipient_email: string | null;
  channel: Channel;
  subject: string;
  body: string;
  metadata: NonNullable<NotificationInput['metadata']>;
  run_id: string | null;
  accepted_at: Date;
  updated_at: Date;
  delivered_at: Date | null;
  state: State;
  correlation_id: string;
  traceparent: string | null;
  tracestate: string | null;
  creation_kind: 'initial' | 'manual_reprocess';
  parent_notification_id: string | null;
  root_notification_id: string;
}

export async function transition(client: PoolClient, n: Pick<Notification, 'id' | 'correlation_id'>,
  from: State | null, to: State, reason: string, actor: string) {
  await client.query(`INSERT INTO transitions(notification_id,from_state,to_state,reason,actor,correlation_id)
    VALUES($1,$2,$3,$4,$5,$6)`, [n.id, from, to, reason, actor, n.correlation_id]);
  if (from) await client.query(`UPDATE notifications SET state=$2::notification_state,updated_at=clock_timestamp(),
    delivered_at=CASE WHEN $2::notification_state='delivered' THEN clock_timestamp() ELSE delivered_at END WHERE id=$1`, [n.id, to]);
}

type Effective = {
  application: string;
  recipient: string;
  email: string | null;
  channel: Channel;
  subject: string;
  body: string;
  metadata: Notification['metadata'];
  runId: string | null;
};

async function create(client: PoolClient, effective: Effective, actor: string, parent?: Notification) {
  const id = randomUUID();
  const carrier = traceHeaders();
  const { rows: [n] } = await client.query<Notification>(`INSERT INTO notifications
    (id,application_id,recipient_id,recipient_email,channel,subject,body,metadata,run_id,state,correlation_id,
      traceparent,tracestate,creation_kind,parent_notification_id,root_notification_id)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'accepted',$10,$11,$12,$13,$14,$15) RETURNING *`, [
    id, effective.application, effective.recipient, effective.email, effective.channel,
    effective.subject, effective.body, effective.metadata, effective.runId, randomUUID(),
    carrier.traceparent ?? null, carrier.tracestate ?? null,
    parent ? 'manual_reprocess' : 'initial', parent?.id ?? null, parent?.root_notification_id ?? id,
  ]);
  await client.query(`INSERT INTO jobs(notification_id,channel,state,max_attempts) VALUES($1,$2,'pending',$3)`,
    [id, n.channel, maxAttempts]);
  await transition(client, n, null, 'accepted', parent ? 'manual_reprocess_accepted' : 'durable_acceptance', actor);
  await transition(client, n, 'accepted', 'pending', 'job_queued', 'api');
  return { ...n, state: 'pending' as const };
}

function acceptance(n: Notification, replay: boolean) {
  return {
    id: n.id, state: n.state, replay, correlationId: n.correlation_id,
    parentId: n.parent_notification_id, rootId: n.root_notification_id,
  };
}

export async function accept(client: PoolClient, application: string, input: NotificationInput, key?: string) {
  if (input.applicationId && input.applicationId !== application) {
    throw new HttpError(403, 'origin_mismatch', 'La identidad del emisor no coincide con la credencial.');
  }
  if (input.channel === 'internal' && input.recipient.email) {
    throw new HttpError(400, 'internal_address', 'El canal interno requiere únicamente el ID del destinatario.');
  }
  const { rows: [recipient] } = await client.query<{ email: string }>('SELECT email FROM recipients WHERE id=$1', [input.recipient.id]);
  if (!recipient) throw new HttpError(400, 'unknown_recipient', 'El destinatario no está registrado.');
  const data: Effective = {
    application, recipient: input.recipient.id,
    email: input.channel === 'email' ? (input.recipient.email ?? recipient.email).toLowerCase() : null,
    channel: input.channel, subject: input.subject.trim(), body: input.body.trim(),
    metadata: Object.fromEntries(Object.entries(input.metadata ?? {}).map(([field, value]) => [field, value.trim()])),
    runId: input.runId ?? null,
  };
  if (!key) return acceptance(await create(client, data, application), false);
  // Serialization also covers a key that does not have a row yet. The PK enforces scope.
  const scope = [application, data.channel, key];
  await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 24601))', [JSON.stringify(scope)]);
  const digest = fingerprint([data.recipient, data.email, data.subject, data.body, data.metadata]);
  const { rows: [prior] } = await client.query<Notification & { active: boolean; fingerprint: string }>(
    `SELECT n.*, i.fingerprint, (i.expires_at > clock_timestamp() OR n.state IN ('pending','processing')) AS active
     FROM idempotency i JOIN notifications n ON n.id=i.notification_id
     WHERE i.application_id=$1 AND i.channel=$2 AND i.key=$3`, scope);
  if (prior?.active) {
    if (prior.fingerprint !== digest) throw new HttpError(409, 'idempotency_conflict', 'La clave ya identifica otro contenido.');
    return acceptance(prior, true);
  }
  const n = await create(client, data, application);
  await client.query(`INSERT INTO idempotency(application_id,channel,key,fingerprint,notification_id,expires_at)
    VALUES($1,$2,$3,$4,$5,(SELECT accepted_at FROM notifications WHERE id=$5) + ($6::int * interval '1 second'))
    ON CONFLICT(application_id,channel,key) DO UPDATE
      SET fingerprint=excluded.fingerprint, notification_id=excluded.notification_id, expires_at=excluded.expires_at`,
    [...scope, digest, n.id, idempotencyTtl]);
  return acceptance(n, false);
}

export async function reprocess(client: PoolClient, sourceId: string, operator: string, key: string, reason: string) {
  const { rows: [source] } = await client.query<Notification>('SELECT * FROM notifications WHERE id=$1 FOR UPDATE', [sourceId]);
  if (!source) throw new HttpError(404, 'not_found', 'La notificación no existe.');
  const { rows: [previous] } = await client.query<{ operator_id: string; key: string; fingerprint: string; derived_id: string }>(
    'SELECT * FROM reprocess_commands WHERE source_id=$1', [sourceId]);
  const digest = fingerprint({ reason: reason.trim() });
  if (previous?.operator_id === operator && previous.key === key) {
    if (previous.fingerprint !== digest) throw new HttpError(409, 'idempotency_conflict', 'La clave ya identifica otro motivo.');
    const { rows: [derived] } = await client.query<Notification>('SELECT * FROM notifications WHERE id=$1', [previous.derived_id]);
    return acceptance(derived, true);
  }
  if (previous || source.state !== 'failed') {
    throw new HttpError(409, 'not_reprocessable', 'Solo se puede reprocesar el último fallo de la cadena.');
  }
  const n = await create(client, {
    application: source.application_id, recipient: source.recipient_id, email: source.recipient_email, channel: source.channel,
    subject: source.subject, body: source.body, metadata: source.metadata, runId: source.run_id,
  }, operator, source);
  await client.query(`INSERT INTO reprocess_commands VALUES($1,$2,$3,$4,$5)`, [operator, sourceId, key, digest, n.id]);
  await client.query(`INSERT INTO audit_log(actor,action,details) VALUES($1,'manual_reprocess',$2)`,
    [operator, { sourceId, derivedId: n.id, reason: reason.trim() }]);
  return acceptance(n, false);
}

export const listQuery = Type.Object({ ...filters, ...pagination }, { additionalProperties: false });
export type Filters = Static<typeof listQuery>;

export function filterSql(filters: Filters, application?: string) {
  const values: (string | number)[] = [];
  const conditions: string[] = [];
  const add = (expression: string, value: string) => {
    values.push(value);
    conditions.push(expression.replaceAll('?', '$' + values.length));
  };
  if (application) add('n.application_id=?', application);
  if (filters.app) add('n.application_id=?', filters.app);
  if (filters.channel) add('n.channel=?', filters.channel);
  if (filters.state) add('n.state=?', filters.state);
  if (filters.runId) add('n.run_id=?', filters.runId);
  if (filters.kind) add('n.creation_kind=?', filters.kind);
  if (filters.from) add('n.accepted_at>=?', filters.from);
  if (filters.to) add('n.accepted_at<?', filters.to);
  if (filters.from && filters.to && Date.parse(filters.from) >= Date.parse(filters.to)) {
    throw new HttpError(400, 'invalid_range', 'La fecha inicial debe preceder al final del intervalo.');
  }
  if (filters.q) add(`(strpos(lower(n.subject),lower(?))>0 OR strpos(n.id::text,lower(?))>0
    OR strpos(lower(r.display_name),lower(?))>0)`, filters.q.trim());
  return { where: conditions.length ? 'WHERE ' + conditions.join(' AND ') : '', values };
}

const summaryColumns = `n.id,n.application_id,n.channel,n.recipient_id,r.display_name AS recipient_name,r.pet_name,
 n.subject,n.state,n.creation_kind,n.accepted_at,n.updated_at,n.delivered_at,n.correlation_id,
 n.parent_notification_id,n.root_notification_id,j.attempt_count,j.max_attempts,
 CASE WHEN j.state='pending' THEN j.next_attempt_at END AS next_attempt_at`;

export async function list(pool: Pool, filters: Filters, application?: string) {
  const { where, values } = filterSql(filters, application);
  const limit = filters.limit ?? 25;
  const offset = filters.offset ?? 0;
  const from = `FROM notifications n JOIN recipients r ON r.id=n.recipient_id ${where}`;
  const { rows: [result] } = await pool.query(`WITH page AS (
    SELECT ${summaryColumns} FROM notifications n JOIN recipients r ON r.id=n.recipient_id
      JOIN jobs j ON j.notification_id=n.id ${where}
      ORDER BY n.accepted_at DESC,n.id DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    ) SELECT (SELECT count(*)::int ${from}) AS total,
      COALESCE((SELECT jsonb_agg(page ORDER BY accepted_at DESC,id DESC) FROM page),'[]') AS items`,
    [...values, limit, offset]);
  return { ...result, limit, offset };
}

export async function detail(pool: Pool, id: string, application?: string) {
  const { rows: [n] } = await pool.query(`SELECT ${summaryColumns}, n.body,n.recipient_email,n.metadata,n.run_id,
    CASE WHEN n.traceparent IS NOT NULL THEN split_part(n.traceparent,'-',2) END AS trace_id,
    (SELECT jsonb_agg(jsonb_build_object('id',c.id,'state',c.state,'parent_notification_id',c.parent_notification_id)
                      ORDER BY c.accepted_at,c.id)
       FROM notifications c WHERE c.root_notification_id=n.root_notification_id) AS chain,
    (SELECT jsonb_build_object('actor',a.actor,'at',a.at,'reason',a.details->>'reason')
       FROM audit_log a WHERE a.action='manual_reprocess' AND a.details->>'derivedId'=n.id::text LIMIT 1) AS reprocess
    FROM notifications n JOIN recipients r ON r.id=n.recipient_id JOIN jobs j ON j.notification_id=n.id
    WHERE n.id=$1 AND ($2::text IS NULL OR n.application_id=$2)`, [id, application ?? null]);
  if (!n) throw new HttpError(404, 'not_found', 'La notificación no existe.');
  return n;
}

export async function statistics(pool: Pool, filters: Filters, application?: string) {
  const { where, values } = filterSql(filters, application);
  const { rows } = await pool.query(`SELECT n.channel,n.state,n.creation_kind,count(*)::int AS count,
    round(avg(extract(epoch FROM (n.delivered_at-n.accepted_at)))::numeric,3)::float8 AS average_delivery_seconds
    FROM notifications n JOIN recipients r ON r.id=n.recipient_id ${where}
    GROUP BY n.channel,n.state,n.creation_kind ORDER BY n.channel,n.state,n.creation_kind`, values);
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  const byChannel = Object.fromEntries(['email','internal'].map(channel => {
    const population = rows.filter(row => row.channel === channel).reduce((sum, row) => sum + row.count, 0);
    return [channel, population];
  }));
  return { total, groups: rows.map(row => ({
    ...row, rate: byChannel[row.channel] ? row.count / byChannel[row.channel] : null,
  })), asOf: new Date().toISOString(), unit: 'notifications' as const, window: { from: filters.from ?? null, to: filters.to ?? null } };
}

export async function cohorts(pool: Pool, at?: string) {
  const { rows } = await pool.query(`WITH policies(sli,deadline,target,channel) AS (
      VALUES ('initial_30s',30,0.95,NULL::delivery_channel),('internal_5s',5,0.99,'internal'::delivery_channel)
    ), clock AS (SELECT COALESCE($1::timestamptz,statement_timestamp()) AS t)
    SELECT p.sli,p.deadline,p.target::float8,p.channel,clock.t AS as_of,
      n.channel AS group_channel,n.application_id,
      count(n.id)::int AS population,
      count(n.id) FILTER(WHERE n.delivered_at <= n.accepted_at+make_interval(secs=>p.deadline))::int AS good
    FROM policies p CROSS JOIN clock LEFT JOIN notifications n ON n.creation_kind='initial'
      AND (p.channel IS NULL OR n.channel=p.channel)
      AND n.accepted_at>=clock.t-interval '15 minutes'-make_interval(secs=>p.deadline)
      AND n.accepted_at<clock.t-make_interval(secs=>p.deadline)
    GROUP BY p.sli,p.deadline,p.target,p.channel,clock.t,
      GROUPING SETS ((),(n.channel,n.application_id))
    HAVING GROUPING(n.channel)=1 OR count(n.id)>0
    ORDER BY p.sli,n.channel NULLS FIRST,n.application_id`, [at ?? null]);
  return rows.map(row => ({
    ...row, ratio: row.population ? row.good / row.population : null,
    error_budget: Math.floor(row.population * (row.deadline === 30 ? 5 : 1) / 100),
    bad: row.population - row.good,
  }));
}
