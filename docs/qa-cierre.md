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

Al reactivar Azure para producción, dos arranques devolvieron `ZonalAllocationFailed` con `Standard_B2as_v2`. El primer apply del cambio de tamaño se detuvo en `PowerOff`. Una desasignación explícita restauró un estado sano. Regeneré el plan, confirmé que cambiaba solo el tamaño y lo apliqué. La VM arrancó como `Standard_D2s_v4` con el disco, la red, la IP y la zona originales. El plan autenticado posterior devolvió cero cambios. [Secuencia y planes](evidence/qa-main/azure-start-recovery.json) · [Plan final de Actions](https://github.com/cristyags/VetNotify/actions/runs/42681725794).

La revisión de los guiones detectó que un namespace de validación podía acompañar a una URL que sirviera producción. Incorporé una comprobación de `/api/v1/version` antes del login y las mutaciones de prueba. La regresión apuntó cuatro comandos a una API de prueba que devolvía `prod` y verificó que sus únicas peticiones fueran lecturas de versión. Los guiones con la guarda pasaron CI en Compose, incluida la aceptación con frontend detenido y la prueba de navegador. La demo sana de consola sigue disponible mediante `--smoke`. [Evidencia de la guarda](evidence/qa-main/guard-qa.json) · [CI de la auditoría](https://github.com/cristyags/VetNotify/actions/runs/42562957036).

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

El ensayo de promoción con el PR #2 abierto validó los digests y falló al comprobar que el PR estuviera integrado en `main`. Actions terminó sin emitir el artefacto de autorización. El instalador rechazó esa ejecución antes de tocar el clúster. Tras la aprobación e integración de ese manifiesto por `Jechev1`, Actions emitió la autorización para los mismos digests. [Evidencia del rechazo](evidence/qa-main/promocion-control.json) · [PR de promoción](https://github.com/cristyags/VetNotify/pull/2) · [Autorización exitosa](https://github.com/cristyags/VetNotify/actions/runs/42681915057).

## Producción

| Qué se comprobó | Resultado | Evidencia |
|---|---|---|
| Despliegue y separación | Los dos namespaces tienen 14 Deployments listos y PostgreSQL activo. Los PVC son distintos. La cuenta de la aplicación recibe un rechazo al pedir acceso a Secrets. | [K3s](evidence/qa-main/runtime-prod.json) |
| Entrada pública | La web y readiness devolvieron HTTP 200 por HTTPS. `/api/v1/version` confirmó `prod` con el digest aprobado. HTTP redirigió con 308. | [Gateway y respaldo de Caddy](evidence/qa-main/public-prod.json) |
| Consola y Chrome | Ocho IDs distintos llegaron a `delivered`. Hubo cuatro recibos del simulador y cuatro entradas internas. Se comprobó la bandeja a 360 px y el análisis de accesibilidad en ambas vistas. | [Consola](evidence/qa-main/cli-prod/demo-cli-mw9nien7-e297d078.md) · [Chrome](evidence/qa-main/ui-prod/results.json) |
| Límites de acceso | La clave de validación recibió 401. La bandeja ajena devolvió 404. El endpoint de fallos devolvió 403 `faults_disabled`. | [Controles probados](evidence/qa-main/ui-prod/results.json) |
| Observabilidad | Tres targets sanos, diez paneles y una traza de cinco servicios consultada desde Grafana. La prueba de alerta activa y resuelta corresponde a validación. | [Señales productivas](evidence/qa-main/signals-prod.json) · [Incidente](incident-report.md) |

La sonda de Grafana de validación volvió a recibir conexiones rechazadas durante el arranque de Azure. Los logs mostraron avance en la inicialización y terminación por señal antes de que la sonda pasara. Recreé el pod y observé `Ready` con cero reinicios en el nuevo proceso. Se comprobó que el PVC tenía el mismo UID. La causa interna del arranque lento sigue sin aislarse. El Grafana de producción pasó su rollout y la consulta de panel y traza. [Procedimiento](operations.md) · [Señales productivas](evidence/qa-main/signals-prod.json).

[Registro de cierre](evidence/qa-main/produccion.json) · [VetNotify en Azure](https://vetnotify-26a7d1.mexicocentral.cloudapp.azure.com).

## Límites que importan en la defensa

- El correo corresponde al simulador del escenario. Los recibos comprueban aceptación y deduplicación en ese proveedor de prueba. [Estados y garantías](data-and-states.md).
- Los namespaces separan credenciales, datos y fallas controladas. Ambos dependen del mismo nodo y la disponibilidad termina cuando Azure desasigna la VM. [Arquitectura](architecture.md) · [Operación](operations.md).
- El FQDN público sirve un ambiente a la vez. Actions necesita ver el candidato en validación por ese FQDN. Una promoción posterior al primer cambio a producción requiere coordinar una ventana de validación. La suite de fallos también se puede ejecutar en Compose. [Entrega](ci-cd.md) · [Guion API](demo-api.md).
- Los ensayos con degradación, caída de PostgreSQL e imagen inválida corresponden a validación. Las comprobaciones de producción usan entregas sanas y verifican el rechazo de los controles de fallo. [Seguridad](security.md).
- La consulta `ActualCost` devolvió US$0.40 antes de impuestos al corte de noviembre. US$9.89 es la estimación para el escenario de uso documentado con la VM D2s v4. [Costos](costs.md) · [Cargo observado](evidence/qa-main/cost-production.json).
- El equipo debe completar los nombres, carnets y horario reales para la defensa. [Preparación de la defensa](defense-guide.md).
