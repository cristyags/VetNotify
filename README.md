# VetNotify

Plataforma veterinaria de **notificaciones multicanal**. Agenda Veterinaria y Laboratorio Veterinario envían por HTTP con credenciales de máquina independientes. La API registra la aceptación en PostgreSQL y dos workers independientes entregan por correo de prueba y bandeja persistente. Un gateway independiente mantiene la API accesible cuando React está apagado. Los datos y cuentas son ficticios.

## Arranque local

Instala Node 24.19, npm, Git y Docker Desktop con motor Linux. Para la demo visual en Windows se usa Chrome. En Linux instala Chromium con `npx playwright install --with-deps chromium`.

```powershell
npm ci
npm run doctor
npm run bootstrap-local
npm run up-full
npm run build:api
npm test
npm run demo-ui
npm run verify-no-frontend
```

Abre [VetNotify local](http://localhost:18080). La semilla crea `operador`, `sofia` y `diego`. Consulta las contraseñas generadas en tu archivo local `.env`. El usuario de Grafana es `vetnotify`. Conserva `.env` junto con sus volúmenes.

`npm run up-core` arranca PostgreSQL, el gateway, la API, los dos workers, los dos emisores y el simulador. `npm run up-obs` añade observabilidad. `npm run demo-api -- --smoke` ejecuta ambos clientes CLI. `npm run verify-no-frontend` detiene la web, comprueba cero instancias y ejecuta la demo y las pruebas antes de restaurar el estado previo.

| Entrada local | Uso |
|---|---|
| [VetNotify](http://localhost:18080) | Interfaz y acceso humano |
| [OpenAPI JSON](http://localhost:18080/api/v1/openapi.json) | Contrato independiente de React |
| [Grafana](http://localhost:13000/d/vetnotify-ops) | Dashboard con credencial de demo |
| [Prometheus](http://localhost:19090) | Consultas y estado de alertas, acceso loopback |
| [Jaeger](http://localhost:16686) | Trazas de aceptación, entrega y simulador, acceso loopback |

## Evidencias y operación

- [Matriz de requisitos](docs/requirements-matrix.md) y [estado](docs/STATUS.md).
- [Arquitectura](docs/architecture.md), [contrato HTTP](docs/api.md), [modelo](docs/data-and-states.md) y [seguridad](docs/security.md).
- [Infraestructura y reconstrucción](docs/infrastructure.md), [operación](docs/operations.md), [entrega](docs/ci-cd.md) y [costos](docs/costs.md).
- [Métricas](docs/observability.md), [incidente](docs/incident-report.md) e [informes](docs/evidence/).
- [Demo por API](docs/demo-api.md), [demo visual](docs/demo-ui.md), [guía de defensa](docs/defense-guide.md) y [presentación](slides/).

Consulta `docs/STATUS.md` para el estado efectivo de Azure y de los gates. Para detener contenedores locales y conservar datos, ejecuta `docker compose --profile web --profile observability down`.

Validación Azure en [VetNotify](https://vetnotify-26a7d1.mexicocentral.cloudapp.azure.com). Si la VM está desasignada, `az vm start -g rg-vetnotify-26a7d1 -n vetnotify-26a7d1` la inicia desde la sesión Azure autorizada. Los datos permanecen en sus volúmenes. [Operación Azure](docs/infrastructure.md).
