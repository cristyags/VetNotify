# Infraestructura y reconstrucción

## Requisitos

Sesión Azure CLI con suscripción Azure for Students autorizada, crédito comprobado, cuota para una VM de 2 vCPU y una identidad con permisos para crear recursos y asignar los roles indicados. Instala Terraform 1.16.5, kubectl, OpenSSH, Node y Docker. Verifica una versión de imagen Ubuntu con `az vm image show` en la región y conserva la versión exacta. La ejecución inicial usa México Central, zona 2 y B2as v2 (2 vCPU / 8 GiB).

Al reactivar VetNotify para producción, Azure devolvió `ZonalAllocationFailed`. Una desasignación explícita recuperó el estado de cómputo. Un plan guardado actualizó solo `size` a `Standard_D2s_v4`, con 2 vCPU y 8 GiB. Se comprobaron disco, interfaz, IP y zona. Usa este valor en `sku` del archivo privado de variables y en `TF_INPUTS_JSON` para reproducir el estado actual. El plan autenticado posterior devolvió `changes: []`. [Recuperación observada](evidence/qa-main/azure-start-recovery.json) · [Plan autenticado](https://github.com/cristyags/VetNotify/actions/runs/42681725794) · [Capacidad y redimensionamiento](https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/windows/allocation-failure).

## Bootstrap y plan

1. Genera una clave ED25519 dedicada y conserva la privada fuera del repositorio. Identifica la IPv4 administrativa /32.
2. Selecciona la suscripción con `az account set --subscription ID`. Ejecuta `terraform -chdir=infra/terraform/bootstrap init`. Planifica con `-var subscription_id=ID -var suffix=SUFIJO` y ruta de estado local privada. Revisa y aplica el plan guardado.
3. Copia `backend.hcl.example` y `terraform.tfvars.example` fuera de Git y completa los valores. El backend usa Azure CLI/Entra, lease y contenedor privado. El bootstrap asigna `Storage Blob Data Contributor` al operador sobre ese contenedor.
4. Usa `npm run infra-plan -- -Subscription ID -Suffix SUFIJO -BackendFile RUTA -VarsFile RUTA -PlanPath RUTA`. Revisa acciones y destino. Usa `npm run infra-apply --` con los mismos parámetros para aplicar ese archivo.
5. Cloud-init instala K3s con versión fijada, cifrado de Secrets y kubeconfig 0600. Instala Caddy verificado con checksum. Comprueba `cloud-init status --long`, `sudo k3s kubectl get nodes` y `sudo systemctl status vetnotify-edge`.

El código de bootstrap y estado se conserva al eliminar el workload. El plan autenticado de GitHub requiere federación solo desde `main`, Reader en el grupo del proyecto y permiso de datos para el lease del blob. Concede el permiso al principal de salida `plan_principal_id` exclusivamente sobre el contenedor. El rol de propietario queda para el bootstrap y la operación administrativa.

Para reconstruir la federación de este repositorio, usa `gh api repos/cristyags/VetNotify --jq '{owner:.owner.login,ownerId:.owner.id,repo:.name,repoId:.id}'`. En el archivo privado de variables y en `TF_INPUTS_JSON` establece `repository` en `cristyags@180483232/VetNotify@1450699252`. Terraform forma el sujeto con `repo:` y `:ref:refs/heads/main`. Entra exige coincidencia exacta de sujeto, emisor y audiencia. El plan de Actions verificó la corrección con `changes: []`. [Identificadores inmutables de GitHub](https://docs.github.com/en/actions/reference/security/oidc) · [Plan de VetNotify](https://github.com/cristyags/VetNotify/actions/runs/42560565344).

## Despliegue inicial

Comprueba la clave de host SSH con Azure Run Command y guárdala en un `known_hosts` dedicado. La inicialización y las pruebas usan `VET_SSH_TARGET=vetops@FQDN`, `VET_SSH_KEY` y `VET_SSH_KNOWN_HOSTS` con rutas privadas. Si hay problemas de resolución, `VET_SSH_ADDRESS` admite la IPv4 pública estática consultada desde Azure. SSH conserva el FQDN como identificador de la clave conocida. El script invoca `sudo k3s kubectl` por SSH. El kubeconfig administrativo permanece en la VM. Los manifiestos incluyen una cuenta de servicio de release con RBAC acotado por namespace.

```powershell
node scripts/bootstrap-local.mjs C:/ruta-privada/vetnotify-dev.env
# Establece VET_SSH_TARGET, VET_SSH_KEY, VET_SSH_KNOWN_HOSTS, BACKEND_IMAGE, WEB_IMAGE y PUBLIC_ORIGIN.
node --env-file=C:/ruta-privada/vetnotify-dev.env scripts/deploy-k3s.mjs dev
```

Usa imágenes por digest. Para pull privado, instala una credencial dedicada de lectura de GHCR como imagePullSecret fuera de Git, o importa el OCI exacto por SSH al nodo. El script comprueba el nodo, aplica la configuración, suministra secretos desde memoria, espera PostgreSQL y ejecuta el Job de migración y semilla.

Caddy sirve `vetnotify-prod` en el FQDN público. Validación mantiene el NodePort 31080 y producción usa el 31081, con base, PVC y credenciales propios. Los perfiles de fallo están desactivados en producción. El NSG permite 80 y 443 para la entrada y 22 desde la IPv4 administrativa /32. [Gateway público](evidence/qa-main/public-prod.json) · [Separación efectiva](evidence/qa-main/runtime-prod.json).

Para observabilidad en validación, inicia un proceso SSH por Service. Usa el mismo archivo `known_hosts` verificado y la clave dedicada. Ejemplo para Grafana:

```powershell
ssh -i RUTA_CLAVE -o StrictHostKeyChecking=yes -o UserKnownHostsFile=RUTA_HOSTS -L 13001:127.0.0.1:13001 vetops@FQDN 'sudo k3s kubectl -n vetnotify-dev port-forward svc/grafana 13001:3000'
```

Usa `19091:9090` para Prometheus y `16687:16686` para Jaeger. En ambos casos, el puerto local del túnel coincide con el puerto de port-forward en la VM. Las evidencias registran el destino realmente usado. [Estado y accesos](STATUS.md).
