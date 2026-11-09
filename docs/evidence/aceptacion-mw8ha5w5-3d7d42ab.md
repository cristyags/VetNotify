# VetNotify · Aceptación del Escenario 1

Ejecución `aceptacion-mw8ha5w5-3d7d42ab` de 2026-11-08T23:43:21.942Z a 2026-11-08T23:47:55.929Z (UTC).

Entorno `dev`, commit `92e5a9af8cfd7c1c5c7d409fd77c126e6bb7c30b`.

| Caso | Estado | Comprobación |
|---|---|---|
| P1-1 | falló | The operation was aborted due to timeout |
| P1-2 | pasó | 503/503/éxito y 503 sostenido con tres llamadas; la bandeja entregó durante el fallo. |
| P1-3 | falló | The operation was aborted due to timeout |
| P1-4 | pasó | Worker terminado tras reclamar con pendientes; lease recuperado, token viejo rechazado y PostgreSQL/API reiniciados. |
| P1-5 | pasó | 24 correos agotaron 3 intentos; canal interno disponible. Traza de 3 servicios, alerta firing y retorno normal. |
| Seguridad y acceso cruzado | pasó | 401/403/404, CSRF, origen, revocación y cero escrituras por entradas inválidas. |
| Reproceso y resultado ambiguo | pasó | Timeout ambiguo deduplicado por simulador; reproceso autorizado crea una sola derivada auditada. |
| Commit sin respuesta y cohorte madura | pasó | Replay recuperó el ID confirmado; un pendiente y un fallo originales siguen en la cohorte. |

[Informe JSON](./aceptacion-mw8ha5w5-3d7d42ab.json)
