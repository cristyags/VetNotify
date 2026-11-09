# Incidente reproducible de correo

## Hipótesis

Un 503 sostenido del proveedor de correo aumenta intentos y fallos finales del canal. Las aceptaciones se conservan y la bandeja interna puede entregar mientras ocurre el fallo.

## Corrida Compose

Ejecución `aceptacion-mw8f14b7-4091d0c5` del 8 de noviembre de 2026. El comando `npm run verify-no-frontend` detuvo la web, validó la API por el mismo gateway y ejecutó P1-5 junto al resto de la suite. [Informe de ejecución](evidence/aceptacion-mw8f14b7-4091d0c5.json).

| UTC | Evidencia |
|---|---|
| 22:41:14 | Se capturó línea base y se activó `always_503` en un perfil aislado |
| 22:41:27 | La proporción de fallos superó el umbral y Prometheus registró `activeAt` |
| 22:41:47 | La regla llegó a `firing`. La serie de 2 min mostró 30 fallos sobre 86 finales (34.9%) |
| 22:41:47 | El script restauró el modo sano. Una solicitud nueva obtuvo recibo y terminó entregada |
| 22:43:35 | Prometheus ya no mostró la alerta. Los fallos antiguos salieron de la ventana de 2 min |

La cohorte inducida contiene 24 correos originales. Cada uno tuvo tres intentos y terminó fallido. La métrica de 2 min incluyó otros envíos recientes del laboratorio. El aviso interno `bandeja` enviado durante el fallo terminó entregado antes de que el primer correo agotara sus intentos. Una derivada posterior entregó y el original siguió fallido.

## Correlación y causa

La notificación `a5a76082-261f-4b20-9978-12b85b0edd77` usa correlación `6baf0cec-1285-4925-88f1-c5f611ff2175` y traza `ef1ca19b581b53a9d5db7ec59a9d162e`. Jaeger devolvió 10 spans entre API, worker correo y simulador. El span de aceptación termina tras el commit. Los spans de los intentos aparecen después, separados por las esperas persistidas de 2 y 4 s.

`provider_http_503` coincide en los tres intentos y las tres llamadas del simulador. El patrón se limitó al perfil de correo que se activó. La restauración cambió el comportamiento para nuevas solicitudes. Los fallos previos se conservan para el análisis. [Trazas y dashboard](evidence/signals-local/).

## Interpretación y límites

La regla exige al menos diez resultados finales, más de 20% de fallos en dos minutos y 15 s de persistencia. Una carga de rechazos permanentes también podría activarla. La clasificación de intentos permite distinguir esa causa. Una proporción que mejora porque expira la ventana se contrasta con la entrega posterior y el estado sano del simulador. La muestra de laboratorio permite probar la separación de canales y el diagnóstico. Los SLO empresariales requieren ventanas y carga de producción representativas.

Para repetir, ejecuta `npm run incident` en validación con el entorno y las credenciales correspondientes. El script restaura el perfil en `finally`, captura tres ventanas comparables y termina con un código distinto de cero si falta una evidencia.

## Repetición en Azure

La corrida de K3s `aceptacion-mw8g1kj5-17ae99dd` registró la misma degradación. En la ventana de dos minutos había 6 fallos de correo sobre 61 resultados antes, 30 sobre 86 durante y 0 sobre 1 después. Prometheus observó el cambio de estado de la alerta con 34.9%. Los 24 correos del perfil fallaron tras tres llamadas y el aviso interno se entregó. El script restauró el proveedor a las 23:10:15 UTC y observó la resolución a las 23:12:00 UTC.

La traza `e49af2fd51ff8f1334559702a51bad81` contiene 10 spans en tres servicios. El informe preserva intentos, llamadas, transiciones, correlación, derivada y los snapshots de métricas. [P1-5 en Azure](evidence/aceptacion-mw8g1kj5-17ae99dd.json).

En el candidato de GHCR `92e5a9af8cfd`, el incidente empezó a las 23:50:22 UTC. La regla registró su condición a las 23:50:32 UTC. Prometheus observó 6 fallos sobre 61 finales antes, 25 sobre 34 durante (`73.5%`) y 0 sobre 1 después. Se restauró el modo sano a las 23:50:50 UTC y la alerta regresó a normal a las 23:52:35 UTC. La traza `65e6a42b8be4e9d6b3b6eabb3bde9607` tuvo 10 spans. Esta prueba se ejecutó junto con los otros casos P1, con web y adaptadores a cero. [Informe del candidato](evidence/aceptacion-mw8hgv1s-61a37292.json).

Con `e1132db` activé el 503 a las 04:18:54 UTC, observé `firing` con una proporción de fallos de `64.1%`, restauré el simulador a las 04:19:25 UTC y comprobé el retorno a normal a las 04:21:10 UTC. Los 24 correos del perfil agotaron tres intentos. El aviso interno y un correo posterior se entregaron. Grafana consultó la traza `8bdf9a239dcca4ff34672844f6a4aabe` y Jaeger la conservó tras reiniciar. [Incidente de main](evidence/qa-main/aceptacion-mw8r2bq4-51ea7b58.json) · [Dashboard y traza](evidence/qa-main/senales-mw8r9iyy-83033550.json).
