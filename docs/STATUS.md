# Estado de VetNotify

## 8 de noviembre de 2026 · Inspección

- Leímos el prompt maestro completo y las 16 páginas del PDF. El Escenario 1 y el Anexo II prevalecen para los mínimos académicos. La política de derivadas, la interfaz y los plazos SLO son decisiones del proyecto.
- Directorio inicial vacío. Git 2.55.0, Node 24.19.0, npm 11.17.0, Docker Desktop Linux/Compose 5.4, Azure CLI 2.91, Terraform 1.16.5, kubectl y Chrome disponibles. Docker respondió después de iniciar Desktop.
- GitHub CLI autenticado como `cristyags`. No se encontró `cristyags/VetNotify`. La privacidad inicial del proyecto será privada. Las protecciones dependen del plan real.
- Azure for Students habilitada con rol Owner. La suscripción tiene recursos ajenos al proyecto. México Central reportó 2 de 6 vCPU consumidas. Se usarán nombres y grupos de recursos dedicados.
- El Portal de Azure mostró US$96 disponibles y US$2.55 de costo de noviembre para la suscripción. La VM de VetNotify se estima por separado en `costs.md`.

## Implementación y primeras pruebas

- API, migración, cola durable, dos workers y dos emisores implementados. El primer ensayo registró `42P08` y se corrigió el cast del enum en las transiciones. El smoke posterior comprobó cuatro IDs, dos recibos y dos bandejas. [Informe](evidence/demo-cli-mw8egkln-d679ba8f.md).
- La prueba aislada de TTL configuró 2 s, conservó replay mientras el trabajo seguía activo y creó una segunda notificación al vencer después del resultado terminal. [Informe](evidence/ttl-mw8etwlf-201187d8.md).
- La ejecución local con frontend detenido pasó P1-1 a P1-5, seguridad, ambigüedad de entrega, reproceso, pérdida de respuesta y cohorte. El lote conservó 100 registros y trabajos. Entregó 95 y registró los 5 rechazos esperados. [Aceptación](evidence/aceptacion-mw8f14b7-4091d0c5.md) · [Web detenida](evidence/sin-web-mw8f0r9n-1d4616d0.md).
- Chrome pasó el recorrido de Agenda/Laboratorio, continuidad interna, reproceso, rechazo permanente, aislamiento y lectura de bandeja a 360 px. [Capturas](evidence/ui-local/).
- Prometheus consultó los tres targets y sus dos reglas. El incidente local disparó y resolvió la alerta. Grafana provisionó 10 paneles y consultó Jaeger mediante el datasource. La traza de tres servicios sobrevivió al reinicio de Jaeger. [Señales](evidence/senales-mw8f7p92-aa96e4bc.md).
- El escaneo npm de dependencias runtime devolvió cero vulnerabilidades después de actualizar OpenTelemetry. El informe completo de desarrollo distingue alertas del árbol de herramientas.
- El [PR #1](https://github.com/cristyags/VetNotify/pull/1) quedó abierto. La regla de `main` exige `verify`, `iac` y una revisión, incluso para administradores. `cristyags` es autora y única colaboradora. La API de GitHub respondió 422 a los revisores del ambiente privado. Se preparó gate alternativo por PR protegido para promoción.
- La primera ejecución de CI en Linux falló por el checksum de proveedor en el lockfile de Terraform. Se obtuvieron y agregaron hashes firmados de Linux y Windows. [Control observado](evidence/github-gate-before.json).
- Terraform creó los cuatro recursos de bootstrap de estado. El primer apply de workload creó red, identidad y presupuesto. Azure rechazó la imagen listada `24.04.202611050`. Se verificó `24.04.202610210` y el segundo plan solo añadió la VM.
- Azure confirmó K3s `v1.35.2+k3s1` Ready y cifrado de Secrets. Caddy arrancó tras corregir la verificación oficial de SHA-512. Se verificó HTTPS en `vetnotify-26a7d1.mexicocentral.cloudapp.azure.com`. La importación OCI validó los digests de backend y web del commit `f7e1ff3720c56b42b096a56fa7559abb4fe773c5`. El primer Job de DB se adelantó al arranque TCP de PostgreSQL. Se corrigieron probes y se repite la inicialización sin eliminar PVC.

## Verificación en validación Azure

- La migración y semilla quedaron verificadas. El Job incluye espera de conexión SQL desde su propio Pod. `vetnotify-dev` sirvió API, React, emisores y observabilidad. Existe el namespace separado `vetnotify-prod` para la promoción aprobada.
- Chrome pasó la demostración contra el FQDN HTTPS, con capturas de los dos emisores y la bandeja a 360 px. [Evidencia de navegador](evidence/ui-azure/).
- Se comprobó un rollback real de imagen defectuosa (`ErrImagePull`), el dato previo se conservó y un envío nuevo se entregó. Liveness produjo un reinicio observado y se restauró la configuración. [Rollback](evidence/rollback-mw8fyyaw-7c7cd288.md) · [K3s, recursos y RBAC](evidence/k3s-mw8fza40-72329845.md).
- P1-1, P1-2, P1-3, P1-5 y las pruebas adicionales pasaron en Azure. Las primeras dos ejecuciones de P1-4 detectaron que borrar el objeto Pod no garantizaba la terminación a tiempo del proceso remoto. El procedimiento corregido termina el contenedor por CRI y exige que kubelet muestre un proceso nuevo.
- El plan Terraform posterior no mostró diferencias. La consulta ActualCost del proyecto aún no devolvió filas. México Central no admite el apagado programado de Azure para esta VM.
- Invitación de escritura para `Jechev1` emitida. Tras aceptarla podrá revisar el [PR #1](https://github.com/cristyags/VetNotify/pull/1). El PDF pide repositorio y evidencias para la defensa. La colaboración del docente es opcional.
- En Azure pasó P1-4 con terminación por CRI y comprobación del proceso nuevo. Una corrida tuvo un corte de SSH en P1-5. La corrida siguiente confirmó P1-5 y detectó conexiones rechazadas por el gateway inmediatamente después de recrear la API. El guion espera la lectura de los estados persistidos antes de declarar recuperación. [P1-4](evidence/aceptacion-mw8g8irm-69bcf421.md) · [Repetición P1-5](evidence/aceptacion-mw8gi6i2-87c7b501.md).
- Actions ejecutó P1-1 a P1-5 en Linux. La comprobación del gateway posterior al proceso hijo devolvió un error de transporte. Se espera al hijo de forma asíncrona y se confirma la misma versión antes de restaurar las tres réplicas. [Ejecución](https://github.com/cristyags/VetNotify/actions/runs/42534742579).
- Se añadió un puente SSH que consume el OCI exacto de Actions y comprueba su versión en validación. Para producción exige una autorización emitida por el workflow de `main`, con un PR de promoción revisado y el digest activo en validación. [Procedimiento](ci-cd.md).
- En Compose volvió a pasar la suite completa con el commit `92e5a9af8cfd` y React, Agenda y Laboratorio detenidos durante la prueba. En K3s P1-4 pasó con las tres réplicas a cero y `/` devolvió 502 mientras la API y la consola siguieron funcionando. [Compose](evidence/sin-web-mw8gx1by-f00b9ac9.md) · [K3s](evidence/sin-web-mw8gzre4-fd7cd3a3.md).
- Los checks requeridos `verify` e `iac` pasaron en el PR de GitHub. El merge continuó bloqueado por la revisión humana. La ejecución de CI por push del mismo commit también pasó y habilitó el workflow de publicación. [Regla y checks](evidence/github-gate-after.json) · [CI por push](https://github.com/cristyags/VetNotify/actions/runs/42535369670).
- El Grafana de Azure consultó la misma traza antes y después de recrear el Pod de Jaeger. Prometheus devolvió series para los latidos y la aceptación de la sonda. Se comprobaron los 10 paneles configurados. [Informe](evidence/senales-mw8gy07k-02de53ec.md).
- GitHub Actions publicó backend y web en GHCR. El puente SSH descargó los OCI de esa corrida, comprobó sus digests, actualizó `vetnotify-dev` y verificó por HTTPS el commit `92e5a9af8cfd7c1c5c7d409fd77c126e6bb7c30b` y la referencia de backend publicada. Se aplicaron los ajustes de recursos y el Job de migración/semilla terminó. [Publicación](https://github.com/cristyags/VetNotify/actions/runs/42535369639) · [Digests](evidence/github-release.json).
- La suite completa de ese candidato pasó en Azure con las tres réplicas a cero. Los 100 IDs conservaron 100 trabajos, 50 efectos de bandeja y 45 recibos. Pasaron P1-1 a P1-5, seguridad y acceso cruzado, reproceso, commit sin respuesta y cohorte madura. El acceso CLI por túnel SSH mantuvo el certificado y el FQDN del gateway. La corrida directa anterior registró timeouts. [Aceptación](evidence/aceptacion-mw8hgv1s-61a37292.md) · [Web detenida y restaurada](evidence/sin-web-mw8hgeif-040da311.md).

## Cierre de validación

- Chrome pasó contra el FQDN público con el mismo commit. Confirmó ambos emisores, degradación, reproceso y bandeja a 360 px. Grafana cargó 10 paneles y Jaeger devolvió la traza del candidato tras reiniciar. [Chrome](evidence/ui-azure-check.json) · [Señales](evidence/senales-mw8hot0g-de1c12be.md).
- Con la web restaurada, HTTPS devolvió 200 en `/` y `/health/ready`. Los dos digests coincidieron con GHCR y el servicio SQL temporal quedó retirado. Azure confirmó `PowerState/deallocated` a las 23:58 UTC del 8 de noviembre. Los discos, los volúmenes y la IP se conservan. [Cierre de Azure](evidence/azure-closeout.json).
- En este punto faltaban la revisión de integración y la promoción. El avance posterior se registra en el QA del candidato de `main`. [Controles y pasos](ci-cd.md).
- El costo estimado del escenario es US$9.61. Los cargos de los grupos aún no se muestran en la consulta. [Costos](costs.md).

Para la defensa, inicia la VM con `az vm start -g rg-vetnotify-26a7d1 -n vetnotify-26a7d1` y comprueba `/health/ready` en el [FQDN de validación](https://vetnotify-26a7d1.mexicocentral.cloudapp.azure.com/health/ready). Las credenciales de Azure dev están en el archivo privado `work/vetnotify-azure/dev.env` del equipo que realizó el despliegue. Compose usa su propio `.env` local.

## QA del candidato de main

- `Jechev1` aprobó el commit `f721fa9` e integró el PR #1. CI y la publicación de `main` terminaron con éxito en `e1132db`. [PR #1](https://github.com/cristyags/VetNotify/pull/1) · [Publicación](https://github.com/cristyags/VetNotify/actions/runs/42558821440).
- El primer intento de OIDC falló por el formato del sujeto. Terraform actualizó solo la credencial federada. Actions volvió a ejecutar el plan autenticado y obtuvo cero cambios. [Cadena de entrega](evidence/qa-main/entrega.json) · [Plan](https://github.com/cristyags/VetNotify/actions/runs/42560565344).
- K3s importó los dos OCI exactos en `vetnotify-dev`. Pasaron P1-1 a P1-5, seguridad, reproceso, commit sin respuesta y cohorte madura con la web detenida. Chrome pasó contra el mismo digest. [Aceptación](evidence/qa-main/aceptacion-mw8r2bq4-51ea7b58.md) · [Sin frontend](evidence/qa-main/sin-web-mw8r1rcr-9e94605d.md) · [Chrome](evidence/ui-azure-main.json).
- Se comprobó rollback, liveness, RBAC, persistencia de trazas, paneles y escaneo de los OCI. Se retiró el servicio SQL temporal. [Auditoría y QA](qa-cierre.md).
- La promoción de los digests verificados quedó lista para revisión en el PR #2. El ensayo con el PR abierto comprobó el bloqueo efectivo de la autorización. [PR de promoción](https://github.com/cristyags/VetNotify/pull/2) · [Ensayo](evidence/qa-main/promocion-control.json).
- El PR #3 en borrador registra la auditoría y la guarda de entorno. Los checks del commit que introdujo la guarda pasaron, incluida la aceptación sin frontend en Compose. [PR de QA](https://github.com/cristyags/VetNotify/pull/3) · [CI](https://github.com/cristyags/VetNotify/actions/runs/42562957036).
- Azure confirmó `PowerState/deallocated` a las 04:47 UTC del 9 de noviembre. La última versión pública comprobada fue `dev` en `e1132db`. Producción espera la aprobación independiente del PR #2. [Cierre de este QA](evidence/qa-main/azure-closeout.json).

## Producción verificada · 9 de noviembre de 2026

- `Jechev1` aprobó el commit del manifiesto e integró el PR #2. Actions emitió la autorización para los dos OCI del candidato `e1132db`. [PR #2](https://github.com/cristyags/VetNotify/pull/2) · [Autorización](https://github.com/cristyags/VetNotify/actions/runs/42681915057).
- Azure rechazó el arranque de B2as v2 por capacidad zonal. Terraform aplicó un plan guardado que cambió solo el tamaño a D2s v4. Azure confirmó el arranque y el plan autenticado posterior devolvió cero cambios. [Recuperación](evidence/qa-main/azure-start-recovery.json) · [Plan](https://github.com/cristyags/VetNotify/actions/runs/42681725794).
- El FQDN público respondió en `prod` por HTTPS. Los 14 Deployments y PostgreSQL quedaron listos en cada namespace, con PVC separados. La VM quedó encendida para la entrega. [Producción](evidence/qa-main/produccion.json) · [Servicios listos](evidence/qa-main/runtime-prod.json) · [Acceso público](https://vetnotify-26a7d1.mexicocentral.cloudapp.azure.com).
- Cuatro notificaciones por CLI y cuatro por Chrome llegaron a `delivered`. Se comprobaron cuatro recibos de correo simulado, cuatro entradas internas, aislamiento de credenciales y bandeja, y perfiles de fallo desactivados. [CLI](evidence/qa-main/cli-prod/demo-cli-mw9nien7-e297d078.md) · [Chrome](evidence/qa-main/ui-prod/results.json).
- Prometheus mostró tres targets sanos. Grafana sirvió los diez paneles y recuperó en Jaeger una traza de cinco servicios. La facturación atribuida a ambos grupos al corte fue US$0.40. [Señales](evidence/qa-main/signals-prod.json) · [Costos](costs.md).
