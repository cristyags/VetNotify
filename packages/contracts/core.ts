import { Type, type Static } from '@sinclair/typebox';
import { createHash } from 'node:crypto';

export const channels = ['email', 'internal'] as const;
export type Channel = typeof channels[number];
export const states = ['accepted', 'pending', 'processing', 'delivered', 'failed'] as const;
export type State = typeof states[number];
export const channelSchema = Type.Unsafe<Channel>({ type: 'string', enum: channels });
export const stateSchema = Type.Unsafe<State>({ type: 'string', enum: states });
export const slug = Type.String({ pattern: '^[a-z][a-z0-9-]{1,63}$' });
export const uuid = Type.String({ format: 'uuid' });
export const runId = Type.String({ pattern: '^[a-zA-Z0-9_-]{1,64}$' });
export const keySchema = Type.String({ pattern: '^[A-Za-z0-9_:.~-]{1,128}$' });
export const emailSchema = Type.String({
  maxLength: 254, format: 'email', pattern: '^[^@]+@[A-Za-z0-9.-]+\\.[tT][eE][sS][tT]$',
});
const businessText = (maxLength: number) => Type.String({ minLength: 1, maxLength, pattern: '\\S' });

export const notificationInput = Type.Object({
  applicationId: Type.Optional(slug),
  recipient: Type.Object({ id: slug, email: Type.Optional(emailSchema) }, { additionalProperties: false }),
  channel: channelSchema,
  subject: businessText(160),
  body: businessText(4000),
  metadata: Type.Optional(Type.Object({
    event: Type.Optional(slug),
    reference: Type.Optional(businessText(96)),
    pet: Type.Optional(businessText(64)),
  }, { additionalProperties: false })),
  runId: Type.Optional(runId),
}, { additionalProperties: false });
export type NotificationInput = Static<typeof notificationInput>;
export const idParams = Type.Object({ id: uuid });
export const pagination = { limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100 })),
  offset: Type.Optional(Type.Integer({ minimum: 0, maximum: 100000 })) };
export const filters = {
  channel: Type.Optional(channelSchema), state: Type.Optional(stateSchema), app: Type.Optional(slug),
  runId: Type.Optional(runId), kind: Type.Optional(Type.Union([Type.Literal('initial'), Type.Literal('manual_reprocess')])),
  from: Type.Optional(Type.String({ format: 'date-time' })), to: Type.Optional(Type.String({ format: 'date-time' })),
  q: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
};
export const reprocessBody = Type.Object({ reason: businessText(240) }, { additionalProperties: false });
export const loginBody = Type.Object({
  username: slug, password: Type.String({ minLength: 1, maxLength: 256 }),
}, { additionalProperties: false });
export const errorSchema = Type.Object({ code: Type.String(), message: Type.String() });
export const acceptanceSchema = Type.Object({
  id: uuid, state: stateSchema, replay: Type.Boolean(), correlationId: uuid,
  parentId: Type.Union([uuid, Type.Null()]), rootId: uuid,
});

export class HttpError extends Error {
  constructor(readonly statusCode: number, readonly code: string, message: string) {
    super(message);
  }
}

export const hash = (value: string) => createHash('sha256').update(value).digest('hex');

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left < right ? -1 : left === right ? 0 : 1)
      .map(([key, item]) => [key, canonical(item)]));
  }
  return value;
}

export function fingerprint(value: unknown) {
  return hash(JSON.stringify(canonical(value)));
}

export const modes = ['healthy', 'fail_first_n', 'always_503', 'timeout', 'permanent_rejection', 'accepted_then_timeout'] as const;
export type FaultMode = typeof modes[number];
export const faultInput = Type.Object({
  mode: Type.Unsafe<FaultMode>({ type: 'string', enum: modes }),
  firstN: Type.Optional(Type.Integer({ minimum: 1, maximum: 3 })),
  addressPrefix: Type.Optional(Type.String({ pattern: '^[a-z0-9_-]{1,32}$' })),
  expiresIn: Type.Optional(Type.Integer({ minimum: 1, maximum: 7200 })),
}, { additionalProperties: false });
export const eventNames = {
  'agenda-veterinaria': ['cita-confirmada', 'cita-reprogramada', 'cita-cancelada'],
  'laboratorio-veterinario': ['muestra-recibida', 'resultado-disponible'],
} as const;
export type ClientName = keyof typeof eventNames;
export const demoEventInput = Type.Object({
  event: Type.String({ minLength: 1, maxLength: 40 }),
  recipientId: Type.Union([Type.Literal('luna'), Type.Literal('max')]),
  channels: Type.Array(channelSchema, { minItems: 1, maxItems: 2, uniqueItems: true }),
  requestId: keySchema,
  runId: Type.Optional(runId),
  email: Type.Optional(emailSchema),
}, { additionalProperties: false });
export type DemoEvent = Static<typeof demoEventInput>;
