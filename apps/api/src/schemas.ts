import { Type } from '@sinclair/typebox';
import { acceptanceSchema, channelSchema, errorSchema, slug, stateSchema, uuid } from '../../../packages/contracts/core.js';

const date = Type.String({ format: 'date-time' });
const nullable = <T extends ReturnType<typeof Type.String> | ReturnType<typeof Type.Number>>(schema: T) => Type.Union([schema, Type.Null()]);
const count = Type.Integer({ minimum: 0 });
export const identitySchema = Type.Object({
  id: slug, name: Type.String(), role: Type.String({ enum: ['admin','operator','recipient'] }),
  recipientId: nullable(slug), csrfToken: Type.String(),
});
export const summary = Type.Object({
  id: uuid, application_id: slug, channel: channelSchema, recipient_id: slug, recipient_name: Type.String(),
  pet_name: Type.String(), subject: Type.String(), state: stateSchema, creation_kind: Type.String(),
  accepted_at: date, updated_at: date, delivered_at: nullable(date), correlation_id: uuid,
  parent_notification_id: nullable(uuid), root_notification_id: uuid,
  attempt_count: count, max_attempts: count, next_attempt_at: nullable(date),
});
export const detailSchema = Type.Object({
  ...summary.properties, body: Type.String(), recipient_email: nullable(Type.String()),
  metadata: Type.Record(Type.String(),Type.String()), run_id: nullable(Type.String()), trace_id: nullable(Type.String()),
  chain: Type.Array(Type.Object({ id: uuid, state: stateSchema, parent_notification_id: nullable(uuid) })),
  reprocess: Type.Union([Type.Null(), Type.Object({ actor: slug, at: date, reason: Type.String() })]),
});
export const attemptSchema = Type.Object({
  id: uuid, number: count, worker_id: Type.String(), started_at: date, finished_at: nullable(date),
  duration_ms: nullable(Type.Number()), outcome: Type.String(), code: nullable(Type.String()),
  receipt_id: nullable(uuid), trace_id: nullable(Type.String()), span_id: nullable(Type.String()),
});
export const transitionSchema = Type.Object({
  from_state: Type.Union([stateSchema, Type.Null()]), to_state: stateSchema, at: date,
  reason: Type.String(), actor: Type.String(), correlation_id: uuid,
});
export const inboxSchema = Type.Object({
  id: uuid, application_id: slug, subject: Type.String(), body: Type.String(), available_at: date, read_at: nullable(date),
});
export const paged = (item: Parameters<typeof Type.Array>[0]) =>
  Type.Object({ items: Type.Array(item), total: count, limit: count, offset: count });
export const statsSchema = Type.Object({
  total: count, asOf: date, unit: Type.Literal('notifications'),
  window: Type.Object({ from: nullable(date), to: nullable(date) }),
  groups: Type.Array(Type.Object({ channel: channelSchema, state: stateSchema, creation_kind: Type.String(),
    count, rate: nullable(Type.Number()), average_delivery_seconds: nullable(Type.Number()) })),
});
export const cohortSchema = Type.Array(Type.Object({
  sli: Type.String(), deadline: Type.Number(), target: Type.Number(),
  channel: nullable(Type.String()), as_of: date, group_channel: nullable(Type.String()), application_id: nullable(slug),
  population: count, good: count, bad: count, ratio: nullable(Type.Number()), error_budget: count,
}));
export const profileSchema = Type.Object({ mode: Type.String(), firstN: count,
  addressPrefix: nullable(Type.String()), expiresIn: count });
export const receiptSchema = Type.Object({
  notification_id: uuid, calls: count, receipt_id: nullable(uuid), accepted_at: nullable(date),
  history: Type.Array(Type.Object({ call_no: count, mode: Type.String(), result: Type.String(), at: date })),
});
export const appSchema = Type.Array(Type.Object({ id: slug, name: Type.String(), enabled: Type.Boolean() }));
export const versionSchema = Type.Object({
  name: Type.String(), version: Type.String(), commit: Type.String(), image: Type.String(), environment: Type.String(),
});
export const demoSchema = Type.Object({ application: slug, notifications: Type.Array(acceptanceSchema) });
export const commonErrors = { 400: errorSchema, 401: errorSchema, 403: errorSchema, 404: errorSchema,
  409: errorSchema, 429: errorSchema, 503: errorSchema };
export const security: Record<'human' | 'writer' | 'machine' | 'reader', Record<string, string[]>[]> = {
  human: [{ humanSession: [] }], writer: [{ humanSession: [], csrfToken: [] }],
  machine: [{ applicationKey: [] }], reader: [{ humanSession: [] }, { applicationKey: [] }],
};
