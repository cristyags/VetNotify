# VetNotify · Aceptación del Escenario 1

Ejecución `aceptacion-mw8hgv1s-61a37292` de 2026-11-08T23:48:34.480Z a 2026-11-08T23:52:56.671Z (UTC).

Entorno `dev`, commit `92e5a9af8cfd7c1c5c7d409fd77c126e6bb7c30b`.

| Caso | Estado | Comprobación |
|---|---|---|
| P1-1 | pasó | 100 IDs y trabajos; 95 entregadas, 5 fallidas; 50 efectos internos y 45 recibos. |
| P1-2 | pasó | 503/503/éxito y 503 sostenido con tres llamadas; la bandeja entregó durante el fallo. |
| P1-3 | pasó | 5 replays en cada prueba; un trabajo y efecto por clave. Carrera conflictiva 202/409 y espacios independientes. |
| P1-4 | pasó | Worker terminado tras reclamar con pendientes; lease recuperado, token viejo rechazado y PostgreSQL/API reiniciados. |
| P1-5 | pasó | 24 correos agotaron 3 intentos; canal interno disponible. Traza de 3 servicios, alerta firing y retorno normal. |
| Seguridad y acceso cruzado | pasó | 401/403/404, CSRF, origen, revocación y cero escrituras por entradas inválidas. |
| Reproceso y resultado ambiguo | pasó | Timeout ambiguo deduplicado por simulador; reproceso autorizado crea una sola derivada auditada. |
| Commit sin respuesta y cohorte madura | pasó | Replay recuperó el ID confirmado; un pendiente y un fallo originales siguen en la cohorte. |

[Informe JSON](./aceptacion-mw8hgv1s-61a37292.json)
