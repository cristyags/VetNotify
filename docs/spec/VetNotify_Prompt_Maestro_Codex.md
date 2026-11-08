# PROMPT MAESTRO PARA CODEX — VETNOTIFY

## 0. Encargo, autonomía y resultado final

Actúa como ingeniero responsable del desarrollo, arquitectura, QA, DevOps, observabilidad y documentación de **VetNotify**, un proyecto académico integrador de **DevOps y Métricas de Software**, cuyo tema oficial es **Notificaciones multicanal**. Construye una solución funcional desde cero y llévala hasta su despliegue, verificación y entrega, dentro de los accesos efectivamente disponibles.

El usuario ha elegido expresamente:

1. Contexto veterinario: una clínica ficticia con aplicaciones de Agenda y Laboratorio.
2. Un backend completo que pueda utilizarse y demostrarse sin frontend.
3. Un frontend hermoso, profesional y completamente funcional, conectado al mismo backend. Construirlo es parte de este encargo; encenderlo o mostrarlo durante la defensa es opcional.
4. Dos recorridos de demostración del mismo sistema: uno por API y scripts, otro visual.
5. Ejecución real en K3s sobre máquinas virtuales de Microsoft Azure, con Terraform, GitHub Actions y observabilidad.
6. Uso de las herramientas autorizadas disponibles en su computadora, terminal, navegador Chrome, GitHub y Azure para realizar el trabajo.

**No te limites a proponer una arquitectura, generar un esqueleto o entregar archivos sin probarlos. Implementa, ejecuta, corrige y verifica.** Un resultado se considera terminado por sus comprobaciones y evidencias, no por la cantidad de código.

Inspecciona las capacidades y sesiones realmente disponibles. Lee AGENTS.md y las instrucciones pertinentes del directorio/repositorio antes de modificarlo. Prefiere CLI, APIs oficiales y herramientas de propósito específico; usa el navegador o control de computadora para operaciones que lo requieran, siguiendo sus instrucciones. El acceso que el usuario menciona no equivale a que todas las herramientas estén conectadas: compruébalo.

Avanza autónomamente con las acciones ordinarias autorizadas del proyecto. Respeta las políticas y aprobaciones obligatorias de las herramientas y las aprobaciones de CI/CD que exige la guía. Si falta MFA, una credencial, un permiso o una decisión de titularidad/visibilidad/pago, prepara primero todo lo posible y pide únicamente la intervención concreta necesaria; indica qué falta, dónde y qué paso bloquea. Continúa las tareas independientes.

Trabaja en un directorio y recursos identificados para VetNotify. Conserva el trabajo previo y los recursos ajenos. No sobrescribas otros proyectos, no cambies de suscripción a ciegas ni conviertas un repositorio privado en público por conveniencia. El presupuesto Azure autorizado por la guía es de **US$100 acumulados por equipo**; no autoriza contratar planes adicionales, enviar mensajes reales ni modificar sistemas de la clínica.

Mantén progreso y decisiones en docs/STATUS.md: completado, verificado, pendiente, bloqueos reales, comandos relevantes y siguiente paso. Actualízalo al terminar cada etapa y antes de agotar contexto. Retoma desde allí sin reiniciar el proyecto ni perder requisitos. Comunica avances breves con resultados comprobados.

## 1. Fuente académica y alcance de aplicación

La fuente es el PDF adjunto **Proyecto de Cátedra (1).pdf**, de 16 páginas. Léelo completo si está disponible en la conversación o el directorio de trabajo y contrástalo con este encargo. Localízalo de forma acotada por nombre; no explores información personal ajena. Conserva una copia en docs/spec/ si está disponible y se puede incorporar al repositorio autorizado.

Aplican:

- Propósito y condiciones de trabajo: página 1.
- COM-01 a COM-06, DEV-01 a DEV-14 y MET-01 a MET-07: páginas 2–3.
- Kubernetes y dimensionamiento: páginas 4–5.
- Condiciones generales 5.1 a 5.13: páginas 5–7.
- Escenario 1, ESC1-01 a ESC1-10 y pruebas P1-1 a P1-5: páginas 7–8.
- Evaluación y defensa: páginas 13–16.
- Anexo II de Métricas: páginas 14–15; preguntas sugeridas: página 16.

El documento contiene una errata: la referencia a Anexo II como sección 8.2 corresponde al apartado **7.2**. Sus mínimos de medición prevalecen sobre el resumen MET.

Implementa solamente el Escenario 1. Los umbrales de documentos, eventos, búsqueda y colaboración pertenecen a otros escenarios y no se agregan a VetNotify. En particular, aquí no se exigen dos réplicas del componente colaborativo, 2,000 documentos ni 2,400 eventos.

El apartado 5.10 permite demostrar los escenarios 1 y 3 mediante API y scripts. Esto fundamenta la independencia del frontend. El usuario solicita además una interfaz terminada; esa adición no sustituye ningún requisito académico.

Usa únicamente cuentas y datos ficticios. Quedan fuera SMS de pago, campañas comerciales y correo masivo real. Tampoco construyas un ERP veterinario: no se necesitan diagnósticos, recetas, expedientes clínicos, inventarios, facturación, pagos, IA clínica ni integraciones con TuVet real.

Si el PDF no está disponible, comienza con los requisitos completos transcritos aquí y registra la falta del contraste directo. Si aparece una discrepancia material, documenta la referencia y conserva el requisito académico más preciso; no reduzcas el alcance silenciosamente.

## 2. Producto y dos aplicaciones cliente auténticas

Nombre: **VetNotify**. Subtítulo: **Notificaciones multicanal para operaciones veterinarias**.

Problema: Agenda y Laboratorio generan avisos independientes a responsables de mascotas. VetNotify centraliza la recepción, entrega, consulta y diagnóstico de esos avisos.

### 2.1 Agenda veterinaria

Identidad estable sugerida: agenda-veterinaria.

Eventos mínimos:

- Cita confirmada.
- Cita reprogramada.
- Cita cancelada.

Ejemplo ficticio: «La cita de Luna fue confirmada para el horario indicado».

### 2.2 Laboratorio veterinario

Identidad estable sugerida: laboratorio-veterinario.

Eventos mínimos:

- Muestra recibida.
- Resultado ficticio disponible.

Ejemplo: «El resultado del servicio de laboratorio de Max está disponible».

El contenido informa estados del servicio; no incluye datos médicos reales ni recomendaciones clínicas.

### 2.3 Implementación de los clientes

Entrega dos ejecutables independientes en clients/agenda/ y clients/laboratorio/, con configuración, identidad y credencial propias. Pueden compartir un SDK HTTP pequeño. Cada uno tendrá un comando de consola y un adaptador HTTP mínimo para las acciones visuales.

Para la demostración visual, despliega dos instancias ligeras del emisor, cada una configurada con su identidad. Pueden usar la misma imagen y diferente configuración. Las acciones de Agenda deben pasar por el emisor Agenda; las de Laboratorio, por el emisor Laboratorio. Ambos realizan solicitudes HTTP auténticas a la API central con sus credenciales de máquina del lado del servidor.

El frontend no recibe ni almacena esas claves. Protege los endpoints de demostración con autenticación humana y autorización de operador. Verifica la sesión mediante el mecanismo servidor elegido; no confíes en un encabezado de rol suministrado por el navegador. Usa rutas fijas y destinos internos permitidos, sin proxy abierto ni URL arbitraria.

Los scripts de consola deben funcionar aunque los adaptadores HTTP y el frontend estén apagados. En la evidencia debe verse que las dos credenciales producen orígenes distintos. Un desplegable que envíe un app_id arbitrario no demuestra dos aplicaciones.

### 2.4 Roles humanos

- Operador: consultar el conjunto de notificaciones, investigar intentos, activar eventos de demostración y reprocesar fallos con permiso.
- Destinatario: consultar solamente sus notificaciones internas.
- Administrador técnico: administrar clientes/configuración y los mecanismos de prueba autorizados. Puede compartir cuenta con el operador en la demo si el modelo de permisos queda explícito y probado.

Las cuentas humanas son distintas de las identidades de las aplicaciones cliente. Las comprobaciones por API también deben poder autenticarse como operador y destinatario sin usar el navegador.

## 3. Matriz obligatoria de cumplimiento

Crea docs/requirements-matrix.md antes de implementar y mantenlo actualizado. Cada fila tendrá ID, fuente/página, obligación, componente/archivo real, prueba/comando, evidencia real, estado y limitación si existe. Usa «pendiente» cuando corresponda. No marques cumplido algo por existir un archivo YAML.

### 3.1 Aplicación y arquitectura

| ID | Obligación a demostrar |
|---|---|
| COM-01 | Funciones y reglas del Escenario 1 con pruebas de aceptación ejecutables. |
| COM-02 | Límites y responsabilidades, diagrama de arquitectura implementada y decisiones justificadas. |
| COM-03 | Persistencia de información exigida ante reinicio de componentes. |
| COM-04 | Validaciones y manejo de errores; pruebas positivas, negativas y de recuperación. |
| COM-05 | Acceso autorizado y rechazo de identidades sin permisos. |
| COM-06 | Compromisos de consistencia, disponibilidad, costo y complejidad, con alternativas descartadas. |

### 3.2 DevOps

