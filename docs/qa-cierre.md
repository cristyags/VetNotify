# Auditoría y QA de VetNotify

El alcance académico es el Escenario 1 de notificaciones multicanal. Contrasté los 37 requisitos COM, DEV, MET y ESC1 con las condiciones comunes, P1-1 a P1-5 y el Anexo II. La matriz conserva la fuente, la implementación y la evidencia de cada requisito. [Guía de cátedra](<spec/Proyecto de Cátedra.pdf>) · [Prompt maestro](spec/VetNotify_Prompt_Maestro_Codex.md) · [Matriz](requirements-matrix.md).

## Decisiones y cómo comprobarlas

| Qué se implementó | Cómo y por qué | Cómo se comprueba |
|---|---|---|
| Agenda y Laboratorio | Los dos emisores ejecutan procesos distintos con credenciales y eventos propios. El servidor asigna el origen por la credencial para que el cliente no pueda declararse como la otra aplicación. | [Contrato y clientes](api.md) · [Guion API](demo-api.md) |
| Aceptación durable | PostgreSQL guarda la notificación y su trabajo en una transacción. La respuesta 202 indica que el trabajo se conservó. El estado terminal se consulta después. | [Secuencia](diagrams/aceptacion.svg) · [Persistencia](data-and-states.md) |
| Idempotencia bajo concurrencia | La clave se acota a aplicación y canal. La huella del contenido decide entre replay y 409. La vigencia se controla en la base. | [Contrato](api.md) · [Pruebas de concurrencia](../tests/acceptance/scenarios.mjs) |
| Aislamiento y recuperación | Los workers de correo y bandeja reclaman trabajos por canal. Un lease expira tras la caída y el token impide que el proceso anterior sobrescriba el resultado. Los intentos persistidos conservan el tope de tres. | [Cola](../apps/worker/src/queue.ts) · [Guion de recuperación](demo-api.md) |
| Simulación y reproceso | El simulador conserva recibos idempotentes y permite degradaciones repetibles. Reprocesar crea una derivada autorizada con auditoría y enlace al original. | [Simulador](../apps/email-simulator/src/index.ts) · [Secuencia de reproceso](diagrams/reproceso.svg) |
| Web separable | React consume la misma API que los clientes de consola. El guion detiene web y adaptadores, ejecuta la aceptación y restituye las réplicas. | [Arquitectura](architecture.md) · [Guiones de consola y web](demo-api.md) |
| Infraestructura y promoción | Terraform conserva el estado en Azure Storage. K3s separa dev y prod por namespace, base, secretos y gateway. GitHub vincula la aprobación a los digests antes de que el operador cambie el destino público. | [Infraestructura](infrastructure.md) · [Entrega](ci-cd.md) |
| Indicadores y trazas | Las cohortes maduras incluyen pendientes vencidos y fallos. Los agregados usan dimensiones acotadas, y la investigación de un caso usa la correlación en logs y trazas. | [SLI, SLO y alertas](observability.md) · [Incidente](incident-report.md) |

## Fallos observados y correcciones

