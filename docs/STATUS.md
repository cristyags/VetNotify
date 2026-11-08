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
- Prometheus consultó los tres targets y sus dos reglas. Jaeger consultó una traza real después de corregir el permiso de su PVC. API y web compilan. Verificación completa de escenarios y navegador en curso.
- El escaneo npm de dependencias runtime devolvió cero vulnerabilidades después de actualizar OpenTelemetry. El informe completo de desarrollo distingue alertas del árbol de herramientas.
- GitHub creó el repositorio privado `cristyags/VetNotify`. La regla de `main` exige `verify`, `iac` y una revisión, incluso para administradores. El propietario es el único colaborador actual.
- Terraform creó los cuatro recursos de bootstrap de estado. El primer apply de workload creó la red, identidad y presupuesto. Azure rechazó la versión de imagen listada `24.04.202611050`. Se verificó `24.04.202610210` y el segundo plan solo añadió la VM. Azure confirma VM en ejecución. Se diagnostica un fallo de cloud-init antes de desplegar workloads.

Siguiente paso: completar la aceptación y la demostración visual, conectar K3s y publicar una rama candidata para revisión.