| ID | Obligación a demostrar |
|---|---|
| DEV-01 | Aplicación, infraestructura y configuración no secreta en Git; PR revisados realmente. |
| DEV-02 | Ejecutables en imágenes de contenedor versionadas y trazables. |
| DEV-03 | GitHub Actions en PR y protección de rama efectiva que bloquee checks fallidos. |
| DEV-04 | Construcción y publicación automatizadas; relación commit–workflow–imagen. |
| DEV-05 | Entrega controlada con aprobaciones y separación lógica de validación/producción. |
| DEV-06 | Recursos principales de Azure definidos con Terraform; plan revisable y apply controlado. |
| DEV-07 | Estado remoto Terraform protegido e inicialización documentada. |
| DEV-08 | Validación y plan de Terraform en Actions; ningún apply automático de PR no aprobado. |
| DEV-09 | K3s instalado y operado en una o más VM de Azure. |
| DEV-10 | Configuración y secretos fuera de imágenes; permisos mínimos demostrables. |
| DEV-11 | Probes, requests y límites apropiados, justificados con consumo observado. |
| DEV-12 | Recuperación verificada tras un despliegue defectuoso. |
| DEV-13 | Reconstrucción documentada desde una suscripción autorizada, con prerrequisitos explícitos. |
| DEV-14 | Estimación, cargos observados, alertas y parada/eliminación; máximo US$100 acumulados. |

### 3.3 Métricas y observabilidad

| ID | Obligación a demostrar |
|---|---|
| MET-01 | Catálogo de indicadores: definición, unidad, fuente, cálculo y propósito. |
| MET-02 | Logs estructurados correlacionables de operaciones, transiciones y fallos. |
| MET-03 | Métricas de aplicación y su relación con infraestructura; consultas y series verificables. |
| MET-04 | Trazas OpenTelemetry consultables y correlación entre componentes/etapas. |
| MET-05 | Dashboard que responda preguntas operativas, con unidades y ventanas. |
| MET-06 | Alertas justificadas, activación demostrada y posibles falsos positivos. |
| MET-07 | Análisis de una degradación inducida y de su recuperación con evidencia temporal. |

### 3.4 Escenario de notificaciones

| ID | Obligación a demostrar |
|---|---|
| ESC1-01 | Al menos dos aplicaciones cliente registradas; origen identificable en cada solicitud. |
| ESC1-02 | Autenticación de aplicaciones y rechazo de clientes no autorizados. |
| ESC1-03 | Destinatario, canal, contenido y clave opcional de idempotencia. |
| ESC1-04 | Correo de prueba y notificación interna persistente consultable por destinatario. |
| ESC1-05 | Estados y transiciones: aceptada, pendiente, en proceso, entregada o fallida. |
| ESC1-06 | Consulta del estado e historial de intentos. |
| ESC1-07 | Reintentos de fallos transitorios con máximo configurable; no automáticos ante permanentes. |
| ESC1-08 | Reprocesamiento explícito y autorizado de una notificación fallida. |
| ESC1-09 | Una misma clave dentro de su alcance no crea nuevos trabajos de entrega. |
| ESC1-10 | Recuentos y tasas por canal y estado. |

Añade filas separadas para P1-1 a P1-5, condiciones 5.1 a 5.13, los nueve puntos mínimos del Anexo II y la exigencia del usuario de demostrar independencia del frontend. Vincula también cada criterio de las rúbricas grupales con evidencia.

## 4. Arquitectura y tecnologías de partida

Construye un monorepositorio pequeño y modular. Pila preferida:

- Node.js en versión LTS soportada al iniciar; TypeScript estricto.
- Fastify para API y emisores pequeños, validación de esquema y logs JSON.
- PostgreSQL como fuente de datos y cola durable de trabajos.
- Acceso SQL con pg y migraciones explícitas/versionadas mediante una herramienta pequeña mantenida.
- React, Vite y TypeScript para el frontend; Tailwind CSS y un conjunto coherente de iconos SVG.
- Pruebas unitarias/integración con Vitest y pruebas reales de navegador con Playwright o herramienta equivalente disponible.
- OpenTelemetry SDK y Collector.
- Prometheus y Grafana.
- Jaeger 2 en configuración de una instancia con Badger persistente y PVC para las trazas. Verifica la configuración oficial de la versión elegida y su integración con Grafana.
- Docker Compose para desarrollo local; Terraform y manifiestos K3s para Azure.

Estas son decisiones de diseño propuestas, no tecnologías impuestas por el profesor. Puedes realizar una sustitución acotada por incompatibilidad comprobada o una ventaja clara, registrándola en un ADR y manteniendo todas las capacidades. No agregues Redis, RabbitMQ, Kafka, Elasticsearch, varios clústeres o servicios administrados costosos sin una necesidad demostrable.

Fija versiones compatibles en lockfiles, imágenes, acciones y documentación. Verifica documentación primaria actual. No uses etiquetas flotantes latest para las imágenes desplegadas. Registra las versiones efectivamente utilizadas en docs/versions.md.

Componentes de ejecución:

1. API central.
2. Worker de correo.
3. Worker de notificaciones internas.
4. PostgreSQL.
5. Simulador de correo.
6. Emisor Agenda y emisor Laboratorio, pequeños y configurados por separado.
7. Frontend independiente y prescindible para la operación del núcleo.
8. Observabilidad, dimensionada para el laboratorio.

Los dos workers pueden usar la misma imagen y diferente comando/configuración. Aíslan concurrencia y tiempos de espera por canal. No implementes un bucle único en el que un timeout de correo paralice la entrega interna.

Toda lógica de validación, permisos, estados, idempotencia y reintentos pertenece al servidor. La UI consume contratos; no puede ser la única implementación de ninguna regla.

La entrada a /api, autenticación y emisores debe depender de un Ingress/proxy independiente del contenedor frontend. No uses el servidor estático de React como único proxy obligatorio hacia el backend: apagar la web debe dejar accesibles las rutas HTTP del núcleo por las mismas URLs documentadas.

Estructura orientativa:

~~~text
apps/api/
apps/worker/
apps/email-simulator/
apps/web/
clients/agenda/
clients/laboratorio/
packages/contracts/
packages/client-sdk/
packages/db/
packages/telemetry/
infra/terraform/bootstrap/
infra/terraform/main/
infra/k8s/base/
infra/k8s/overlays/dev/
infra/k8s/overlays/prod/
infra/observability/
scripts/
tests/unit/
tests/integration/
tests/acceptance/
tests/e2e/
docs/
docs/adr/
docs/evidence/
slides/
.github/workflows/
~~~

Evita separar paquetes sin utilidad concreta. La estructura final debe coincidir con el código, comandos y diagramas.

## 5. Persistencia y aceptación durable

Diseña un modelo con entidades equivalentes a:

- Aplicaciones cliente y credenciales verificables/rotables.
- Usuarios, permisos y destinatarios ficticios.
- Datos mínimos ficticios de mascotas/citas/servicios para la demostración.
- Notificaciones.
- Registro de idempotencia.
- Trabajos de entrega.
- Intentos de entrega.
- Historial de transiciones.
- Bandeja interna.
- Auditoría de acciones administrativas y reprocesos.
- Aceptaciones y fallos del simulador de correo.

Cada notificación debe conservar al menos identidad, aplicación autenticada, destinatario, canal, contenido, contexto del evento, accepted_at, estado, tiempos de transición, correlación y relación con su trabajo.

Registra en una transacción la notificación, su aceptación, el trabajo pendiente, la información de idempotencia cuando exista y las transiciones iniciales. Solo devuelve aceptación después del commit.

Puede registrarse el evento accepted y dejar el estado actual pending dentro de esa misma transacción. El historial debe mostrar ambos conceptos; no es necesario introducir retrasos artificiales para que se vean en pantalla.

Responde a una creación nueva con HTTP 202 y un identificador/Location consultable. Una respuesta exitosa de recepción no declara entrega. Si no se puede guardar durablemente, responde un error y no un falso accepted.

No dependas de memoria de proceso, temporizadores del navegador o una tarea en background no persistida para conservar trabajos. Una operación aceptada debe sobrevivir a reinicios de API, workers y Pod de base de datos.

Usa migraciones versionadas e índices para reclamación de trabajos, estado, canal, origen, destinatario y fechas. Configura PostgreSQL con sus garantías normales de durabilidad; no desactives fsync o confirmación durable para mejorar una demo.

Conserva registros históricos y usa run_id para identificar ejecuciones. No borres datos para hacer coincidir resultados. Un reinicio y una restauración de toda la VM son fallos distintos: documenta el alcance real de la persistencia.

## 6. Contrato HTTP, autenticación y autorización

Publica una especificación OpenAPI completa y ejemplos ejecutables. Incluye esquemas, restricciones, autenticación, códigos de respuesta, paginación y ejemplos de error. El JSON de OpenAPI y las herramientas de consola deben ser utilizables aunque el frontend no exista.

Contrato sugerido, ajustable manteniendo capacidades:

| Operación | Permiso/comportamiento |
|---|---|
| POST /api/v1/notifications | Aplicación cliente autenticada; aceptación durable. |
| GET /api/v1/notifications/{id} | Cliente propietario u operador autorizado; el destinatario usa sus rutas restringidas. |
| GET /api/v1/notifications/{id}/attempts | Historial autorizado, paginado cuando proceda. |
| GET /api/v1/notifications/{id}/transitions | Historial de estados autorizado. |
| GET /api/v1/notifications | Filtros, orden estable y paginación; alcance por identidad. |
| POST /api/v1/notifications/{id}/reprocess | Operador con permiso; auditoría e idempotencia de la acción. |
| GET /api/v1/me/inbox | Notificaciones internas del destinatario autenticado. |
| GET /api/v1/me/inbox/{id} | Solo su contenido autorizado. |
| PATCH /api/v1/me/inbox/{id}/read | Opcional; lectura separada de entrega. |
| GET /api/v1/stats | Recuentos y tasas con filtros y definiciones explícitas. |
| GET /api/v1/applications | Operador; identidades y estado, nunca claves completas. |
| POST /api/v1/auth/login y logout | Sesión humana de demo protegida y automatizable. |
| GET /api/v1/auth/me | Identidad y permisos efectivos. |
| GET /health/live y /health/ready | Salud mínima, sin secretos; exposición apropiada. |
| GET /api/v1/version | Versión, commit e imagen/release sin información secreta. |
| GET /metrics | Acceso de recolección interno o restringido. |