La primera ejecución autenticada de Terraform falló en Azure Login con `AADSTS700213`. La credencial federada se había configurado con el nombre del repositorio y GitHub emitió un sujeto con identificadores inmutables. Verifiqué los IDs por API, preparé un plan que actualizaba solo `azurerm_federated_identity_credential.plan` y apliqué ese plan sobre el código revisado. Conservé el emisor, la audiencia y la restricción a `main`. Con la entrada privada sincronizada, Actions pudo leer y bloquear el estado remoto y devolvió `changes: []`. [Fallo original](https://github.com/cristyags/VetNotify/actions/runs/42558821475) · [Plan autenticado](https://github.com/cristyags/VetNotify/actions/runs/42560565344) · [Formato OIDC de GitHub](https://docs.github.com/en/actions/reference/security/oidc) · [Coincidencia en Entra](https://learn.microsoft.com/en-us/entra/workload-id/workload-identity-federation).

Tras encender la VM, la sonda de arranque de Grafana registró conexiones rechazadas y el Pod acumuló tres reinicios. Reinicié el Deployment de Grafana y comprobé que el Pod nuevo quedara `Ready` sin reinicios. El PVC se conservó. La evidencia confirma la recuperación del servicio y sirve para distinguir el síntoma observado de la causa interna, que no quedó aislada. [Operación y recuperación](operations.md).

La revisión de los guiones detectó que un namespace de validación podía acompañar a una URL que sirviera producción. Incorporé una comprobación de `/api/v1/version` antes del login y las mutaciones de prueba. La regresión apuntó cuatro comandos a una API de prueba que devolvía `prod` y verificó que sus únicas peticiones fueran lecturas de versión. La demo sana de consola sigue disponible mediante `--smoke`. [Evidencia de la guarda](evidence/qa-main/guard-qa.json).

## Resultados del candidato e1132db

| Comprobación | Resultado observado | Evidencia |
|---|---|---|
| Cadena de entrega | Jechev1 aprobó el commit del PR #1. GitHub lo integró, CI pasó y el workflow publicó ambos OCI de `main`. | [Entrega y digests](evidence/qa-main/entrega.json) |
| P1-1 a P1-5 | 100 notificaciones y 100 trabajos, 95 entregas y 5 fallos permanentes esperados. Se observaron 50 efectos internos y 45 recibos de correo. Pasaron idempotencia concurrente, recuperación y correlación. | [Aceptación en Azure](evidence/qa-main/aceptacion-mw8r2bq4-51ea7b58.md) |
| Web detenida | Web, Agenda HTTP y Laboratorio HTTP quedaron a cero durante la prueba. La API conservó el digest y los CLI enviaron por ambos canales. Las réplicas se restauraron al terminar. | [Sin frontend](evidence/qa-main/sin-web-mw8r1rcr-9e94605d.md) · [Dos clientes](evidence/qa-main/demo-cli-mw8r22dc-881945bd.md) |
| Navegador | Chrome ejecutó ambos emisores, degradación, reproceso, acceso y bandeja a 360 px. | [Chrome y capturas](evidence/ui-azure-main.json) |
| Rollback y salud | Kubernetes detectó la imagen inválida, restauró el digest anterior, conservó la entrega previa y completó una nueva. El ensayo de liveness reinició el worker y restauró su probe. | [Rollback](evidence/qa-main/rollback-mw8r97ia-49728e73.md) · [K3s y RBAC](evidence/qa-main/k3s-mw8rahpp-ceb9b6f9.md) |
| Señales | Diez paneles, tres targets sanos y una traza del incidente consultable tras reiniciar Jaeger. La alerta pasó de `firing` a normal. | [Observabilidad](evidence/qa-main/senales-mw8r9iyy-83033550.md) |
| Seguridad de entrega | El escaneo de secretos de ambos OCI devolvió cero hallazgos. Verifiqué tres archivos del bundle publicado contra las variables sensibles de dev y prod. Retiré el servicio SQL temporal. | [Escaneo OCI](evidence/qa-main/oci-secrets.json) · [Retirada del servicio](evidence/qa-main/sql-temporal.json) |

El ensayo de promoción con el PR #2 abierto validó los digests y falló al comprobar que el PR estuviera integrado en `main`. Actions terminó sin emitir el artefacto de autorización. El PR fija el candidato ya probado y requiere su propia aprobación. [Evidencia del rechazo](evidence/qa-main/promocion-control.json) · [PR de promoción](https://github.com/cristyags/VetNotify/pull/2) · [Estado](STATUS.md).

## Límites que importan en la defensa

- El correo corresponde al simulador del escenario. Los recibos comprueban aceptación y deduplicación en ese proveedor de prueba. [Estados y garantías](data-and-states.md).
- Los namespaces separan credenciales, datos y fallas controladas. Ambos dependen del mismo nodo y la disponibilidad termina cuando Azure desasigna la VM. [Arquitectura](architecture.md) · [Operación](operations.md).
- Los ensayos con degradación, caída de PostgreSQL e imagen inválida corresponden a validación. Las comprobaciones de producción usan entregas sanas y verifican el rechazo de los controles de fallo. [Seguridad](security.md).
- La consulta `ActualCost` de los grupos del proyecto respondió sin filas atribuibles. Las tarifas, el presupuesto y el estado de Azure son evidencia del control de gasto. La cifra de US$9.61 es un estimado del escenario documentado. [Costos](costs.md).
- El equipo debe completar los nombres, carnets y horario reales para la defensa. [Preparación de la defensa](defense-guide.md).
