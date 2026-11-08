# Versiones

## Herramientas

| Componente | Versión |
|---|---|
| Node.js local | 24.19.0 |
| Node.js de construcción y candidato actualizado | 24.22.2 LTS |
| npm local | 11.17.0 |
| Git / GitHub CLI | 2.55.0 / 2.103.0 |
| Docker Desktop Linux / Compose | 29.7.2 / 5.4.0 |
| Azure CLI | 2.91.0 |
| Terraform / proveedor AzureRM | 1.16.5 / 4.81.0, hashes Windows y Linux |
| Ubuntu en Azure | Canonical Ubuntu 24.04, versión 24.04.202610210 |
| K3s | v1.35.2+k3s1 |
| Caddy | 2.10.2 con verificación SHA-512 |

## Aplicación y observabilidad

| Componente | Versión |
|---|---|
| Fastify / pg / TypeScript | 5.12.8 / 8.23.1 / 5.9.3 |
| React / Vite / Lucide | 19.3.1 / 8.3.6 / 0.577.0 |
| Vitest / Playwright / axe | 4.1.12 / 1.65.0 / 4.14.0 |
| PostgreSQL | Imagen 18-bookworm con digest en K3s |
| Nginx | 1.30.6-alpine para el candidato corregido. La validación inicial usó 1.30.4 |
| OpenTelemetry JS | API 1.9.0, SDK 2.12.0, OTLP HTTP 0.223.0 |
| Collector / Jaeger | 0.160.0 / 2.22.0 |
| Prometheus / Grafana / Node Exporter | 3.15.0 / 13.2.4 / 1.11.1 |
| Gitleaks / Trivy | 8.30.1 / 0.70.0 |
| Mermaid CLI | 11.12.0 |

El lockfile de npm contiene versiones exactas. Los proveedores Terraform llevan sus hashes firmados. Las acciones GitHub se fijan por commit. El Dockerfile actualiza paquetes específicos de Debian con corrección disponible y elimina npm y Yarn del runtime. El digest publicado identifica la imagen exacta resultante.

La primera validación local etiquetó el build de trabajo con el commit de inspección que existía al compilar. El commit de aplicación verificado para Azure aparece en `/api/v1/version` y en la evidencia K3s. Consulta [estado](STATUS.md) para el digest activo y las corridas GitHub.

## Candidato publicado

GitHub Actions construyó y escaneó las imágenes del commit `92e5a9af8cfd7c1c5c7d409fd77c126e6bb7c30b`. Los digests de los OCI coincidieron con los manifiestos registrados en GHCR. [Publicación 42535369639](https://github.com/cristyags/VetNotify/actions/runs/42535369639).

| Imagen | Digest publicado |
|---|---|
| `ghcr.io/cristyags/vetnotify-backend` | `sha256:bceee49a3f1dfeb5c2d7ecb5a81d6039cb7ddf2142c9f37cecc93e7dab00e0d9` |
| `ghcr.io/cristyags/vetnotify-web` | `sha256:884f01be7e5f61070aee38cf175cc34b9ab6569802739479d35bd12743dcc302` |

Documentación técnica contrastada en [K3s](https://docs.k3s.io/installation/requirements), [HashiCorp](https://developer.hashicorp.com/terraform/language/backend/azurerm), [Jaeger 2.22](https://www.jaegertracing.io/docs/2.22/storage/badger/), [Node.js](https://nodejs.org/dist/index.json) y [avisos de seguridad de Nginx](https://nginx.org/en/security_advisories.html).