Para los emisores, usa claves de alta entropía y una verificación segura. Almacena su representación verificable, no claves en texto plano dentro de la base cuando pueda evitarse. Las claves de los emisores se inyectan mediante secretos del entorno y nunca mediante variables públicas de Vite.

La aplicación de origen se deriva de la credencial, no de un app_id confiado al usuario. Si la petición incluye un identificador de aplicación inconsistente, recházala. Cada aplicación solo consulta sus propias notificaciones salvo permiso explícito documentado.

Para usuarios humanos, usa un mecanismo pequeño, mantenido y defendible: contraseñas protegidas con una función adecuada, sesiones revocables y cookies HttpOnly/Secure en HTTPS, o una alternativa documentada. Protege las operaciones con cookie contra CSRF y valida origen. Proporciona flujo equivalente de login/cookie jar o token para scripts sin navegador. No dependas de un proveedor de identidad externo de pago.

Valida destinatario, canal permitido, asunto/texto, longitudes, metadata acotada y formatos. Conserva el detalle útil de errores sin filtrar tokens, contraseñas, cuerpos sensibles ni stack traces internos al cliente.

Usa de forma coherente 400/422 para entradas inválidas, 401 para ausencia o invalidez de autenticación, 403 para permiso insuficiente, 404 cuando corresponda no revelar un recurso ajeno, 409 para conflicto de idempotencia/estado y 503 para indisponibilidad temporal de recepción durable. Documenta y prueba la decisión.

Una dirección de formato inválido se rechaza antes de aceptación. Para demostrar un fallo permanente del proveedor, usa una dirección ficticia sintácticamente válida que el simulador rechace tras aceptar la API la solicitud.

Una solicitud corresponde a un canal. La UI puede ofrecer «ambos canales», pero debe emitir dos solicitudes distintas y mostrar sus dos identificadores. La idempotencia continúa siendo por aplicación, canal y clave.

Todos los ejemplos usan direcciones reservadas para pruebas y datos sintéticos. El simulador no debe enviar a servicios reales ni aceptar una URL de destino arbitraria.

## 7. Idempotencia con concurrencia real

Implementa el alcance exacto **aplicación cliente autenticada + canal + clave**. La clave es opcional.

- TTL predeterminado: al menos 86,400 segundos desde la primera aceptación.
- Una repetición no extiende ese inicio ni crea otro trabajo.
- Mismos datos efectivos: devuelve el identificador original y una indicación de replay.
- Misma clave/alcance con destinatario o contenido efectivo diferente: HTTP 409 y ningún trabajo adicional.
- Sin clave: cada solicitud válida nueva es una nueva notificación.
- Misma clave en otra aplicación o canal: espacio independiente.

Define una canonicalización y huella del payload efectivo. Incluye destinatario, contenido y metadatos de negocio que alteren el envío; excluye únicamente campos de transporte documentados que no cambian su efecto. No uses el orden incidental de propiedades JSON como criterio de diferencia.

Garantiza la decisión en PostgreSQL mediante unicidad y transacciones/bloqueos apropiados. Un SELECT seguido de INSERT sin protección de carrera no es suficiente. Maneja el conflicto concurrente sin devolver 500 a una repetición idéntica válida.

No implementes el TTL únicamente mediante un proceso de limpieza. La consulta/reclamación debe reconocer el vencimiento de manera atómica. Documenta qué ocurre después de vencer; conserva la protección si el trabajo original sigue activo. El vencimiento de una clave no autoriza borrar la notificación ni su historial.

Prueba una clave completamente nueva con solicitudes que comiencen simultáneamente, además de replays de una ya conocida. Verifica filas/trabajos, referencias e intentos; contar respuestas HTTP no basta.

La verificación de expiración puede usar un TTL menor en un entorno de prueba aislado, tal como permite el PDF. Conserva y comprueba el valor por defecto de 24 horas. No agregues una API pública para alterar el reloj o la política de producción.

## 8. Procesamiento, estados, errores y recuperación

Estados canónicos sugeridos: accepted, pending, processing, delivered, failed; etiquetas visibles en español.

Transiciones normales:

- accepted → pending → processing → delivered.
- processing → pending, con próximo intento persistido, ante fallo transitorio con cupo.
- processing → failed ante permanente o agotamiento.

Cada cambio significativo se guarda con fecha, razón, actor/componente y correlación. No sobrescribas ni borres intentos anteriores.

### 8.1 Reclamación de trabajos

Usa una cola durable en PostgreSQL. Reclama trabajos con una operación atómica, por ejemplo bloqueos de filas y SKIP LOCKED, dentro de transacciones cortas. No mantengas una transacción abierta durante una llamada al proveedor.

Registra propietario/token de lease, vencimiento y número de intento antes del envío. Configura un lease superior al timeout de la dependencia más margen para persistir el resultado; implementa renovación si la duración real lo requiere. El resultado solo lo aplica el propietario vigente mediante actualización condicionada.

Recupera trabajos abandonados al vencer el lease. Registra la incertidumbre del intento interrumpido; conserva el contador y respeta el máximo. No dejes trabajos eternamente processing ni permitas que un worker antiguo sobrescriba un resultado más reciente.

### 8.2 Política automática

Configuración inicial de diseño:

- Máximo: **3 intentos totales por notification_id**, uno inicial y dos reintentos.
- Timeout del proveedor: 2 segundos, configurable.
- Esperas entre reintentos: 2 y 4 segundos, configurables y documentadas.
- Concurrencia acotada por canal.

Estos tiempos son decisiones iniciales del proyecto; el PDF exige documentar la espera y respetar el máximo evaluado, no prescribe esos segundos.

Clasifica 503 y timeouts reproducibles como temporales. Clasifica el rechazo permanente de destinatario del simulador como permanente. Documenta el tratamiento de otros errores y evita reintentar indiscriminadamente todos los 4xx/5xx.

Guarda next_attempt_at y contador; no uses un sleep que se pierde con el proceso. El estado debe continuar siendo consultable durante la espera.

Desactiva reintentos internos ocultos de la biblioteca HTTP y redirecciones de peticiones autenticadas hacia destinos no autorizados. El timeout debe acotar la operación completa, incluida la lectura de respuesta. Cancelar la espera local no demuestra que el proveedor canceló su efecto.

### 8.3 Canal interno

Inserta la notificación en la bandeja persistente y registra su entrega en una transacción coherente. Usa unicidad por notificación para impedir duplicados del efecto interno. Un toast, un mensaje WebSocket o localStorage no constituyen entrega persistente.

El destinatario solo consulta su propia bandeja. La condición leído/no leído, si se agrega, es distinta del estado delivered.

### 8.4 Correo de prueba y resultado ambiguo

Correo delivered significa aceptación verificable del simulador/proveedor, con recibo o identificador persistente. No significa lectura.

Si el proveedor acepta y se pierde la respuesta, la API idempotente de entrada no elimina por sí sola el riesgo de un efecto externo duplicado. Documenta ese límite. El simulador puede admitir una clave estable de entrega y devolver el mismo recibo en reintentos: identifica esa garantía como capacidad del simulador, no como propiedad universal del sistema.

Si habilitas esa deduplicación, usa una clave derivada del notification_id y del entorno, estable durante sus hasta tres intentos. No uses attempt_id ni reutilices la Idempotency-Key de entrada: una notificación nueva después del TTL o una derivada manual debe tener una clave de entrega distinta.

Registra intentos inciertos y su relación con la recuperación. No declares exactamente una entrega externa en todos los fallos.

### 8.5 Reprocesamiento manual

Implementa la política del apartado siguiente conservando todos los registros y un límite claro. La recuperación automática y una orden manual autorizada deben distinguirse en datos, métricas y auditoría.

## 9. Política explícita de reprocesamiento

El PDF exige máximo de tres intentos totales por notificación y también reprocesar una fallida; no prescribe la identidad técnica del reproceso. Para mantener literalmente ese límite, adopta esta decisión de diseño y explícalo en un ADR:

1. Una orden autorizada sobre una notificación fallida crea **una notificación derivada**, con nuevo ID, parent_notification_id, root_notification_id y creation_kind=manual_reprocess.
2. Conserva aplicación, destinatario, canal y contenido efectivo. La original permanece fallida con su historial completo; no se reinician sus contadores.
3. La derivada tiene su propio trabajo y hasta tres intentos totales. El contador de cada notification_id nunca supera su configuración.
4. Registra quién pidió la acción, cuándo, el motivo, el ID fuente y el ID nuevo.
5. Exige idempotencia de la acción manual, con alcance de operador, notificación fuente y clave. Tras autenticar y autorizar, comprueba primero si el comando es un replay idéntico y devuelve su derivada original; rechaza el uso de esa clave con datos distintos.
6. Para un comando nuevo, solo se reprocesa la última notificación fallida de una cadena. Una fuente admite como máximo una derivada, protegida con unicidad y transacción. Rechaza reprocesar una entregada, pendiente, processing o una antecesora ya reprocesada. No hagas esta validación antes de resolver un replay válido del punto anterior.
7. El endpoint devuelve explícitamente el nuevo ID y la relación con el anterior. La UI muestra «Reprocesamiento creado» y enlaza ambos.
8. Mientras siga vigente su protección de idempotencia, repetir la clave del envío inicial devuelve la notificación inicial. Tras vencer, se aplica la política del apartado 7; nunca se crea implícitamente una derivada ni se dispara un reproceso manual.
9. Una derivada vuelve a fallar de forma observable si el problema permanente no se resolvió. No prometas que pulsar reprocesar soluciona un destinatario rechazado.
10. Cuenta por separado notificaciones iniciales y reprocesamientos manuales. La evaluación de los 100 envíos y el SLI de entrega automática se basa en los 100 originales; los derivados no inflan ese denominador ni borran fallos.

