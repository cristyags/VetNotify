# Demostración por API y consola

Duración sugerida de defensa 8–12 minutos. Requisitos de ejecución en [README](../README.md).

1. Ejecuta `npm run doctor`, `npm run build:api` y comprueba `GET /api/v1/version`.
2. Ejecuta `npm run demo-api -- --smoke`. Abre el informe y señala cuatro IDs, dos aplicaciones, dos recibos y dos bandejas con sesiones distintas.
3. Ejecuta `npm run verify-no-frontend`. Comprueba que `/` devuelve error de upstream mientras `/api/v1/version` mantiene el mismo gateway y que cero réplicas web permanecen durante la corrida.
4. Usa el informe P1-1 para mostrar 100 registros y su distribución. Explica por qué 202 y delivered responden a etapas diferentes.
5. Abre P1-2 y P1-3. Compara las tres llamadas del simulador, la bandeja que siguió disponible y el único trabajo por clave bajo concurrencia.
6. Abre P1-4 y compara el lease abandonado y el posterior. La pausa de PostgreSQL debe retirar readiness y rechazar aceptación durable.
7. Muestra la traza y la alerta a partir de P1-5. Consulta `GET /api/v1/alerts` de Prometheus y `GET /api/v3/traces/{trace_id}` de Jaeger. El informe conserva activación y retorno normal.
8. Comprueba restauración de la réplica web con el último JSON.

Para comandos aislados de emisor, consulta [API](api.md). Para la VM, carga el archivo privado dev mediante `node --env-file`, establece `API_URL`, `PROM_URL`, `JAEGER_URL`, `PG_PORT`, `VET_TARGET=k8s`, `VET_NAMESPACE=vetnotify-dev` y `KUBECONFIG`. La prueba de reinicio requiere un port-forward temporal directo al Pod API en `VET_API_DIRECT` y un túnel SQL que sobreviva a recreación del Pod de PostgreSQL.
