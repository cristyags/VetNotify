import { context, propagation, ROOT_CONTEXT, SpanStatusCode, trace, type Span, type SpanKind } from '@opentelemetry/api';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { BatchSpanProcessor, NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import pino from 'pino';
import { environment } from '../contracts/policy.js';

export function telemetry(service: string) {
  const endpoint = process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT;
  const provider = new NodeTracerProvider({
    resource: resourceFromAttributes({
      'service.name': service, 'deployment.environment.name': environment, 'service.version': process.env.REVISION ?? 'local',
    }),
    spanProcessors: endpoint ? [new BatchSpanProcessor(new OTLPTraceExporter({ url: endpoint }),
      { scheduledDelayMillis: 500, maxQueueSize: 2048 })] : [],
  });
  provider.register();
  const tracer = trace.getTracer('vetnotify');
  const logger = pino({ level: process.env.LOG_LEVEL ?? 'info',
    base: { service, environment }, timestamp: pino.stdTimeFunctions.isoTime,
    redact: { paths: ['req.headers', 'headers', 'password', 'token', 'cookie'], remove: true },
  });
  function fields() {
    const active = trace.getSpan(context.active())?.spanContext();
    return { trace_id: active?.traceId, span_id: active?.spanId };
  }
  async function span<T>(name: string, kind: SpanKind, work: (active: Span) => Promise<T>,
    parent?: Record<string, string | undefined>) {
    const ctx = parent ? propagation.extract(ROOT_CONTEXT, parent) : context.active();
    return tracer.startActiveSpan(name, { kind }, ctx, async active => {
      try {
        return await work(active);
      } catch (error) {
        active.setStatus({ code: SpanStatusCode.ERROR });
        throw error;
      } finally {
        active.end();
      }
    });
  }
  return { logger, fields, span, shutdown: () => provider.shutdown() };
}

export function traceHeaders() {
  const headers: Record<string, string> = {};
  propagation.inject(context.active(), headers);
  return headers;
}
