# Arquitectura de VetNotify

## Componentes y recorrido

El gateway enruta `/api/` y `/health/` a Fastify. Sirve el frontend a través de un upstream separado. Los comandos de Agenda y Laboratorio llaman a la misma API. Las acciones del navegador pasan primero por una sesión humana y luego por el adaptador HTTP de la aplicación correspondiente. El origen definitivo se resuelve por hash de credencial en PostgreSQL.

La API inserta la notificación, el trabajo y la secuencia accepted/pending en una transacción. Cada canal tiene su propio proceso worker. Ambos reclaman trabajos en PostgreSQL. La entrega interna se confirma junto con el insert de bandeja. El worker de correo habla con un simulador HTTP interno que persiste el recibo y puede aplicar fallos autorizados por corrida.

| Componente | Fuente | Responsabilidad |
|---|---|---|
| API Fastify | `apps/api/src` | Acceso, contrato, aceptación y consulta |
| Agenda y Laboratorio | `clients/*` | Construcción de eventos sintéticos, consola y adaptador propio |
| Worker por canal | `apps/worker/src` | Reclamo con lease, intento, clasificación y resultado |
| PostgreSQL | `packages/db/migrations` | Fuente de verdad y cola durable |
| Simulador | `apps/email-simulator` | Resultado HTTP verificable y deduplicación del efecto de prueba |
| React | `apps/web` | Operación, detalle, emisores y bandeja |
| Observabilidad | `infra/observability` | OTLP, TSDB, alertas y dashboard |

En Azure, Caddy termina TLS y pasa al gateway de K3s. El FQDN público sirve `vetnotify-prod` después de la promoción aprobada. Validación y producción tienen namespaces, bases de datos, PVC y secretos separados. Usa `vetnotify-dev` o Compose para las pruebas controladas. Las interfaces técnicas se consultan con port-forward autorizado. [Estado efectivo](STATUS.md) · [Verificación pública](evidence/qa-main/public-prod.json).

Diagramas y fuentes editables en [diagramas](diagrams/). Las decisiones y alternativas se registran en [ADR](adr/decisiones.md).
