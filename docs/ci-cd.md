# Integración y entrega

El repositorio privado usa `main` protegido y los checks `verify` e `iac`. La rama exige revisión independiente y aplica la regla a administradores. Los PR verifican npm ci, lint, tipos, pruebas, PostgreSQL, navegador, manifiestos, Terraform sin credenciales y escaneo de secretos. Los archivos `.github/workflows/` fijan acciones por SHA.

`Publicar candidato` espera CI en el mismo commit de una rama de confianza, examina imágenes con Trivy y sube backend y web a GHCR, con etiqueta de commit y digest. El artefacto `release.json` registra el vínculo. La promoción requiere una ejecución exitosa desde `main` y usa sus digests sin reconstruir.

`Terraform autorizado` obtiene credencial efímera OIDC en `main`, usa el lease y emite un resumen de acciones. El apply lo ejecuta una identidad autorizada sobre el plan revisado. El pipeline de PR no tiene credenciales de Azure.

`Entrega controlada` permanece cerrada hasta configurar revisores independientes de producción, ramas autorizadas y un runner dedicado de confianza. Configura en el runner un usuario de sistema sin sudo, con tokens RBAC limitados, los contextos `vetnotify-dev-release` y `vetnotify-prod-release`, y el script `/opt/vetnotify/promote.sh` propiedad de root. No asignes jobs de PR a ese runner. En una organización con grupos de runners, restringe el grupo al workflow de entrega desde `main`. Si no existe aislamiento adecuado, usa la importación administrativa por SSH y registra ese alcance, sin habilitar promoción automática.

Para aprobar de verdad, el revisor revisa cambios, pruebas y `release.json`, aprueba el PR y la entrega en el ambiente correspondiente con una cuenta independiente. Se desactiva la autoaprobación. La versión y los Pods se consultan con `GET /api/v1/version` y `kubectl get pods -o json`. Consulta [estado](STATUS.md) para diferenciar ejecución y configuración.
