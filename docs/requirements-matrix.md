# Matriz de requisitos de VetNotify

El PDF define los mínimos académicos. El prompt maestro amplía el alcance del producto y concreta políticas del equipo. La referencia «8.2» de la página 3 apunta al Anexo II, apartado 7.2 (páginas 14–15). Se aplica exclusivamente el Escenario 1. La guía permite una defensa sin interfaz en 5.10. El frontend conectado es un entregable adicional.

**Estados.** Pendiente implica trabajo sin evidencia. Parcial distingue el alcance probado de lo que falta. Verificado requiere una comprobación reproducible. Bloqueado indica una dependencia externa identificada.

| ID | Fuente | Obligación | Componente | Prueba | Evidencia | Estado | Limitación |
|---|---|---|---|---|---|---|---|
| COM-01 | PDF p. 2 | Funciones y reglas del Escenario 1 | — | — | — | Pendiente | Por implementar y ejecutar |
| COM-02 | PDF p. 2 | Límites de componentes y decisiones | — | — | — | Pendiente | Por implementar y ejecutar |
| COM-03 | PDF p. 2 | Persistencia tras reinicio | — | — | — | Pendiente | Por implementar y ejecutar |
| COM-04 | PDF p. 2 | Validación y recuperación de errores | — | — | — | Pendiente | Por implementar y ejecutar |
| COM-05 | PDF p. 2 | Acceso autorizado y rechazo | — | — | — | Pendiente | Por implementar y ejecutar |
| COM-06 | PDF p. 2 | Compromisos de consistencia, disponibilidad, costo y complejidad | — | — | — | Pendiente | Por implementar y ejecutar |
| DEV-01 | PDF p. 2 | Git y PR revisados | — | — | — | Pendiente | Por implementar y ejecutar |
| DEV-02 | PDF p. 2 | Imágenes versionadas y trazables | — | — | — | Pendiente | Por implementar y ejecutar |
| DEV-03 | PDF p. 2 | CI y bloqueo efectivo de checks fallidos | — | — | — | Pendiente | Por implementar y ejecutar |
| DEV-04 | PDF p. 2 | Publicación automática commit–imagen | — | — | — | Pendiente | Por implementar y ejecutar |
| DEV-05 | PDF p. 2 | Entrega aprobada y ambientes separados | — | — | — | Pendiente | Por implementar y ejecutar |
| DEV-06 | PDF p. 2 | Terraform con plan y apply controlado | — | — | — | Pendiente | Por implementar y ejecutar |
| DEV-07 | PDF p. 2 | Estado remoto protegido | — | — | — | Pendiente | Por implementar y ejecutar |
| DEV-08 | PDF p. 2 | Validación y plan en Actions | — | — | — | Pendiente | Por implementar y ejecutar |
| DEV-09 | PDF p. 2 | K3s operativo en Azure | — | — | — | Pendiente | Por implementar y ejecutar |
| DEV-10 | PDF p. 2 | Secretos externos y mínimo privilegio | — | — | — | Pendiente | Por implementar y ejecutar |
| DEV-11 | PDF p. 3 | Probes, recursos y consumo observado | — | — | — | Pendiente | Por implementar y ejecutar |
| DEV-12 | PDF p. 3 | Rollback defectuoso verificado | — | — | — | Pendiente | Por implementar y ejecutar |
| DEV-13 | PDF p. 3 | Reconstrucción documentada | — | — | — | Pendiente | Por implementar y ejecutar |
| DEV-14 | PDF p. 3 | Costo acumulado bajo US$100, cargos, alertas y parada | — | — | — | Pendiente | Por implementar y ejecutar |
| MET-01 | PDF p. 3 | Catálogo de indicadores | — | — | — | Pendiente | Por implementar y ejecutar |
| MET-02 | PDF p. 3 | Logs estructurados y correlación | — | — | — | Pendiente | Por implementar y ejecutar |
| MET-03 | PDF p. 3 | Métricas de aplicación e infraestructura | — | — | — | Pendiente | Por implementar y ejecutar |
| MET-04 | PDF p. 3 | Trazas OpenTelemetry consultables | — | — | — | Pendiente | Por implementar y ejecutar |
| MET-05 | PDF p. 3 | Dashboard de preguntas operativas | — | — | — | Pendiente | Por implementar y ejecutar |
| MET-06 | PDF p. 3 | Dos alertas justificadas y disparo demostrado | — | — | — | Pendiente | Por implementar y ejecutar |
| MET-07 | PDF p. 3 | Análisis de incidente con recuperación | — | — | — | Pendiente | Por implementar y ejecutar |
| ESC1-01 | PDF p. 7–8 | Dos clientes registrados y origen | — | — | — | Pendiente | Por implementar y ejecutar |
| ESC1-02 | PDF p. 7–8 | Autenticación y rechazo de clientes | — | — | — | Pendiente | Por implementar y ejecutar |
| ESC1-03 | PDF p. 7–8 | Destinatario, canal, contenido y clave opcional | — | — | — | Pendiente | Por implementar y ejecutar |
| ESC1-04 | PDF p. 7–8 | Correo verificable e interna persistente | — | — | — | Pendiente | Por implementar y ejecutar |
| ESC1-05 | PDF p. 7–8 | Estados y transiciones | — | — | — | Pendiente | Por implementar y ejecutar |
| ESC1-06 | PDF p. 7–8 | Consulta de estado e intentos | — | — | — | Pendiente | Por implementar y ejecutar |
| ESC1-07 | PDF p. 7–8 | Reintentos transitorios y máximo de tres | — | — | — | Pendiente | Por implementar y ejecutar |
| ESC1-08 | PDF p. 7–8 | Reproceso explícito autorizado | — | — | — | Pendiente | Por implementar y ejecutar |
| ESC1-09 | PDF p. 7–8 | Idempotencia por app, canal y clave ≥24 h | — | — | — | Pendiente | Por implementar y ejecutar |
| ESC1-10 | PDF p. 7–8 | Recuentos y tasas por canal y estado | — | — | — | Pendiente | Por implementar y ejecutar |
| P1-1 | PDF p. 8 | 100 solicitudes válidas conservadas y consultadas | — | — | — | Pendiente | Por implementar y ejecutar |
| P1-2 | PDF p. 8 | Correo degradado y continuidad interna | — | — | — | Pendiente | Por implementar y ejecutar |
| P1-3 | PDF p. 8 | Cinco repeticiones secuenciales y concurrentes, un trabajo | — | — | — | Pendiente | Por implementar y ejecutar |
| P1-4 | PDF p. 8 | Reinicio del procesador con trabajos pendientes | — | — | — | Pendiente | Por implementar y ejecutar |
| P1-5 | PDF p. 8 | Correlación de extremo a extremo y alerta | — | — | — | Pendiente | Por implementar y ejecutar |
| 5.1 | PDF p. 5 | Aceptación durable y definición de pérdida | — | — | — | Pendiente | Por implementar y ejecutar |
| 5.2 | PDF p. 5 | Consistencia, tiempos, resultados ambiguos | — | — | — | Pendiente | Por implementar y ejecutar |
| 5.3 | PDF p. 5 | Datos ficticios, TLS, controles y secretos | — | — | — | Pendiente | Por implementar y ejecutar |
| 5.4 | PDF p. 6 | Validación y producción aisladas | — | — | — | Pendiente | Por implementar y ejecutar |
| 5.5 | PDF p. 6 | K3s en VM Azure con persistencia | — | — | — | Pendiente | Por implementar y ejecutar |
| 5.6 | PDF p. 6 | Terraform, bootstrap y estado remoto protegido | — | — | — | Pendiente | Por implementar y ejecutar |
| 5.7 | PDF p. 6 | CI, publicación, despliegue y rollback | — | — | — | Pendiente | Por implementar y ejecutar |
| 5.8 | PDF p. 6 | Pruebas reproducibles y falla controlada | — | — | — | Pendiente | Por implementar y ejecutar |
| 5.9 | PDF p. 6 | Costo acumulado y disponibilidad bajo demanda | — | — | — | Pendiente | Por implementar y ejecutar |
| 5.10 | PDF p. 6 | Demostración por API y scripts | — | — | — | Pendiente | Por implementar y ejecutar |
| 5.11 | PDF p. 6 | Incidente, hipótesis, señales, respuesta y recuperación | — | — | — | Pendiente | Por implementar y ejecutar |
| 5.12 | PDF p. 6 | Ejercicios reversibles durante defensa | — | — | — | Pendiente | Por implementar y ejecutar |
| 5.13 | PDF p. 7 | Pruebas comunes, trazabilidad, IaC, rollback e incidente | — | — | — | Pendiente | Por implementar y ejecutar |
| AII-01 | PDF p. 14 | Tres preguntas operativas y decisiones | — | — | — | Pendiente | Por implementar y ejecutar |
| AII-02 | PDF p. 14 | Tres SLIs, dos SLOs y presupuesto de error | — | — | — | Pendiente | Por implementar y ejecutar |
| AII-03 | PDF p. 14 | Logs estructurados y sanitizados | — | — | — | Pendiente | Por implementar y ejecutar |
| AII-04 | PDF p. 14 | Cuatro métricas de app y capacidad | — | — | — | Pendiente | Por implementar y ejecutar |
| AII-05 | PDF p. 14 | Trazas con dos etapas y contexto | — | — | — | Pendiente | Por implementar y ejecutar |
| AII-06 | PDF p. 15 | Seis paneles funcionales | — | — | — | Pendiente | Por implementar y ejecutar |
| AII-07 | PDF p. 15 | Dos alertas y retorno normal | — | — | — | Pendiente | Por implementar y ejecutar |
| AII-08 | PDF p. 15 | Experimento reversible con comparación | — | — | — | Pendiente | Por implementar y ejecutar |
| AII-09 | PDF p. 15 | Instrumentación y configuración reproducibles | — | — | — | Pendiente | Por implementar y ejecutar |
| RG-DEV-01 | PDF p. 13 | Funcionalidad y arquitectura (15) | — | — | — | Pendiente | Por implementar y ejecutar |
| RG-DEV-02 | PDF p. 13 | Contenedores e integración continua (15) | — | — | — | Pendiente | Por implementar y ejecutar |
| RG-DEV-03 | PDF p. 13 | Infraestructura con Terraform (20) | — | — | — | Pendiente | Por implementar y ejecutar |
| RG-DEV-04 | PDF p. 13 | Kubernetes y operación (20) | — | — | — | Pendiente | Por implementar y ejecutar |
| RG-DEV-05 | PDF p. 13 | Entrega continua y recuperación (20) | — | — | — | Pendiente | Por implementar y ejecutar |
| RG-DEV-06 | PDF p. 13 | Reproducibilidad, seguridad y costos (10) | — | — | — | Pendiente | Por implementar y ejecutar |
| RG-MET-01 | PDF p. 15 | Objetivos, SLIs, SLOs y presupuestos (20) | — | — | — | Pendiente | Por implementar y ejecutar |
| RG-MET-02 | PDF p. 15 | Logging estructurado y correlación (15) | — | — | — | Pendiente | Por implementar y ejecutar |
| RG-MET-03 | PDF p. 15 | Métricas e interpretación (20) | — | — | — | Pendiente | Por implementar y ejecutar |
| RG-MET-04 | PDF p. 15 | Trazas distribuidas (15) | — | — | — | Pendiente | Por implementar y ejecutar |
| RG-MET-05 | PDF p. 15 | Dashboards y alertas (15) | — | — | — | Pendiente | Por implementar y ejecutar |
| RG-MET-06 | PDF p. 15 | Incidente y reproducibilidad (15) | — | — | — | Pendiente | Por implementar y ejecutar |
| USR-01 | Usuario y maestro §18.1 | Ejecutar la demostración con web realmente detenida y restituirla | — | — | — | Pendiente | Por ejecutar en local y Azure |
| USR-02 | Usuario y maestro §11, §18.2 | Frontend operativo conectado al mismo backend y dos emisores auténticos | — | — | — | Pendiente | Por ejecutar en navegador |
| USR-03 | Maestro §19, PDF p. 1 | Documentación, diagramas, presentación editable y PDF | — | — | — | Pendiente | Por preparar con evidencia |
