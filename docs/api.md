# Contrato HTTP

Descarga `GET /api/v1/openapi.json` desde el gateway. Los esquemas se generan desde las rutas Fastify y se validan al recibir. La tabla y sus filtros usan fechas UTC, orden `accepted_at DESC, id DESC` y paginación `limit` (1–100) / `offset`.

| Caso | Respuesta |
|---|---|
| Alta durable | 202, `Location`, `id` y estado actual |
| Replay idéntico | 200, mismo `id`, `replay: true` |
| Validación o destinatario desconocido | 400 |
| Credencial inválida | 401 |
| Permiso, CSRF u origen inválido | 403 |
| ID ajeno para aplicación o destinatario | 404 |
| Conflicto de clave o de estado | 409 |
| Dependencia indispensable indisponible | 503 |

Las claves de máquina usan `Authorization: Bearer …`. Los endpoints humanos requieren la cookie de sesión y, en escrituras, `X-CSRF-Token`. Inicia sesión con JSON `{"username":"operador","password":"valor local"}` en `POST /api/v1/auth/login`. La respuesta lleva el token CSRF. Scripts con Node usan el mismo contrato y no requieren navegador.

```powershell
npm run build:api
npm run agenda -- --event cita-confirmada --recipient luna --channel both
npm run laboratorio -- --event resultado-disponible --recipient max --channel both
npm run demo-api -- --smoke
```

Ejemplo del cuerpo que emite Agenda.

```json
{
  "applicationId": "agenda-veterinaria",
  "recipient": {"id": "luna"},
  "channel": "email",
  "subject": "Cita confirmada",
  "body": "La cita ficticia de Luna fue confirmada.",
  "metadata": {"event": "cita-confirmada", "pet": "Luna"}
}
```

Consulta el historial en `/notifications` y el detalle en `/notifications/{id}`, con subrutas `/attempts` y `/transitions`. El destinatario usa `/me/inbox`. `/stats` calcula grupo/total del canal sobre el conjunto filtrado. `/stats/cohorts` mide cohortes maduras globales y desgloses. `/version` identifica el build. Los controles `/admin/faults/{runId}` son temporales y administrativos, con acceso limitado a validación.
