# Notas de exposición

## 1. VetNotify

Presentar el contexto ficticio y los dos modos de demostración. Consultar la matriz antes de asignar quién expone cada sección.

## 2. Dos aplicaciones, dos canales

Demostrar un evento con ambos canales. Cada canal produce su propio identificador. Las claves están en los emisores, fuera de React. Consulta docs/api.md y docs/demo-api.md.

## 3. Componentes y límites de confianza

Sigue el recorrido de consola y luego el de navegador. Enseña que la API no depende del servidor de archivos de React. Abre el diagrama editable en docs/diagrams/arquitectura.mmd.

## 4. Aceptación durable

Abre un ID y muestra la transición inicial. Si el cliente perdió la respuesta, repite la clave. Consulta docs/diagrams/aceptacion.mmd y docs/evidence/qa-main/aceptacion-mw8r2bq4-51ea7b58.json.

## 5. Idempotencia y reintentos

Explica la PK y el advisory lock para una clave que aún no tiene fila. La entrega incierta usa deduplicación propia del simulador. Consulta docs/data-and-states.md y docs/evidence/qa-main/aceptacion-mw8r2bq4-51ea7b58.json.

## 6. Leases y reproceso explícito

Muestra el caso P1-4 y la pantalla de reproceso. Contrasta recuperación automática del lease con nueva notificación derivada. Consulta docs/evidence/qa-main/aceptacion-mw8r2bq4-51ea7b58.json.

## 7. Terraform y K3s en Azure

Explica qué vive en el estado y qué vive en Secrets. Lee el plan antes de aplicar. Consulta docs/evidence/azure-plan-vm.json, docs/infrastructure.md.

## 8. Checks, revisión y digests

Abre el PR #1 y el PR #2. Distingue los checks de la aprobación del digest. Muestra el plan autenticado con cero cambios. Consulta docs/evidence/qa-main/entrega.json y docs/ci-cd.md.

## 9. Ambientes, acceso y salud

Comprueba permisos con kubectl auth can-i. Explica por qué un PVC del nodo sobrevive a un Pod y requiere respaldo para perder la VM. Consulta docs/security.md y docs/operations.md.

## 10. Cohortes y presupuestos

Calcula floor(N × (1 − SLO)) con N=100 y N=50. Explica por qué una derivada no rescata el SLI del original y la sonda puede observar una caída total. Consulta docs/observability.md.

## 11. Dashboard de operación

Abrir la fuente real Grafana. Seleccionar un canal y mostrar cómo la agregación evita etiquetas por notificación. Consulta docs/evidence/qa-main/signals-azure/grafana.png.

## 12. Degradación controlada de correo

Comparar las métricas de antes, durante y después. Seguir la traza de tres servicios. Distinguir activeAt de la observación firing. Consulta docs/evidence/qa-main/aceptacion-mw8r2bq4-51ea7b58.json.

## 13. Recuperación de una versión

Enseñar el UID del Pod con error, digest original y resultado funcional. Consulta docs/evidence/qa-main/rollback-mw8r97ia-49728e73.json.

## 14. Operación bajo demanda

Identificar cargos observados y separar el estimado del reporte de facturación. Explicar los umbrales 50, 75 y 90%. Consulta docs/costs.md y la API oficial de precios Azure.

## 15. Dos recorridos verificados

Arranca con la demo API y conserva la web apagada durante la comprobación. Cambia a la demo visual para mostrar exactamente los mismos contratos. Consulta docs/evidence/qa-main/sin-web-mw8r1rcr-9e94605d.json.