La creación derivada no reserva ni reemplaza el registro de idempotencia del envío inicial. Usa únicamente la idempotencia independiente de la orden manual y su nuevo identificador de entrega.

Esta es una política elegida para conciliar ambos requisitos, no una cita textual de la guía. La consulta de detalle debe permitir reconstruir toda la cadena y comprobar tanto el fallo como la recuperación manual.

## 10. Simulador de correo y fallos reproducibles

Construye un proveedor de correo de prueba real como componente HTTP interno. Recibe solicitudes, registra el intento y devuelve un resultado verificable. Persiste sus aceptaciones para que «entregado» tenga evidencia independiente.

Modos controlados:

- healthy: aceptación inmediata.
- fail_first_n: fallos transitorios deterministas en los primeros N intentos por clave de entrega.
- always_503: indisponibilidad temporal sostenida.
- timeout: demora superior al timeout del cliente.
- permanent_rejection: rechazo permanente de destinatarios ficticios elegidos.
- accepted_then_timeout: registra una aceptación, pero pierde/demora la respuesta, para documentar ambigüedad.

La configuración de fallos pertenece a un plano de control autenticado y restringido al entorno de demostración. No aceptes instrucciones de fallo desde metadata enviada por un cliente normal. Asocia perfiles a escenarios/IDs de prueba mediante configuración autorizada. Versiona la definición del escenario sin incluir secretos.

Entrega comandos para activar, consultar y restaurar un modo. Usa limpieza garantizada mediante finally/traps y registra el estado anterior. La UI puede mostrar controles de demostración para un administrador, pero los scripts no deben depender de ella.

El modo healthy será el estado normal. Los errores no serán aleatorios: usa fixtures deterministas o una semilla documentada. La misma ejecución debe producir resultados esperados comparables.

La inspección de recibos estará protegida; ofrece consulta por API/CLI y, si ayuda, una vista integrada de solo lectura. No expongas un buzón de pruebas público sin autenticación ni implementes envío real accidental.

## 11. Frontend profesional, conectado e independiente

El frontend se construye como aplicación separada y consume la API. No contiene base de datos operativa, lógica de reintentos ni secretos de aplicaciones. Desplegarlo a cero réplicas debe dejar funcionando API, clientes CLI, workers, persistencia, simulador y observabilidad.

### 11.1 Dirección visual

Diseña un producto sobrio y pulido, con identidad veterinaria sutil:

- Marca: VetNotify, logotipo tipográfico con símbolo SVG sencillo y consistente.
- Fondo general: #F6F8FA.
- Superficies principales: #FFFFFF.
- Texto principal: #16323A.
- Texto secundario: #52636B.
- Color principal: #0F766E.
- Superficie de énfasis: #E8F5F1.
- Bordes: #DDE5E8.
- Estados con etiqueta e icono: éxito verde, advertencia ámbar, fallo rojo, pendiente/procesando azul o violeta.
- Tipografía Inter alojada localmente o una buena pila de sistema; evita depender de una fuente remota para la defensa.
- Cifras tabulares, espaciado consistente, bordes discretos, jerarquía tipográfica y densidad útil.

Comprueba el contraste real de las combinaciones elegidas; la paleta por sí sola no demuestra accesibilidad. Evita grandes tarjetas vacías, exceso de gradientes, emojis como navegación y una página de marketing que sustituya al producto.

Textos de interfaz en español, naturales y claros. Los estados técnicos y campos del contrato pueden mantenerse en inglés. Diseña especialmente bien la tabla y el detalle: serán las pantallas principales de la demostración.

### 11.2 Pantallas

1. **Acceso:** inicio de sesión real, errores útiles y salida de sesión. El rol se verifica en backend.
2. **Resumen operativo:** cifras reales por ventana, aplicación y canal; pendientes, entregadas, fallidas, espera/latencia y última actualización. Explica qué mide cada indicador.
3. **Centro de notificaciones:** tabla con ID copiable, origen, canal, destinatario, asunto, estado, intentos, aceptación y última transición. Filtros combinables, orden estable y paginación real.
4. **Detalle:** contenido, origen, correlación, historial, cronología de intentos, duraciones, error sanitizado, próxima ejecución y evidencia de entrega. Incluye relación de reprocesos y acción autorizada con confirmación breve.
5. **Bandeja del destinatario:** lista y detalle de sus notificaciones internas, adaptable a móvil. Lectura/no lectura opcional y separada de entrega.
6. **Aplicaciones y demostración:** dos vistas reconocibles de Agenda y Laboratorio, con eventos de prueba que pasan por sus emisores reales. Muestra nombres/identificadores, nunca sus claves.

Los controles de fallo pueden vivir en una sección de demostración restringida, distinta de los flujos cotidianos. No muestres puertos, manifiestos, detalles de infraestructura ni stack traces en recorridos normales del destinatario.

### 11.3 Comportamiento y calidad

- Todos los datos de operación provienen del backend. Sin contadores de ejemplo, resultados precalculados ni cambios ficticios de estado.
- Usa actualización periódica razonable; WebSockets no son necesarios para este escenario.
- Conserva filtros y selección al actualizar.
- Presenta estados de carga, vacío, error y recuperación.
- Deshabilita acciones en curso y evita dobles envíos; conserva idempotencia del servidor.
- El historial explica aceptación frente a entrega y reintento frente a reproceso manual.
- Fechas en UTC para almacenamiento y una zona horaria explícita/configurable para visualización.
- Navegación por teclado, foco visible, etiquetas, errores asociados y diálogos accesibles.
- Diseño utilizable a 360 px y en escritorio, sin desbordamientos innecesarios.
- No incluyas claves de aplicaciones ni contraseñas en el bundle, fuentes, localStorage, sessionStorage o capturas. Tampoco guardes tokens de operador en esos almacenamientos accesibles por JavaScript. La sesión humana puede usar la cookie protegida HttpOnly/Secure definida en el contrato de autenticación.

Verifica el flujo real con las herramientas de navegador disponibles. Corrige errores de consola, solicitudes fallidas inesperadas, tablas cortadas y controles sin funcionalidad. Captura evidencias visuales solo después de ejecutar los casos y con datos ficticios.

El dashboard de producto no sustituye Grafana ni los seis paneles operativos exigidos. Enlaza las herramientas técnicas de manera autorizada para quien defiende el proyecto.

## 12. Contenedores y desarrollo local

Crea Dockerfiles con versiones fijadas, etapas de construcción separadas cuando convenga, usuarios no root y contextos de build acotados. Excluye .env, claves, kubeconfigs, estados Terraform, dumps y evidencias privadas.

La API y workers pueden compartir una imagen con comandos distintos; frontend y simulador serán identificables por imagen y versión. Los emisores pueden compartir imagen con identidad/configuración separada. Incluye etiquetas OCI de source/revision cuando sean apropiadas.

Docker Compose debe permitir:

- Levantar el núcleo sin frontend.
- Agregar el frontend mediante perfil opcional.
- Levantar observabilidad para comprobar instrumentación local.
- Persistir PostgreSQL y los datos necesarios en volúmenes.
- Ejecutar migraciones y semillas de forma explícita e idempotente.
- Ejecutar pruebas contra PostgreSQL real.

Usa archivos de ejemplo sin valores secretos. Genera credenciales de demo aleatorias fuera de Git y explica cómo cargarlas en cada entorno. Los datos de negocio pueden ser deterministas; las credenciales no deben ser contraseñas públicas fijas.

Adapta los wrappers al sistema operativo disponible. Si usas bash/Make sobre Windows, documenta el entorno real requerido o proporciona equivalentes npm/PowerShell. Verifica los comandos que entregas; no supongas Docker, Azure CLI o Terraform instalados.

## 13. Azure, Terraform y control de costos

### 13.1 Descubrimiento y presupuesto

Inspecciona de forma acotada la suscripción Azure autorizada, permisos, crédito disponible, cuotas, regiones y recursos existentes del proyecto. Registra identificadores no secretos; no publiques tokens ni claves.

El límite es **US$100 acumulados**, no por mes, VM ni integrante. Consulta el gasto atribuible al proyecto desde su inicio y el crédito disponible de la suscripción. Si hay gasto previo relevante, no supongas que siguen disponibles los US$100.

Cotiza región y tamaños realmente disponibles con fuentes oficiales al momento de desplegar. Incluye cómputo por horas, discos, IP, almacenamiento del estado, tráfico y cualquier servicio adicional. Prefiere una VM y un clúster, ajustando tamaño y horas de uso según consumo real.

Los mínimos de K3s no son el presupuesto de memoria de toda la solución. Suma requests del sistema, base, emisores, workers, frontend opcional, Prometheus, Grafana, Collector y trazas; mide uso y deja margen. Ajusta retención y frecuencias antes de añadir infraestructura.

Establece margen operativo bajo US$100 y umbrales de aviso, por ejemplo 50%, 75% y 90% del presupuesto que corresponda. Esos porcentajes son una decisión operativa. Mantén control acumulado del proyecto aunque un presupuesto de Azure se reinicie por período.

