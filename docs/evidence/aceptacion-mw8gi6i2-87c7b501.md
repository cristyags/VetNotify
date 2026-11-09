# VetNotify · Aceptación del Escenario 1

Ejecución `aceptacion-mw8gi6i2-87c7b501` de 2026-11-08T23:21:36.363Z a 2026-11-08T23:26:06.487Z (UTC).

Entorno `dev`, commit `f7e1ff3720c56b42b096a56fa7559abb4fe773c5`.

| Caso | Estado | Comprobación |
|---|---|---|
| P1-1 | falló | The operation was aborted due to timeout |
| P1-2 | pasó | 503/503/éxito y 503 sostenido con tres llamadas; la bandeja entregó durante el fallo. |
| P1-3 | pasó | 5 replays en cada prueba; un trabajo y efecto por clave. Carrera conflictiva 202/409 y espacios independientes. |
| P1-4 | falló | HTTP 502 (sin código) · se esperaba 200 |
| P1-5 | pasó | 24 correos agotaron 3 intentos; canal interno disponible. Traza de 3 servicios, alerta firing y retorno normal. |
| Seguridad y acceso cruzado | pasó | 401/403/404, CSRF, origen, revocación y cero escrituras por entradas inválidas. |
| Reproceso y resultado ambiguo | pasó | Timeout ambiguo deduplicado por simulador; reproceso autorizado crea una sola derivada auditada. |
| Commit sin respuesta y cohorte madura | pasó | Replay recuperó el ID confirmado; un pendiente y un fallo originales siguen en la cohorte. |

[Informe JSON](./aceptacion-mw8gi6i2-87c7b501.json)
