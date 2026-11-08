# Operación y recuperación

`/health/live` vigila el proceso. `/health/ready` comprueba la base y la migración. Kubernetes retira endpoints del Service cuando falla readiness. Un fallo de liveness reinicia el contenedor tras el umbral de la probe. El worker revisa el pulso del bucle, que también late cuando no hay trabajo.

| Síntoma | Consulta | Acción de diagnóstico |
|---|---|---|
| `ImagePullBackOff` | `kubectl describe pod` y eventos | Comprueba el digest, nombre y acceso al registro |
| `Pending` | `kubectl get events`, `describe node`, PVC | Inspecciona scheduler, requests y provisión |
| `OOMKilled` | `kubectl describe pod`, `kubectl top pods` | Contrasta RSS, límites y concurrencia |
| Correo lento | Alertas, intentos, pendientes y trazas | Correlaciona 503, timeout o lease expirado |
| Base no lista | `/health/ready`, estado StatefulSet y PVC | Recupera PostgreSQL y reintenta con la misma clave |

`npm run recover` comprueba reinicio del worker con lease, caída de PostgreSQL, reinicio de API y persistencia. `npm run rollback-demo` despliega un digest inexistente en validación, detecta el fallo y recupera la versión anterior. Los cambios de esquema deben ser compatibles durante promoción o seguir una migración por etapas. El rollback del Deployment deja el PVC intacto.

Los volúmenes local-path sobreviven al Pod en el mismo nodo. Para respaldo, exporta `pg_dump -Fc` a almacenamiento privado con acceso restringido. Prueba restauración en una base separada con `pg_restore --exit-on-error`. Evita volcar la base y los Secrets en evidencias. Una pérdida de VM requiere restaurar datos desde ese respaldo.