Las alertas de costo no apagan recursos y la facturación tiene retraso. Documenta ese límite y no uses una alerta como único mecanismo de contención. Entrega comandos de status, start, stop/deallocate y destroy, con alcance explícito.

Desasignar una VM detiene cómputo, pero no garantiza costo cero de discos, IP u otros recursos. Distingue costos estimados de cargos observados. Si todavía no hay datos de facturación, indica «no disponible aún», no «US$0 verificado».

### 13.2 Recursos y backend remoto

Versiona mediante Terraform los recursos principales: grupo de recursos, red/subred, reglas de seguridad, VM, discos, IP/DNS cuando proceda, identidades y asignaciones de permisos apropiadas, además de los recursos de costos soportados.

Se admite bootstrap mínimo documentado para identidad, federación, backend remoto y permisos indispensables. Sepáralo de la infraestructura ordinaria. Automatiza el resto, incluida la instalación/configuración inicial de K3s.

Usa backend azurerm en Azure Storage privado, protegido mediante identidad y RBAC; preferentemente Microsoft Entra ID/OIDC en Actions y sesión CLI autorizada en desarrollo. Asegura locking soportado por el backend. No desactives el bloqueo ni uses force-unlock sin verificar titularidad y ausencia de escritores.

Protege el estado: puede contener información sensible. No lo publiques en Git, imágenes, logs o artefactos generales. Evita introducir secretos de aplicaciones mediante variables Terraform si eso los incorpora al estado. Separa el backend/bootstrap del borrado normal del entorno para no destruir el estado por accidente.

No confundas los permisos de administración de recursos Azure con los permisos de acceso al blob de estado. Documenta roles, alcance e identidad de bootstrap, plan, apply y despliegue.

Los planes pueden contener datos sensibles. Mantén un plan revisable, acceso restringido y un resumen sanitizado para la evidencia. Ningún artefacto de build contendrá contraseñas, claves, tokens ni kubeconfigs.

### 13.3 Red, DNS y TLS

Toda exposición pública de credenciales y datos sensibles usa HTTPS con certificado válido y verificable. Documenta el nombre DNS y el origen/renovación del certificado. Usa un dominio autorizado o una opción de DNS de Azure compatible; no compres un dominio sin decisión expresa.

La exposición pública debe ser mínima. Mantén PostgreSQL, Prometheus, Collector, ingesta/consulta de trazas, proveedor de pruebas y controles de fallos dentro de la red o detrás de acceso restringido. Protege cualquier interfaz de administración expuesta.

No abras 6443 a todo Internet ni publiques kubeconfig de administrador. Restringe SSH y administración al acceso necesario. Usa Services internos y NetworkPolicies donde correspondan, preservando DNS, scraping y comunicaciones autorizadas.

Resuelve un camino real y seguro para que CI/CD llegue al clúster. Preferencia: un ejecutor de despliegue dedicado a trabajos confiables, con permisos limitados y acceso interno/restringido. Si las capacidades reales favorecen otro mecanismo, documenta su alcance de privilegios y pruébalo. No arregles conectividad abriendo Kubernetes al mundo.

Un runner de despliegue no ejecutará PR no confiables ni código de forks con secretos. Si usas un runner propio, documenta usuario, aislamiento, actualizaciones, persistencia, permisos, consumo y el hecho de que no dispone de cluster-admin ni sudo general para tareas ordinarias de despliegue.

## 14. K3s, ambientes, salud y recuperación

Instala K3s automáticamente mediante configuración versionada y una versión fijada. Documenta los pasos iniciales inevitables. Demuestra nodos Ready y workloads ejecutándose en Azure.

Usa un solo clúster salvo necesidad demostrada. Separa, como mínimo, vetnotify-dev y vetnotify-prod con configuraciones, credenciales y datos de prueba distintos. Se permite una instancia PostgreSQL compartida si hay bases/roles separados, permisos verificados y riesgo documentado; no compartas las mismas tablas como supuesta separación.

Observabilidad puede estar en un namespace propio, con el ambiente identificable en todas las señales.

Entrega manifiestos o Kustomize coherentes para Deployments, Services, ConfigMaps, Secrets suministrados de forma segura, PVC, cuentas de servicio, RBAC, exposición TLS y políticas apropiadas.

### Salud

- API liveness: salud del proceso, no caída del proveedor de correo.
- API readiness: capacidad real de aceptar durablemente, incluyendo la base indispensable.
- Worker: salud/heartbeat de su bucle de trabajo; estar ocioso no es estar muerto.
- Dependencias: probes apropiadas a su comportamiento.
- Startup probe cuando el arranque justifique un período especial.

Una caída del correo debe generar degradación observable, no un bucle de reinicios del sistema entero. Demuestra el efecto de readiness sobre tráfico y de liveness sobre reinicio.

### Recursos y seguridad

Configura requests y límites con justificación y observación. Revisa Pending, OOMKilled, throttling y reinicios. Ajusta el dimensionamiento a la prueba real.

Usa cuentas de servicio y RBAC con privilegio mínimo. Los pipelines de aplicación no necesitan administrar todo el clúster. Restringe ejecución privilegiada, acceso al host y escalada donde corresponda.

Un Kubernetes Secret no es por sí solo cifrado. Documenta quién puede leerlo, cómo llega al clúster y qué protege cada mecanismo. Configura protección en reposo apropiada y evita copiar secretos a evidencias.

### Persistencia

Los datos exigidos viven fuera del ciclo de vida del Pod. Prueba reinicio de API, workers y Pod PostgreSQL sin pérdida. Usa PVC para el almacenamiento necesario de observabilidad, o exporta evidencia suficiente y documenta su retención.

Un volumen local en una VM única no demuestra tolerancia a pérdida total de la VM. Declara esa limitación, permitida por la guía. Documenta backup/restauración operacional sin publicar dumps que contengan credenciales.

### Rollback

Identifica imágenes por digest y commit. Demuestra una actualización defectuosa y vuelta a la versión funcional anterior, verificando versión, salud y una operación real después.

Usa cambios de esquema compatibles con versión anterior o un procedimiento seguro. Un rollback de Deployment no restaura la base de datos.

Provoca el despliegue defectuoso en validación, de forma controlada y reversible; conserva datos. Recoge evidencia de fallo, diagnóstico, acción de rollback y resultado. Evita procedimientos destructivos o consumo innecesario.

## 15. GitHub, CI/CD y aprobaciones efectivas

Inspecciona el repositorio autorizado, su visibilidad, plan, permisos y protecciones. Crea el repositorio del proyecto si corresponde al encargo y está autorizado; conserva la privacidad existente. No supongas capacidades de GitHub que el plan no ofrece.

La protección de rama se configura en GitHub, no solo en YAML. Verifica checks obligatorios por sus nombres reales y bloqueo ante fallo. Comprueba también las capacidades de ambientes y revisores. Si una función no está disponible, prepara una alternativa que cumpla el requisito y documenta su verificación; una carencia real se informa como pendiente, no como cumplimiento equivalente inventado.

Organiza workflows claros:

### 15.1 PR / integración continua

- Instalación reproducible con lockfile.
- Lint y comprobación de tipos.
- Pruebas unitarias útiles.
- Integración con PostgreSQL real.
- Pruebas headless de contrato y escenario, incluida concurrencia.
- Build de backend, clientes y frontend.
- Validación de Dockerfiles/manifiestos según herramientas elegidas.
- Terraform fmt/check, init sin credenciales cuando proceda, validate y plan en contexto autorizado.
- Comprobación de secretos y revisión de dependencias/contenedores con tratamiento explícito de hallazgos materiales.

Separa lo que puede ejecutarse en PR no confiables de lo que requiere identidad Azure. No entregues secretos de producción a PR o forks. Un plan autenticado sobre cambios de IaC también requiere un contexto confiable; no ejecutes código no revisado con identidad privilegiada mediante pull_request_target.

No establezcas porcentajes arbitrarios de cobertura como sustituto de pruebas de negocio. Prueba invariantes: unicidad, autorización, persistencia, límites y recuperación.

### 15.2 Publicación

Construye y publica imágenes automáticamente desde código autorizado. Usa registro permitido, etiquetas por commit/release y digest inmutable. Documenta quién puede publicar y quién puede descargar; el clúster debe poder hacer pull de las imágenes privadas sin exponer credenciales.

Conserva relación verificable entre commit, ejecución de Actions, paquete publicado, digest y versión desplegada. Construye una vez y promueve el mismo digest a producción.

### 15.3 Infraestructura

Ante cambios de Terraform genera un plan revisable. Aplica únicamente el cambio autorizado, con controles apropiados y bloqueo de concurrencia. Comprueba que el plan aplicado corresponda al commit/entrada revisada y no esté obsoleto.

No realices apply de PR no aprobado. Serializa operaciones que comparten estado y evita dos escritores. No publiques el estado o planes sensibles en artefactos de acceso general.

### 15.4 Despliegue

Despliega primero al namespace de validación, ejecuta smoke/aceptación y promueve el digest mediante el control de aprobación soportado. Explica qué versión está activa en cada ambiente y cómo se impide una promoción accidental.

El frontend puede habilitarse/deshabilitarse como componente independiente. Cambiar su número de réplicas no debe cambiar configuración, datos o identidad del backend.

### 15.5 Evidencia de controles

Demuestra con un cambio de prueba reversible que un check fallido bloquea la integración. Conserva evidencia del bloqueo y de la corrección. El historial de PR y revisiones debe ser auténtico.

