# Observabilidad

## Preguntas y decisiones

| Pregunta | Señal | Decisión |
|---|---|---|
| ¿Qué proporción se entrega a tiempo? | Cohorte inicial de 30 s, interna de 5 s y tamaño de muestra | Investigar cuando se supera el presupuesto de incumplimientos |
| ¿Qué canal o dependencia explica el retraso? | Intentos clasificados, P95 de entrega y traza del simulador | Distinguir espera, reintento, timeout y rechazo permanente |
| ¿Por qué se acumula trabajo? | Pendientes, edad, latidos, CPU y memoria | Recuperar worker, corregir dependencia o ajustar capacidad |

## Indicadores

Para una evaluación UTC en `t`, `W=15 min`. La cohorte toma originales aceptadas en `[t-W-D,t-D)`. Cuenta buenas aquellas con `delivered_at <= accepted_at+D`. Divide buenas entre toda la cohorte madura, incluyendo pendientes vencidos, fallos e incertidumbre. Sin observaciones se muestra «sin datos». El SQL vive en `packages/db/notifications.ts`.

| SLI | Objetivo | Población y presupuesto |
|---|---|---|
| Entrega inicial dentro de 30 s | ≥95% | Ambos canales. `floor(N × 0.05)` incumplimientos |
| Entrega interna dentro de 5 s | ≥99% | Canal interno. `floor(N × 0.01)` |
| Aceptación durable | Observación | Sonda válida por minuto. ID de 202/200 y lectura persistente / todos los intentos de la sonda, incluidas desconexiones |

Un replay es una petición exitosa para el SLI de aceptación. Los SLI de entrega cuentan notificaciones iniciales únicas. Las derivadas se separan por `creation_kind`. El probe usa destinos ficticios, no prueba negativas y pierde sus contadores de proceso al reiniciarse. Las consultas usan `increase` para compensar reinicios observados.

| Métrica | Tipo y unidad | Fuente y propósito |
|---|---|---|
| `vetnotify_accepted_total` | Contador de registros | Creadas en PostgreSQL, por aplicación, canal y tipo |
| `vetnotify_notifications` | Gauge de registros | Estado actual, por canal y tipo |
| `vetnotify_attempts` | Gauge de intentos | Historial por resultado y canal |
| `vetnotify_retries_total` | Contador de transiciones | Reintentos programados y recuperación de lease |
| `vetnotify_duration_seconds` | Histograma en segundos | Duraciones durables, entrega o espera antes del primer intento |
| `vetnotify_oldest_pending_seconds` | Gauge en segundos | Mayor edad de un pendiente por canal |
| `vetnotify_queue_jobs` | Gauge de trabajos | Pendientes y processing |
| `vetnotify_worker_heartbeat_timestamp_seconds` | Gauge, epoch s | Último latido registrado de cada canal |
| `vetnotify_sli_{good,population,budget,target}` | Gauges | Cohortes y metas reproducidas desde PostgreSQL |
| `vetnotify_probe_{started,good,failed}_total` | Contadores de peticiones | Sonda independiente del handler |
| `node_cpu_seconds_total`, `node_memory_MemAvailable_bytes` | CPU-segundos y bytes | Node Exporter, capacidad |
| `vetnotify_api_resident_memory_bytes` | Gauge en bytes | RSS del proceso API |

Prometheus recopila cada 5 s y retiene 3 días o 1 GB. Una réplica API por entorno expone el snapshot global. Con más réplicas, deduplica por ambiente antes de agregar. IDs de notificación, destinatario, traza y corrida se usan únicamente en la investigación, fuera de las etiquetas.

## Trazas, logs y alertas

Los spans de API, worker y proveedor están enlazados mediante W3C Trace Context almacenado en el trabajo. El span HTTP termina con la aceptación. Cada intento tiene su span y permite distinguir espera de ejecución. El muestreo del laboratorio captura 100% y Jaeger Badger retiene 48 h. Consulta `GET /api/v3/traces/{trace_id}` por túnel. Los logs JSON contienen correlación, componente, resultado y, cuando aplica, span e intento. `scripts/incident.mjs` guarda la ventana de inicio y recoge solo los registros de IDs ficticios seleccionados. Si se elimina un Pod, conserva sus logs antes del cambio.

- **VetNotifyDeliveryDegraded**. Más de 20% de fallos finales en 2 min por canal, con al menos 10 resultados y 15 s de persistencia. Una campaña de prueba con rechazos permanentes puede dispararla. Investiga los códigos y el proveedor.
- **VetNotifyWorkStalled**. Pendiente de más de 30 s o último latido de más de 30 s, durante 15 s. Un drenaje planificado o un arranque lento puede causar un disparo. Comprueba Pods y antigüedad por canal.
- Sin resultados no se activa la alerta de proporción. Las alertas se consultan en Prometheus y quedan en evidencia de prueba.

El dashboard se provisiona desde JSON y responde a las tres preguntas con 10 paneles. Para reproducir, arranca observabilidad y consulta `/api/v1/targets` y `/api/v1/rules` en Prometheus. [Jaeger 2.22](https://www.jaegertracing.io/docs/2.22/storage/badger/).
