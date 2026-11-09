# Integración y entrega

El repositorio privado usa `main` protegido y los checks `verify` e `iac`. La rama exige revisión independiente y aplica la regla a administradores. Los PR verifican npm ci, lint, tipos, pruebas, PostgreSQL, navegador, manifiestos, Terraform sin credenciales y escaneo de secretos. Los archivos `.github/workflows/` fijan acciones por SHA.

`Publicar candidato` espera CI en el mismo commit de una rama de confianza, examina imágenes con Trivy y sube backend y web a GHCR, con etiqueta de commit y digest. El artefacto `release.json` registra el vínculo. La promoción requiere una ejecución exitosa desde `main` y usa sus digests sin reconstruir.

`Terraform autorizado` obtiene credencial efímera OIDC en `main`, usa el lease y emite un resumen de acciones. El apply lo ejecuta una identidad autorizada sobre el plan revisado. El pipeline de PR no tiene credenciales de Azure.

El PR #1 fue aprobado e integrado por `Jechev1`. El primer plan de `main` expuso un desajuste del sujeto OIDC. Después de actualizar solo la credencial federada, el plan autenticado terminó con `changes: []`. El candidato `e1132db` pasó la aceptación y Chrome por el gateway de validación. [Cadena comprobada](evidence/qa-main/entrega.json) · [QA de Azure](qa-cierre.md).

GitHub respondió HTTP 422 al configurar revisores para un ambiente privado. El control alternativo usa un PR de promoción sobre `main` y una ejecución de Actions sin credenciales del clúster. La transferencia al nodo usa un puente de despliegue ejecutado por el operador desde su equipo. La clave SSH queda fuera de Actions y el clúster no necesita una credencial persistente de GHCR. La administración del nodo utiliza la clave SSH y la IPv4 /32 autorizadas. [Ambientes de GitHub](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments) · [Grupos de ejecutores](https://docs.github.com/en/actions/concepts/runners/runner-groups).

## Validación

Con `gh` autenticado y las variables SSH de [infraestructura](infrastructure.md), indica la ejecución exitosa de `Publicar candidato` y su commit. El puente descarga los dos OCI de esa misma ejecución, comprueba sus digests antes de registrarlos en K3s y valida la versión que sirve el gateway. Ejecuta los guiones contra esa versión.

```powershell
pwsh -NoProfile -File scripts/install-ci-candidate.ps1 -ReleaseRun ID -ExpectedCommit SHA40 -CredentialsFile RUTA_DEV
```

## Producción

1. Completa la revisión independiente del PR de integración. Después de integrarlo, selecciona la publicación exitosa de `main`. Instala primero ese candidato en validación y ejecuta aceptación y Chrome.
2. Abre un PR que cambie exclusivamente `releases/production.json`. Usa el `commit`, `backend` y `web` exactos de `release.json`. Obtén una revisión independiente sobre ese cambio e intégralo en `main`.
3. Ejecuta `gh workflow run deploy.yml --ref main -f release_run=ID -f production_pr=NUMERO`. El workflow verifica el PR, la revisión del último commit, los digests y que el candidato siga sirviendo web y API saludables en validación. Descarga la autorización desde la ejecución exitosa.
4. Genera credenciales separadas con `node scripts/bootstrap-local.mjs RUTA_PROD`. Ejecuta el mismo puente de validación con `-CredentialsFile RUTA_PROD -ProductionAuthorizationRun ID_AUTORIZACION`. El puente valida ambas ejecuciones de `main`, la protección actual y el manifiesto aprobado antes de aplicar. Comprueba el digest de producción en el NodePort privado 31081.
5. Desde SSH, conserva una copia de `/etc/caddy/Caddyfile`, cambia el upstream de `127.0.0.1:31080` a `127.0.0.1:31081`, valida con `sudo /usr/local/bin/caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile` y ejecuta `sudo systemctl restart vetnotify-edge`. Verifica `/health/ready`, `/api/v1/version` y una entrega por los dos canales. Si falla la verificación, restaura la copia y reinicia el servicio de nuevo.

La versión y los Pods se consultan con `GET /api/v1/version` y `kubectl get pods -o json`. El ensayo del control con el PR #2 abierto validó los digests, falló en la condición de integración a `main` y dejó cero artefactos de autorización. [Evidencia del ensayo](evidence/qa-main/promocion-control.json) · [Estado de los ambientes](STATUS.md).

El FQDN público sirve un ambiente por vez. Tras el primer cambio a producción, coordina una ventana para volver a servir validación por ese FQDN mientras se verifica y autoriza el candidato siguiente. En esa ventana el acceso público corresponde a `dev`. El entorno productivo conserva sus datos y su gateway privado.