Prepara PR claros para que los integrantes autorizados revisen. No suplantes a un compañero, fabriques aprobaciones ni evadas un gate para marcar la rúbrica como terminada. Si falta una revisión humana, entrega el cambio listo para revisar y continúa el resto del trabajo posible; registra exactamente esa dependencia.

No es válido dejar reglas de seguridad o validaciones permanentemente desactivadas después de la demostración.

## 16. Observabilidad completa y medición honesta

Cumple los nueve mínimos del Anexo II. Entrega catálogo, fórmulas, consultas, configuración versionada, evidencia y explicación; instalar herramientas por sí solo no cumple.

### 16.1 Tres preguntas operativas

Formula como mínimo:

1. ¿Qué proporción de notificaciones iniciales aceptadas se entrega dentro del plazo objetivo? Decisión: investigar incumplimiento y priorizar capacidad o dependencia.
2. ¿Qué canal y tipo de fallo explican reintentos y retrasos? Decisión: distinguir proveedor de correo, error permanente y procesamiento interno.
3. ¿El trabajo se acumula por falta de capacidad, worker detenido o dependencia degradada? Decisión: recuperar componente, corregir configuración o ajustar recursos.

Vincula cada pregunta a paneles, consultas y una acción posible.

### 16.2 Tres SLIs y dos SLOs

Implementa estas definiciones iniciales, identificadas como objetivos de diseño del equipo y no umbrales del profesor:

**SLI 1 — entrega inicial dentro de 30 segundos.**

En un instante de evaluación t, para ventana W=15 minutos y plazo D=30 segundos:

- Denominador N: notificaciones con creation_kind=initial aceptadas en [t-W-D, t-D).
- Numerador G: integrantes de esa cohorte que llegaron a delivered antes o exactamente en accepted_at+D.
- Resultado: G/N; porcentaje si N>0. N=0 significa «sin datos».
- Incluye ambos canales; presenta desglose por canal/aplicación sin alterar la población.
- Pendientes vencidas, fallidas e inciertas siguen en el denominador.
- Un replay idempotente no añade otra notificación.

**SLO 1:** al menos 95% en la ventana de prueba de 15 minutos. Presupuesto discreto de incumplimientos: floor(N × 0.05).

**SLI 2 — entrega interna dentro de 5 segundos.**

Misma regla de cohorte madura, con D=5 segundos y solo el canal interno.

**SLO 2:** al menos 99% en la ventana de prueba de 15 minutos. Presupuesto discreto: floor(N × 0.01).

**SLI 3 — aceptación durable de solicitudes válidas.**

- Población: intentos de solicitud al endpoint de envío desde clientes/probes controlados, con autenticación y formato válidos.
- Numerador: respuestas de aceptación/replay correctas con ID válido cuya persistencia se verifica.
- Denominador: todos esos intentos de solicitud durante la ventana, incluyendo timeouts y 5xx.
- Excluye únicamente pruebas negativas identificadas de antemano: formato inválido, falta de autenticación o conflicto de idempotencia deliberado.
- Un replay exitoso es una petición API atendida, aunque no sea una nueva notificación. Documenta esa diferencia de unidad.
- Recoge la señal también desde el generador/probe: medir solo las solicitudes que alcanzaron el handler ocultaría una caída completa.

Justifica los objetivos con las condiciones del laboratorio y las mediciones. Si un objetivo no se cumple, muestra el resultado, investiga y corrige. No cambies umbrales o exclusiones después para maquillar un experimento; cualquier revisión de objetivo debe estar motivada y versionada antes de su nueva evaluación.

El experimento de fallo puede incumplir un SLO; esa degradación es parte del análisis. Ningún SLO permite perder alguno de los 100 registros exigidos por P1-1.

Los SLIs de entrega inicial no se recalculan como exitosos por un reproceso manual posterior. Muestra recuperaciones manuales por separado y conserva el plazo y resultado del original.

Consulta cohortes desde PostgreSQL, con timestamps UTC y límites inclusivo/exclusivo definidos. No dividas «entregadas dentro de plazo» entre «solo las que terminaron»: eso oculta pendientes. Si expones snapshots globales desde varias réplicas, evita sumarlos y duplicar la población.

### 16.3 Métricas

Implementa al menos cuatro de aplicación, incluyendo resultado y latencia/espera. Para este diseño se esperan señales equivalentes a:

- Nuevas notificaciones aceptadas, por aplicación/canal.
- Resultado de notificaciones, por canal/estado/tipo de creación.
- Intentos de entrega, por canal y clasificación del resultado.
- Reintentos programados.
- Latencia aceptación→entrega mediante histograma.
- Tiempo de espera antes de procesamiento.
- Número de pendientes y processing.
- Antigüedad del pendiente más antiguo.
- Cohortes evaluables y cumplimiento de los SLIs.
- Salud/actividad del worker cuando sustente el diagnóstico.

Relaciona con CPU, memoria y reinicios de contenedores/nodo; añade señales de PostgreSQL solo si ayudan a responder la hipótesis.

Documenta nombre, unidad, tipo, etiquetas, fuente, cálculo, recolección y retención. Usa etiquetas acotadas como environment, channel, app_slug y creation_kind. No uses notification_id, recipient_id, email, trace_id o run_id como etiquetas de Prometheus.

Los identificadores de operación pertenecen a logs, trazas y consultas de evidencia. Puedes filtrar el informe de prueba por run_id en la base sin crear series por cada ejecución.

Los histogramas de entregas completadas tienen sesgo hacia quienes terminaron: acompáñalos con pendientes y SLIs de cohorte. Los contadores de proceso pueden reiniciarse; usa consultas apropiadas y contrasta los recuentos de negocio con PostgreSQL.

### 16.4 Logs

Emite JSON con timestamp, severidad, servicio/componente, ambiente, operación, resultado, notification_id, attempt_id cuando exista, aplicación, canal y trace_id/span_id/correlation_id.

Registra aceptación después del commit, transiciones, intentos, fallos clasificados, recuperación de lease, errores de autorización y reprocesos. No registres cabeceras de autorización, cookies, claves, contraseñas, cuerpos completos ni datos personales.

Entrega consultas reproducibles para investigar una notificación y un fallo. Conserva logs sanitizados del incidente y las pruebas mediante un capturador versionado iniciado antes de provocar fallos; debe contemplar reinicios/cambios de Pod. Un sistema central de logs es opcional si aporta valor y cabe en recursos; no lo declares instalado si solo usas stdout.

### 16.5 Trazas OpenTelemetry

Instrumenta como mínimo API y worker, con spans del proveedor y operaciones relevantes cuando ayuden. Guarda/propaga traceparent y, si procede, tracestate con el trabajo. Usa propagación o links entre spans para conservar la relación asíncrona.

No mantengas artificialmente abierto un span HTTP durante toda la espera. Separa tiempo de recepción, espera en cola y ejecución. Los reintentos deben aparecer como intentos distinguibles y vinculados.

Configura muestreo explícito; para la carga académica controlada puedes usar 100% con retención acotada. Documenta impacto y límites. No exportes contenido sensible como atributos.

Las trazas deben ser consultables realmente en Jaeger/Grafana. Demuestra al menos una con dos componentes/etapas y correlación con logs y un resultado de la base. Verifica persistencia/retención elegida y versiona Collector, receptor/exportador y datasource.

### 16.6 Dashboard

Provisiona un dashboard de al menos seis paneles útiles. Propuesta de ocho:

1. Solicitudes iniciales aceptadas y resultados por canal, con unidad/ventana.
2. Cumplimiento de SLI/SLO y tamaño de cohorte evaluable.
3. Latencia de entrega y sus percentiles, indicando población.
4. Pendientes y antigüedad del más antiguo.
5. Errores por canal y clasificación.
6. Intentos y reintentos.
7. CPU y memoria de componentes/nodo.
8. Reinicios y salud de workers.

Cada panel debe contestar una pregunta, usar consultas reales y tener títulos, unidades, leyendas, ambiente y rango temporal comprensibles. Proporciona enlaces/consultas de trazas cuando sea útil. Guarda la configuración completa en Git y comprueba que pueda recrearse.

### 16.7 Alertas

Configura como mínimo:

- Una alerta por degradación del servicio: aumento de fallos finales o incumplimiento de SLI.
- Otra por síntoma operativo: pendientes demasiado antiguos o worker sin actividad/heartbeat cuando corresponda.

Valores iniciales de diseño posibles: más de 20% de fallos finales en 2 minutos con al menos 10 resultados y persistencia de 15 segundos; y pendiente más antiguo superior a 30 segundos durante 15 segundos. Valida que las consultas, frecuencia y carga hagan esos umbrales interpretables. Ajusta antes del experimento y justifica.

Define umbral, ventana, duración, población mínima, tratamiento sin datos, ruta de respuesta y falsos positivos. Conserva ambas reglas versionadas. No configures una regla que nunca puede dispararse con la demo.

Demuestra activación de al menos una y su regreso al estado normal. La notificación puede comprobarse en el sistema de alertas y su historial; no se requiere enviar correos reales o Slack. Conserva evidencia con marcas temporales y valores.

### 16.8 Incidente reproducible

Hipótesis inicial sugerida: «Al degradar el proveedor de correo aumentarán los fallos/reintentos de ese canal; el canal interno continuará entregando y las solicitudes aceptadas seguirán registradas».

Procedimiento:

