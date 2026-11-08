# Integración y entrega

El repositorio privado usa `main` protegido y los checks `verify` e `iac`. La rama exige revisión independiente y aplica la regla a administradores. Los PR verifican npm ci, lint, tipos, pruebas, PostgreSQL, navegador, manifiestos, Terraform sin credenciales y escaneo de secretos. Los archivos `.github/workflows/` fijan acciones por SHA.

`Publicar candidato` espera CI en el mismo commit de una rama de confianza, examina imágenes con Trivy y sube backend y web a GHCR, con etiqueta de commit y digest. El artefacto `release.json` registra el vínculo. La promoción requiere una ejecución exitosa desde `main` y usa sus digests sin reconstruir.

`Terraform autorizado` obtiene credencial efímera OIDC en `main`, usa el lease y emite un resumen de acciones. El apply lo ejecuta una identidad autorizada sobre el plan revisado. El pipeline de PR no tiene credenciales de Azure.

`Entrega controlada` permanece cerrada hasta preparar un runner dedicado de confianza. GitHub rechazó con 422 la regla de revisores de ambiente en el plan privado. El gate alternativo exige un PR independiente que cambie exclusivamente `releases/production.json`, con `commit`, `backend` y `web` iguales al artefacto aprobado. El workflow verifica aprobación sobre el último commit de ese PR, autor distinto, merge en `main` protegida, digests iguales y validación exitosa antes del job de producción.

Configura en el runner un usuario de sistema sin sudo, con tokens RBAC limitados, los contextos `vetnotify-dev-release` y `vetnotify-prod-release`, y el script `/opt/vetnotify/promote.sh` propiedad de root. Restringe el grupo de runners a este workflow desde `main`. Si el plan no ofrece ese aislamiento, mantén cerrada la promoción automática y usa la importación administrativa por SSH una vez aprobada la entrega.

La versión y los Pods se consultan con `GET /api/v1/version` y `kubectl get pods -o json`. Consulta [estado](STATUS.md) para diferenciar ejecución y configuración.
