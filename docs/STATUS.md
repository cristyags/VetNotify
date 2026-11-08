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

Siguiente paso: repetir demostraciones en Azure, probar rollback, publicar el candidato desde Actions y cerrar documentación y presentación.