1. Estabiliza el entorno y registra línea base.
2. Inicia captura de logs, métricas, trazas, versión y tiempos.
3. Genera tráfico ficticio conocido.
4. Activa always_503/timeout de forma autorizada y conserva la configuración anterior.
5. Comprueba reintentos, clasificación, preservación y continuidad interna.
6. Observa el disparo real de una alerta.
7. Restaura el proveedor; comprueba entregas nuevas y resolución de la alerta.
8. Las notificaciones que agotaron sus intentos permanecen fallidas. Demuestra recuperación manual explícita de un caso si corresponde.
9. Compara consultas/señales antes y después, separando causa y coincidencia.
10. Explica limitaciones, posibles falsos positivos y cambios recomendados.

Entrega una línea de tiempo con síntoma, señal de detección, hipótesis, mecanismo causal, acción, recuperación y evidencia verificable. Restaura el estado normal al concluir.

## 17. Pruebas de aceptación y recuperación obligatorias

Las pruebas deben funcionar sin navegador y contra el backend real con PostgreSQL real. Usa simulaciones unitarias solo donde corresponda; no sustituyas con ellas las pruebas de transacciones, concurrencia o reinicio.

Entrega un ejecutor que genere datos deterministas, use run_id, compruebe resultados y termine con exit code distinto de cero si falla una aserción. Emplea polling con condición y timeout, no sleeps arbitrarios como única evidencia.

Cada ejecución genera informe JSON y resumen Markdown con inicio/fin, versión, commit/digests cuando sean observables, casos, expectativas, resultados, IDs y referencias sanitizadas de evidencia. Separa «pasó», «falló», «no ejecutado» y «bloqueado».

### P1-1 — 100 solicitudes válidas

Distribuye 100 notificaciones iniciales entre las dos aplicaciones y los dos canales; propuesta: 25 por combinación aplicación/canal.

Perfil determinista sugerido:

- 50 internas entregadas.
- 40 correos aceptados al primer intento.
- 5 correos con dos errores transitorios y éxito al tercer intento.
- 5 correos con rechazo permanente tras el primer intento.

Esto produce, en una ejecución sin reinicios adicionales, 95 entregadas y 5 fallidas, conservando los 100 originales. Es una expectativa del fixture, no un resultado que debas fingir. También puedes ofrecer un perfil sano de 100 entregadas.

Verifica 100 IDs distintos, 100 registros iniciales, consulta de cada estado, distribución y evidencia de resultados. Los rechazos por formato/autenticación se prueban aparte y no cuentan entre los 100.

### P1-2 — Proveedor degradado

Provoca errores temporales reproducibles en correo. Comprueba persistencia, clasificación y reintentos dentro del máximo. Durante la misma degradación genera y consulta notificaciones internas entregadas.

Incluye un fallo sostenido para agotar exactamente tres intentos, además del caso 503, 503, éxito. Comprueba que el cliente HTTP no tenga reintentos ocultos fuera del contador del worker.

### P1-3 — Idempotencia secuencial y concurrente

- Crea una solicitud y retransmítela cinco veces secuencialmente.
- Con otra clave totalmente nueva, lanza el envío inicial y cinco repeticiones simultáneamente mediante una barrera real de concurrencia.
- En cada caso: un ID lógico, un trabajo, respuestas coherentes y ningún efecto interno duplicado.
- Cuenta trabajos/filas además de respuestas.
- Agrega conflicto de contenido y, si es posible, carrera entre variantes incompatibles: una aceptación coherente y rechazo explícito de la otra.
- Comprueba separación de claves por aplicación/canal y expiración con configuración de prueba.

### P1-4 — Reinicio del procesador

Prepara trabajos pendientes y al menos uno reclamado. Reinicia el worker de forma controlada; en Azure usa evidencia Kubernetes. Comprueba que los registros, intentos e idempotencia persisten, los leases vencidos se recuperan y no hay trabajos atascados indefinidamente.

Incluye un punto de prueba controlado después de reclamar y antes de guardar resultado. Verifica que no se reinicie el contador ni se exceda el máximo. Un worker con token antiguo no puede sobrescribir el resultado vigente.

Haz también una comprobación de persistencia al reiniciar el Pod PostgreSQL sin eliminar su volumen.

### P1-5 — Correlación y alerta

Elige un ID de una solicitud real de prueba. Reconstruye su recorrido mediante estado, intentos, logs y una traza de dos o más etapas/componentes. Explica el tiempo de espera y ejecución. Vincula el incidente con una alerta justificada y prueba su recuperación.

### Pruebas adicionales necesarias

- Cliente desconocido, credencial inválida y aplicación deshabilitada.
- Acceso cruzado entre aplicaciones y bandejas de destinatarios diferentes.
- Reproceso sin permiso.
- Reproceso correcto con derivada; repetición/doble clic/concurrencia sin crear dos derivados.
- Máximo de tres intentos por ID, incluyendo después de reinicio.
- Error permanente: un intento y cero reintentos automáticos.
- API sin base disponible: ninguna aceptación falsa.
- Commit realizado y respuesta perdida: replay recupera el ID original.
- Aceptación del simulador con respuesta perdida: incertidumbre y garantía específica del simulador documentadas.
- Un pendiente vencido empeora el SLI; una derivada no reinicia el plazo del original.
- Ninguna clave de aplicación aparece en el bundle o respuestas de frontend.
- UI respeta los permisos del backend y protege escrituras.
- Versión activa coincide con digest/commit publicado.
- Despliegue defectuoso y rollback con datos conservados.
- Protección de rama y gates efectivos.

## 18. Dos modos de demostración y comandos entregables

Implementa comandos claros, documentados y probados. Los nombres siguientes son un contrato de ergonomía propuesto: puedes adaptarlos al entorno, pero conserva la capacidad y publica la equivalencia exacta.

~~~text
make doctor
make bootstrap-local
make up-core
make up-full
make seed
make test
make acceptance
make demo-api
make demo-ui
make verify-no-frontend
make incident
make recover
make rollback-demo
make evidence
make infra-plan
make infra-apply
make cloud-status
make cloud-start
make cloud-stop
make cloud-destroy
~~~

El comando doctor comprueba dependencias, conectividad y configuración sin imprimir valores secretos. Las operaciones cloud tienen selección explícita del proyecto/entorno y mecanismos contra objetivos equivocados. Aplica las aprobaciones que correspondan; un wrapper no debe saltarlas.

### 18.1 Demostración sin frontend

Debe poder:

1. Comprobar entorno/versiones y autenticar ambos clientes.
2. Emitir eventos de Agenda y Laboratorio.
3. Consultar correo de prueba, bandeja interna e historial mediante API.
4. Ejecutar P1-1 a P1-5 y las comprobaciones de seguridad/reproceso.
5. Consultar métricas/alertas/trazas mediante sus APIs/consultas o comandos documentados, sin depender del frontend VetNotify.
6. Generar un informe legible y evidencias.

Implementa **verify-no-frontend** para guardar el estado del Deployment web, escalarlo a cero, comprobar que está realmente detenido y ejecutar el conjunto headless. Restaura el número previo de réplicas aun si falla una prueba. Hazlo en validación por defecto y documenta el equivalente local sin iniciar el servicio web.

El dashboard Grafana y la UI de trazas son herramientas de observabilidad. Pueden mostrarse en la defensa sin que exista un frontend propio de VetNotify; aun así, los verificadores deben poder consultar sus señales por API para una demostración automatizada.

### 18.2 Demostración visual

Prepara un guion de 8–12 minutos, ajustable a la duración que indique el docente:

1. Acceder como operador.
2. Mostrar Agenda y Laboratorio como emisores distintos.
3. Generar un evento desde cada emisor y usar ambos canales.
4. Mostrar correo aceptado y bandeja interna del destinatario.
5. Abrir detalle, estados e intentos.
6. Provocar fallo temporal de correo y observar continuidad interna.
7. Mostrar un permanente sin reintentos.
8. Reprocesar un fallo autorizado y seguir la derivada.
9. Mostrar observabilidad, alerta y recuperación.

Nada de este recorrido sustituye las pruebas automáticas. La UI debe representar exactamente los registros que se consultan por API.

## 19. Documentación, evidencias y presentación

Entrega, con contenido concreto y comandos reales:

- README.md: propósito, arquitectura breve, requisitos, arranque, pruebas, acceso, demo y operación Azure.
- docs/requirements-matrix.md: toda la trazabilidad de requisitos.
- docs/architecture.md: componentes reales, flujos, límites, red y persistencia.
- docs/api.md y OpenAPI: contrato, autenticación, errores y ejemplos de ambos clientes.
- docs/data-and-states.md: modelo, transiciones, idempotencia, reintentos, derivadas y garantías.
- docs/security.md: identidades, secretos, permisos Azure/Kubernetes, exposición, TLS y límites.
- docs/ci-cd.md: PR, gates, publicación, promoción, trazabilidad y rollback.
- docs/infrastructure.md: bootstrap, Terraform, estado remoto, K3s y reconstrucción.
- docs/operations.md: probes, recursos, diagnóstico, reinicio y recuperación.
- docs/observability.md: catálogo, preguntas, fórmulas, consultas, muestreo, etiquetas y retención.
- docs/incident-report.md: experimento real con línea de tiempo y comparación.
- docs/costs.md: cotización, cargos observados, presupuesto acumulado, parada/eliminación y límites.
- docs/demo-api.md y docs/demo-ui.md: dos guiones completos.
- docs/defense-guide.md: explicación y ejercicios para los cuatro integrantes.
- docs/versions.md y docs/STATUS.md.
- ADR breves para cola PostgreSQL, separación de canales, idempotencia, reproceso derivado, nodo único, seguridad, SLOs y compromisos.
- docs/evidence/: informes sanitizados, salidas, capturas pertinentes, referencias a workflows/commits/digests y datos de medición.
- slides/: presentación editable y exportación a PDF.

