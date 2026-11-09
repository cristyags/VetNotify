# Preparación de la defensa

La guía evalúa DevOps y Métricas por separado. Cada integrante debe poder explicar el conjunto y ejecutar un ejercicio técnico sin IA. Practiquen con los dos guiones y la matriz.

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

Nombres, carnets y horario de defensa quedan para los datos reales del equipo.
