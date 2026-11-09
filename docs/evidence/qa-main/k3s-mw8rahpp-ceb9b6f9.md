# VetNotify · Evidencia operativa de K3s

Ejecución `k3s-mw8rahpp-ceb9b6f9` de 2026-11-09T04:23:33.422Z a 2026-11-09T04:24:03.840Z (UTC).

Entorno `dev`, commit `e1132db86bbf4e87b3855d17f1c7a562e7c834fe`.

| Caso | Estado | Comprobación |
|---|---|---|
| DEV-09/10/11 | pasó | Nodo Ready, workloads por digest, PVC y capacidad observada. RBAC de release limita secretos. |
| Liveness | pasó | El kubelet registró fallo de liveness y reinició el contenedor. Probe restaurada. |

[Informe JSON](./k3s-mw8rahpp-ceb9b6f9.json)