Los diagramas deben corresponder a la solución desplegada. Entrega fuente editable y una versión visual exportada legible; incluye arquitectura de componentes/despliegue y secuencias de aceptación, reintento/idempotencia y reprocesamiento. Usa notación apropiada y etiquetas claras.

Prepara aproximadamente 12–15 diapositivas: problema, dos clientes/dos canales, arquitectura, aceptación, idempotencia/reintentos, persistencia, Terraform, CI/CD, K3s/seguridad, métricas/SLO, dashboard, incidente, rollback, costos y resultados. Incluye notas de exposición y referencias a evidencia.

La guía pide slides; el editable puede ser PPTX o una fuente de presentación reproducible que exporte correctamente a PDF. Verifica visualmente el PDF y sus páginas antes de entregarlo. No declares disponible un archivo que no generaste.

La defensa individual puede abarcar cualquier componente. Prepara explicaciones sin depender de IA y ejercicios como:

- ¿Qué distingue accepted de delivered?
- ¿Qué pasa si muere el worker después de que el proveedor aceptó?
- ¿Por qué la idempotencia es por aplicación y canal?
- ¿Qué ocurre si falla readiness? ¿Y liveness?
- ¿Cómo diagnosticas ImagePullBackOff, Pending u OOMKilled?
- ¿Qué conserva el PVC y qué ocurre si se pierde la VM?
- ¿Por qué rollback no restaura datos?
- ¿Cómo identificas el digest ejecutado?
- ¿Cómo demuestra GitHub que un cambio fallido no puede integrarse?
- ¿Qué implica una cohorte madura y por qué conserva pendientes?
- ¿Cuántos fallos permite el presupuesto de error con el N observado?
- ¿Cómo correlacionas logs, métricas y trazas sin etiquetas de alta cardinalidad?
- ¿Por qué una alerta de presupuesto no detiene Azure?

Puedes repartir la preparación entre cuatro áreas, pero todos deben comprender el conjunto. Si faltan nombres o carnets, deja esos campos pendientes de datos reales; no inventes integrantes ni fechas de evaluación.

La entrega académica es servicio operativo en Azure, repositorio con código/evidencias y diapositivas. DevOps aporta 15% grupal y 15% individual; Métricas 10% grupal y 10% individual. La IA está permitida en desarrollo, pero no en la defensa/comprobación individual.

## 20. Secuencia de trabajo y puertas de verificación

Trabaja en este orden, conservando autonomía y checkpoints:

1. **Inspección:** PDF, entorno, repositorio, herramientas, sesiones autorizadas, presupuesto y plan inicial. Crear matriz y STATUS.
2. **Contrato y persistencia:** modelo, migraciones, autenticación, API y aceptación durable; pruebas mínimas reales.
3. **Entrega:** workers separados, simulador, estados, historial, idempotencia concurrente y recuperación.
4. **Clientes y pruebas headless:** Agenda/Laboratorio ejecutables, 100 solicitudes y P1-1 a P1-5. Resolver fallos antes de confiar en la UI.
5. **Observabilidad temprana:** incorporar instrumentación durante los pasos anteriores; cerrar catálogo, SLIs, dashboard, alertas e incidente.
6. **Frontend:** construir y pulir todas las pantallas sobre el contrato probado; verificar flujo real y seguridad.
7. **Contenedores e IaC:** terminar empaquetado, bootstrap, Terraform, K3s, ambientes, TLS y permisos.
8. **CI/CD:** activar pruebas, protecciones reales, publicación, despliegue de validación y promoción aprobada.
9. **Verificación Azure:** repetir aceptación, persistencia, incidente, rollback y prueba con frontend detenido; comprobar imágenes y costos.
10. **Entrega:** documentación actualizada, evidencias reales, presentación, guiones y matriz final.

Puedes paralelizar trabajo independiente si las herramientas lo permiten, manteniendo contratos coherentes y revisando integraciones. No esperes hasta el final para instrumentar o probar.

Una etapa terminada debe indicar qué se ejecutó y su resultado. Cuando una prueba falla, investiga y corrige; no la omitas, reduzcas su objetivo ni sustituyas datos reales por fixtures de presentación.

Si se agota una sesión, guarda estado reproducible y continúa desde el checkpoint. No dejes funcionalidades a medias como supuestamente completas.

## 21. Definición de terminado

Antes de declarar finalizado el proyecto, comprueba:

- [ ] Los 37 requisitos COM/DEV/MET/ESC1 tienen implementación y evidencia verificadas.
- [ ] Las cinco pruebas P1 funcionan y generan resultados objetivos.
- [ ] Las condiciones comunes y mínimos del Anexo II están cubiertos.
- [ ] Existen dos clientes auténticos con credenciales independientes y origen verificable.
- [ ] Funcionan correo de prueba y bandeja interna persistente.
- [ ] La aceptación es durable y los 100 registros se conservan.
- [ ] La idempotencia funciona con concurrencia, conflictos y alcance temporal.
- [ ] El máximo de tres intentos por ID se cumple, incluidos reinicios; no hay reintentos HTTP ocultos.
- [ ] El reproceso es explícito, autorizado, auditado y enlazado, sin ramas duplicadas.
- [ ] El canal interno sigue funcionando con correo degradado.
- [ ] Reinicios y leases abandonados no pierden trabajos ni estados.
- [ ] La prueba completa pasa con el frontend realmente detenido.
- [ ] El frontend está terminado, funciona con datos reales y no expone claves.
- [ ] Azure ejecuta la aplicación en K3s; desarrollo/validación y producción están separados.
- [ ] Terraform usa estado remoto protegido y la instalación es reconstruible.
- [ ] Las protecciones, revisiones y aprobaciones son reales y están demostradas.
- [ ] Imágenes desplegadas se relacionan con digest, commit y workflow.
- [ ] Se demostró rollback y se verificaron datos/función después.
- [ ] Hay 3 preguntas, 3 SLIs, 2 SLOs, al menos 4 métricas de aplicación, trazas entre 2 etapas/componentes, al menos 6 paneles y 2 alertas.
- [ ] Al menos una alerta se activó y volvió a normal, con evidencia.
- [ ] El incidente tiene hipótesis, causa, mitigación y comparación antes/después.
- [ ] Costos y recursos están identificados, bajo el límite acumulado, con procedimientos de control.
- [ ] No hay secretos en Git, imágenes, bundles, logs o artefactos de construcción.
- [ ] Están disponibles documentación, presentación editable/PDF y preparación de defensa.

Si una casilla está bloqueada por un permiso, una revisión humana u otra causa externa real, no declares «proyecto completo». Entrega todo lo ya terminado, marca el bloqueo exacto y deja preparada la acción final necesaria. Un requisito académico no desaparece porque una cuenta carezca de una función.

## 22. Respuesta de entrega que debes producir

Al terminar, informa en español:

1. Qué quedó funcionando y qué verificaste realmente.
2. Repositorio, commit/release, digests y URLs operativas verificadas.
3. Cómo ejecutar demo-api, demo-ui y verify-no-frontend.
4. Dónde consultar documentación API, Grafana y trazas con acceso autorizado.
5. Resultados reales de P1, seguridad, persistencia, incidente y rollback.
6. Estado de cada requisito y cualquier pendiente/bloqueo real.
7. Costos estimados y observados, recursos encendidos y comandos de parada.
8. Ubicación de documentos, evidencias y slides.
9. Guía breve para empezar a estudiar la defensa.

Entrega los accesos mediante el mecanismo seguro elegido; no pegues secretos en una respuesta pública ni los incluyas en capturas. No afirmes que revisiones, aprobaciones, gastos o pruebas ocurrieron si no hay evidencia.

**Empieza ahora con la inspección y la matriz de requisitos; continúa con la implementación y las verificaciones hasta completar este encargo dentro de los accesos disponibles.**

---

## Referencias para contrastar decisiones técnicas

La guía adjunta determina las obligaciones académicas. Los valores de diseño, stack, estructura, colores y políticas adicionales de este prompt son decisiones propuestas para implementarlas.

Consulta la documentación correspondiente a las versiones realmente seleccionadas:

- K3s: [instalación](https://docs.k3s.io/quick-start) y [recursos](https://docs.k3s.io/installation/requirements).
- GitHub: [ambientes y disponibilidad de protecciones](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments).
- Terraform: [backend Azure](https://developer.hashicorp.com/terraform/language/backend/azurerm).
- Terraform: [bloqueo de estado](https://developer.hashicorp.com/terraform/language/state/locking).
- Azure: [presupuestos y límites de las alertas](https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/tutorial-acm-create-budgets).
- PostgreSQL: [SELECT y SKIP LOCKED](https://www.postgresql.org/docs/current/sql-select.html).
- PostgreSQL: [INSERT y ON CONFLICT](https://www.postgresql.org/docs/current/sql-insert.html).
- OpenTelemetry JavaScript: [propagación](https://opentelemetry.io/docs/languages/js/propagation/).
- OpenTelemetry: [trazas de mensajería](https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/).
- Jaeger: [almacenamiento Badger](https://www.jaegertracing.io/docs/2.23/storage/badger/).
- Grafana: [datasource Jaeger](https://grafana.com/docs/grafana/latest/datasources/jaeger/configure/).
- Vite: [variables de entorno y exposición al cliente](https://vite.dev/guide/env-and-mode.html).
- Fastify: [validación y serialización](https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/).
- Fastify: [logs](https://fastify.dev/docs/latest/Reference/Logging/).

No copies ciegamente ejemplos de una versión distinta. Registra las decisiones finales y la documentación comprobada durante la construcción.


