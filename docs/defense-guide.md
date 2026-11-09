# Preparación de la defensa

La guía evalúa DevOps y Métricas por separado. Cada integrante debe poder explicar el conjunto y ejecutar un ejercicio técnico sin IA. Practiquen con los dos guiones y la matriz.

## Orden de ensayo

1. Antes de abrir React, consulta `/api/v1/version` y `/health/ready` en el FQDN público. Identifica `prod`, el commit y el digest. En GitHub muestra el PR revisado y el artefacto `release.json`. [Cierre de producción](evidence/qa-main/produccion.json).
2. Recorre la consola en Compose para la prueba destructiva durante la defensa. Muestra los tres servicios detenidos y la API respondiendo. Contrasta con las tres réplicas a cero en la evidencia de Azure dev. Lee los cuatro IDs de Agenda y Laboratorio y sus dos tipos de efecto. [Guion API](demo-api.md) · [Prueba sin frontend en K3s](evidence/qa-main/sin-web-mw8r1rcr-9e94605d.md).
3. Abre la interfaz y muestra cómo se observa la misma entrega desde el detalle y la bandeja. Explica quién puede emitir, reprocesar y leer. Usa datos de prueba. [Guion visual](demo-ui.md) · [Chrome](evidence/ui-azure-main.json).
4. Reconstruye el incidente con un ID de correlación y su traza. Muestra el 503, la espera entre intentos, la entrega interna y el cambio de estado de la alerta. [Informe del incidente](incident-report.md).
5. Para DevOps, abre el plan autenticado, la revisión de promoción y el rollback de validación. Explica por qué el estado remoto bloquea escritores y por qué el rollback conserva los datos del PVC. [Entrega](ci-cd.md) · [Rollback probado](evidence/qa-main/rollback-mw8r97ia-49728e73.md).

| Área de práctica | Ejercicio | Evidencia que debe explicar |
|---|---|---|
| Contrato y dominio | Envía con la misma clave en ambos emisores y repite uno | Scope, HTTP 202/200/409, un efecto por ID |
| Persistencia y recuperación | Detén worker con lease y consulta su historial | Intento incierto, token vencido, límite y PVC |
| Infraestructura y entrega | Lee el plan, identifica digest y simula rollback | Estado remoto, permisos, versión y datos |
| Métricas e incidente | Reconstruye una solicitud y calcula el presupuesto | Cohorte madura, espera, 503, alerta y retorno |

- Distingue el commit de aceptación y la evidencia de entrega.
- Explica qué ocurre si el simulador aceptó antes de caer la conexión. La clave del simulador conserva el recibo, y el intento local queda incierto hasta confirmar.
- Interpreta qué hace el Service con readiness fallida y qué hace Kubelet con liveness fallida.
- Diagnostica `ImagePullBackOff`, `Pending` y `OOMKilled` a partir del estado y eventos.
- Identifica el digest desde el Pod y la relación con el commit y el workflow.
- Calcula los incumplimientos permitidos con N=100 para 95%. Luego repite con N=50 para 99%.
- Explica por qué incluir los pendientes vencidos y excluir las derivadas del SLI original.
- Relaciona un trace ID con logs de aceptación e intento. Las métricas agregan por canal para mantener la cardinalidad acotada.
- Explica qué costo permanece después de desasignar la VM y cómo se controla el acumulado.

## Respuestas de control

| Pregunta | Respuesta que se debe demostrar |
|---|---|
| ¿Qué significa 202? | PostgreSQL confirmó la notificación y el trabajo. El recibo de correo o la entrada interna aparecen cuando termina la entrega. |
| ¿Qué pasa si se repite el mismo evento? | Con la misma aplicación, canal, clave y contenido se recupera el ID original. Otro contenido con esa clave recibe 409. |
| ¿Qué pasa si cae el worker con un lease? | Al expirar el lease otro proceso puede reclamar el trabajo. El token anterior ya carece de permiso para cambiar su resultado. |
| ¿Cómo se calculan cinco incumplimientos? | Para 100 originales maduros al 95%, se necesitan 95 buenas y caben cinco incumplimientos. Para 50 avisos al 99%, se necesitan las 50 entregas dentro del límite. |
| ¿Qué distingue readiness de liveness? | Readiness retira la API de los endpoints cuando PostgreSQL falla. Liveness permite que kubelet reinicie el proceso que deja de responder a su sonda. |
| ¿Qué demuestra el rollback? | El Deployment volvió al digest correcto, una entrega previa seguía disponible y una nueva se completó. La restauración de una base dañada es otra operación. |
| ¿Qué demuestra el presupuesto de Azure? | Configura avisos para decidir cuándo parar. El grupo todavía puede facturar disco, IP y almacenamiento cuando la VM queda desasignada. |

Mantén a mano la matriz para encontrar la prueba de cada afirmación y la auditoría para explicar decisiones, fallos y límites. [Matriz](requirements-matrix.md) · [Auditoría de cierre](qa-cierre.md).

Nombres, carnets y horario de defensa quedan para los datos reales del equipo.
