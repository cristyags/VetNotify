# VetNotify · Aceptación del Escenario 1

Ejecución `aceptacion-mw8exzyh-d9b04e3f` de 2026-11-08T22:37:55.145Z a 2026-11-08T22:38:33.072Z (UTC).

Entorno `local`, commit `6a24524f2de9`.

| Caso | Estado | Comprobación |
|---|---|---|
| P1-1 | pasó | 100 IDs y trabajos; 95 entregadas, 5 fallidas; 50 efectos internos y 45 recibos. |
| P1-2 | pasó | 503/503/éxito y 503 sostenido con tres llamadas; la bandeja entregó durante el fallo. |
| P1-3 | pasó | 5 replays en cada prueba; un trabajo y efecto por clave. Carrera conflictiva 202/409 y espacios independientes. |
| P1-4 | no ejecutado | Fuera de la selección de esta corrida. |
| P1-5 | no ejecutado | Fuera de la selección de esta corrida. |
| Seguridad y acceso cruzado | pasó | 401/403/404, CSRF, origen, revocación y cero escrituras por entradas inválidas. |
| Reproceso y resultado ambiguo | pasó | Timeout ambiguo deduplicado por simulador; reproceso autorizado crea una sola derivada auditada. |
| Commit sin respuesta y cohorte madura | pasó | Replay recuperó el ID confirmado; un pendiente y un fallo originales siguen en la cohorte. |

[Informe JSON](./aceptacion-mw8exzyh-d9b04e3f.json)
