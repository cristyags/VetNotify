# Decisiones de arquitectura

| ADR | Decisión | Motivo y compromiso |
|---|---|---|
| 01 · Cola | Trabajos en PostgreSQL con una transacción de alta | La cola y el registro se confirman juntos. Kafka o Redis añadirían una reconciliación y servicios al laboratorio. El volumen académico permite polling corto con índices. |
| 02 · Canales | Worker y límite de concurrencia por canal | Un timeout HTTP de correo ocupa solo capacidad de su canal. Se comparte imagen y se distinguen procesos. |
| 03 · Idempotencia | PK de alcance y advisory lock PostgreSQL | Serializa clave nueva y reemplazo por TTL. Un caché en memoria perdería el alcance tras reinicio. |
| 04 · Reproceso | Derivada auditada con raíz y padre | Cada ID conserva un máximo de tres intentos. Reiniciar el contador del original diluiría la historia y el SLI. |
| 05 · Nodo | Una VM K3s, namespaces separados y PVC local-path | Ahorra cómputo y permite demostrar reinicios. El sistema queda indisponible al perder la VM. |
| 06 · Identidades | Claves de máquina, sesión revocable y gateway independiente | Cada actor tiene límites diferentes. Las claves viven fuera de las imágenes y la web se puede apagar. |
| 07 · SLO | 95% en 30 s general y 99% en 5 s interna, ventana 15 min | Correo tiene tiempos externos y hasta dos esperas. El canal interno tiene menor variabilidad. La cohorte se mide al madurar. |
| 08 · Azure | México Central, B2as v2, HTTPS en Caddy y operación bajo demanda | Ocho GiB para K3s y el laboratorio. Una IP y un clúster mantienen un costo acotado. Una versión Ubuntu exacta y disponible evita cambios silenciosos. |
| 09 · Interfaz | CSS propio y fuentes locales | La UI usa componentes reutilizables y un bundle autocontenido. Los navegadores de prueba reciben los mismos contratos que los scripts. |
