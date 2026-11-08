import { parseArgs } from 'node:util';
import { randomUUID } from 'node:crypto';
import Fastify from 'fastify';
import { type TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { SpanKind } from '@opentelemetry/api';
import { channels, demoEventInput, eventNames, HttpError, type Channel, type ClientName, type DemoEvent, type NotificationInput } from '../contracts/core.js';
import { required } from '../contracts/policy.js';
import { secureEqual } from '../db/password.js';
import { telemetry, traceHeaders } from '../telemetry/index.js';

const copy: Record<string, [string,string]> = {
  'cita-confirmada': ['Cita confirmada', 'La cita de {pet} fue confirmada. Consulta el horario registrado en Agenda Veterinaria.'],
  'cita-reprogramada': ['Cita reprogramada', 'La cita de {pet} tiene un horario nuevo. Consulta el cambio en Agenda Veterinaria.'],
  'cita-cancelada': ['Cita cancelada', 'La cita de {pet} fue cancelada. Puedes consultar el historial en Agenda Veterinaria.'],
  'muestra-recibida': ['Muestra recibida', 'El Laboratorio Veterinario recibió la muestra de {pet}.'],
  'resultado-disponible': ['Resultado disponible', 'El resultado ficticio del servicio de laboratorio de {pet} está disponible.'],
};

export async function requestNotification(base: string, token: string, data: NotificationInput, key?: string) {
  const response = await fetch(new URL('/api/v1/notifications', base), {
    method: 'POST', redirect: 'error', signal: AbortSignal.timeout(6000),
    headers: { ...traceHeaders(), 'content-type': 'application/json', authorization: 'Bearer '+token,
      ...(key ? { 'idempotency-key': key } : {}) },
    body: JSON.stringify(data),
  });
  const json = await response.json();
  return { status: response.status, location: response.headers.get('location'), data: json };
}

export function client(application: ClientName, keyEnv: string) {
  const token = required(keyEnv);
  const url = process.env.API_URL ?? 'http://localhost:18080';
  async function emit(event: DemoEvent) {
    if (!(eventNames[application] as readonly string[]).includes(event.event)) {
      throw new HttpError(400, 'invalid_event', 'El evento no corresponde a este emisor.');
    }
    const [subject, body] = copy[event.event];
    const pet = event.recipientId === 'luna' ? 'Luna' : 'Max';
    const notifications = [];
    for (const channel of event.channels) {
      const result = await requestNotification(url, token, {
        applicationId: application,
        recipient: { id: event.recipientId, ...(channel === 'email' && event.email ? { email: event.email } : {}) },
        channel, subject: subject+' · '+pet, body: body.replace('{pet}', pet),
        metadata: { event: event.event, pet }, runId: event.runId,
      }, event.requestId);
      if (result.status !== 202 && result.status !== 200) {
        throw new HttpError(result.status, 'upstream_'+result.status, 'VetNotify rechazó el envío.');
      }
      notifications.push(result.data);
    }
    return { application, notifications };
  }
  return { emit };
}

export async function runClient(application: ClientName, keyEnv: string) {
  const emitter = client(application, keyEnv);
  if (process.argv[2] !== 'serve') {
    const { values } = parseArgs({ args: process.argv.slice(2), options: {
      event: { type: 'string' }, recipient: { type: 'string', default: 'luna' },
      channel: { type: 'string', default: 'both' }, key: { type: 'string' },
      run: { type: 'string' }, email: { type: 'string' },
    } });
    const selected = values.channel === 'both' ? [...channels] : [values.channel as Channel];
    if (!selected.every(item => channels.includes(item)) || !['luna','max'].includes(values.recipient)) {
      throw new Error('Usa --recipient luna|max y --channel email|internal|both');
    }
    const result = await emitter.emit({
      event: values.event ?? eventNames[application][0], recipientId: values.recipient as DemoEvent['recipientId'],
      channels: selected, requestId: values.key ?? randomUUID(), runId: values.run, email: values.email,
    });
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  const adapter = required('ADAPTER_KEY');
  const tel = telemetry(application);
  const app = Fastify({ loggerInstance: tel.logger, disableRequestLogging: true, bodyLimit: 4096 }).withTypeProvider<TypeBoxTypeProvider>();
  app.get('/health/live', async () => ({ status: 'live' }));
  app.get('/health/ready', async () => ({ status: 'ready' }));
  app.post('/events', { schema: { body: demoEventInput } }, async (req, reply) => {
    if (!secureEqual(req.headers.authorization, 'Bearer '+adapter)) return reply.code(401).send({ code: 'unauthorized' });
    return tel.span('emitter.send', SpanKind.SERVER, async () => {
      try { return await emitter.emit(req.body); }
      catch (error) {
        const status = error instanceof HttpError ? error.statusCode : 503;
        tel.logger.warn({ operation: 'emitter_request', result: status, ...tel.fields() });
        return reply.code(status).send({ code: 'emitter_error' });
      }
    }, { traceparent: req.headers.traceparent?.toString(), tracestate: req.headers.tracestate?.toString() });
  });
  app.addHook('onClose', async () => { await tel.shutdown(); });
  for (const signal of ['SIGINT','SIGTERM']) process.once(signal, () => { void app.close(); });
  await app.listen({ host: '0.0.0.0', port: 8080 });
}
