# Evidencias de VetNotify

Los informes JSON conservan el entorno, la versión, las horas UTC y las comprobaciones de cada corrida. Sus archivos Markdown muestran el resumen. Los casos fallidos se conservan para explicar las correcciones. La [matriz](../requirements-matrix.md) enlaza el resultado verificado por requisito.

| Comprobación | Evidencia |
|---|---|
| Suite de aceptación local con React detenido | [P1-1 a P1-5](aceptacion-mw8gxby3-7f326292.md) · [réplicas y gateway](sin-web-mw8gx1by-f00b9ac9.md) |
| Ejecución de integración en Linux | [GitHub Actions](https://github.com/cristyags/VetNotify/actions/runs/42535374047) · [aceptación](ci-linux/aceptacion-mw8gwu66-aeb6a6c4.md) · [web detenida](ci-linux/sin-web-mw8gwroo-69452da7.md) · [TTL](ci-linux/ttl-mw8h0ygo-fa10ec4a.md) |
| Expiración de idempotencia en entorno aislado | [TTL de prueba](ttl-mw8etwlf-201187d8.md) |
| Suite completa en K3s con los digests de GHCR | [P1-1 a P1-5 y seguridad](aceptacion-mw8hgv1s-61a37292.md) · [web y adaptadores a cero](sin-web-mw8hgeif-040da311.md) · [clientes CLI](demo-cli-mw8hgpgl-ff167d98.md) |
| Incidente por 503, alerta, trazas y recuperación | [Análisis y cronología](../incident-report.md) |
| Pantallas de Agenda, Laboratorio, centro operativo y bandeja móvil | [Verificación Chrome en Azure](ui-azure-check.json) · [capturas Azure](ui-azure/) · [Chrome local](ui-local/) |
| Reglas, paneles y almacenamiento de trazas | [Grafana y Jaeger en Azure](signals-azure/) · [informe del candidato](senales-mw8hot0g-de1c12be.md) · [Compose](signals-local/) |
| Fallo de despliegue y recuperación por digest | [Rollback en Azure](rollback-mw8fyyaw-7c7cd288.md) |
| Salud, almacenamiento y permisos efectivos | [K3s y RBAC del candidato](k3s-mw8hn1vf-ca98a6ad.md) · [liveness](k3s-mw8fza40-72329845.md) · [red, estado y presupuesto](azure-platform.json) |
| Escaneo de imágenes de aplicación | [Hallazgos iniciales](container-scan.json) · [OCI corregidos](container-scan-corrected.json) |
| Publicación con digests inmutables e importación en K3s | [GitHub Actions](https://github.com/cristyags/VetNotify/actions/runs/42535369639) · [Manifiesto de la corrida](github-release.json) |
| TLS, readiness, retirada del servicio SQL de pruebas y desasignación | [Cierre de Azure](azure-closeout.json) |

## Candidato de main

| Comprobación | Evidencia |
|---|---|
| Integración revisada, OIDC corregido y publicación | [Cadena de entrega](qa-main/entrega.json) |
| Aceptación con web y adaptadores a cero | [P1-1 a P1-5 y seguridad](qa-main/aceptacion-mw8r2bq4-51ea7b58.md) · [Web detenida y restaurada](qa-main/sin-web-mw8r1rcr-9e94605d.md) |
| Verificación visual | [Resultado de Chrome](ui-azure-main.json) · [Capturas](ui-azure-main/) |
| K3s y observabilidad | [Rollback](qa-main/rollback-mw8r97ia-49728e73.md) · [Liveness y RBAC](qa-main/k3s-mw8rahpp-ceb9b6f9.md) · [Dashboard y trazas](qa-main/senales-mw8r9iyy-83033550.md) |
| Alcance de las pruebas y entrega | [Guarda de entorno](qa-main/guard-qa.json) · [Escaneo OCI](qa-main/oci-secrets.json) · [Retirada SQL](qa-main/sql-temporal.json) |
| Protección de `main` con checks fallidos y posterior corrección | [Regla y bloqueo](github-gate-before.json) · [checks aprobados](github-gate-after.json) · [PR #1](https://github.com/cristyags/VetNotify/pull/1) |
| Rechazo de autorización de producción con el PR de promoción abierto | [Resultado](qa-main/promocion-control.json) · [Actions](https://github.com/cristyags/VetNotify/actions/runs/42562425118) |
| Desasignación al cerrar QA y estado de revisión | [Azure y GitHub](qa-main/azure-closeout.json) |

Las capturas muestran datos ficticios de pruebas ejecutadas por Chrome. La suite completa de Azure usó un túnel SSH local hacia el mismo Caddy HTTPS con validación del certificado del FQDN. La prueba visual usó el FQDN público. La corrida directa de consola anterior registró timeouts y se conserva para comparar. [Corrida directa](aceptacion-mw8ha5w5-3d7d42ab.md).

Para interpretar una incidencia, usa los IDs de correlación y las series del informe, junto con la consulta de logs y trazas de [observabilidad](../observability.md).
