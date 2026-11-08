# Infraestructura y reconstrucción

## Requisitos

Sesión Azure CLI con suscripción Azure for Students autorizada, crédito comprobado, cuota para una VM de 2 vCPU y una identidad con permisos para crear recursos y asignar los roles indicados. Instala Terraform 1.16.5, kubectl, OpenSSH, Node y Docker. Verifica una versión de imagen Ubuntu con `az vm image show` en la región y conserva la versión exacta. La ejecución inicial usa México Central, zona 2 y B2as v2 (2 vCPU / 8 GiB).

## Bootstrap y plan

1. Genera una clave ED25519 dedicada y conserva la privada fuera del repositorio. Identifica la IPv4 administrativa /32.
2. Selecciona la suscripción con `az account set --subscription ID`. Ejecuta `terraform -chdir=infra/terraform/bootstrap init`. Planifica con `-var subscription_id=ID -var suffix=SUFIJO` y ruta de estado local privada. Revisa y aplica el plan guardado.
3. Copia `backend.hcl.example` y `terraform.tfvars.example` fuera de Git y completa los valores. El backend usa Azure CLI/Entra, lease y contenedor privado. El bootstrap asigna `Storage Blob Data Contributor` al operador sobre ese contenedor.
4. Usa `npm run infra-plan -- -Subscription ID -Suffix SUFIJO -BackendFile RUTA -VarsFile RUTA -PlanPath RUTA`. Revisa acciones y destino. Usa `npm run infra-apply --` con los mismos parámetros para aplicar ese archivo.
5. Cloud-init instala K3s con versión fijada, cifrado de Secrets y kubeconfig 0600. Instala Caddy verificado con checksum. Comprueba `cloud-init status --long`, `sudo k3s kubectl get nodes` y `sudo systemctl status vetnotify-edge`.

El código de bootstrap y estado se conserva al eliminar el workload. El plan autenticado de GitHub requiere federación solo desde `main`, Reader en el grupo del proyecto y permiso de datos para el lease del blob. Concede el permiso al principal de salida `plan_principal_id` exclusivamente sobre el contenedor. El rol de propietario queda para el bootstrap y la operación administrativa.

## Despliegue inicial

Comprueba la clave de host SSH con Azure Run Command y guárdala en un `known_hosts` dedicado. La inicialización y las pruebas usan `VET_SSH_TARGET=vetops@FQDN`, `VET_SSH_KEY` y `VET_SSH_KNOWN_HOSTS` con rutas privadas. Si hay problemas de resolución, `VET_SSH_ADDRESS` admite la IPv4 pública estática consultada desde Azure. SSH conserva el FQDN como identificador de la clave conocida. El script invoca `sudo k3s kubectl` por SSH. El kubeconfig administrativo permanece en la VM. Los manifiestos incluyen una cuenta de servicio de release con RBAC acotado por namespace.

```powershell
node scripts/bootstrap-local.mjs C:/ruta-privada/vetnotify-dev.env
# Establece VET_SSH_TARGET, VET_SSH_KEY, VET_SSH_KNOWN_HOSTS, BACKEND_IMAGE, WEB_IMAGE y PUBLIC_ORIGIN.
node --env-file=C:/ruta-privada/vetnotify-dev.env scripts/deploy-k3s.mjs dev
```

Usa imágenes por digest. Para pull privado, instala una credencial dedicada de lectura de GHCR como imagePullSecret fuera de Git, o importa el OCI exacto por SSH al nodo. El script comprueba el nodo, aplica la configuración, suministra secretos desde memoria, espera PostgreSQL y ejecuta el Job de migración y semilla.

Caddy expone el gateway de validación (NodePort 31080) en el FQDN de Azure. Producción usa otro namespace, contraseña, bases y NodePort (31081), con perfiles de fallo desactivados. La exposición pública se cambia a producción después de su aprobación y verificación. El NodePort no está abierto a Internet en el NSG.

Para observabilidad en validación, inicia un proceso SSH por Service. Usa el mismo archivo `known_hosts` verificado y la clave dedicada. Ejemplo para Grafana:

```powershell
ssh -i RUTA_CLAVE -o StrictHostKeyChecking=yes -o UserKnownHostsFile=RUTA_HOSTS -L 13001:127.0.0.1:13001 vetops@FQDN 'sudo k3s kubectl -n vetnotify-dev port-forward svc/grafana 13001:3000'
```

Usa `19091:9090` para Prometheus y `16687:16686` para Jaeger. En ambos casos, el puerto local del túnel coincide con el puerto de port-forward en la VM. Las evidencias registran el destino realmente usado. [Estado y accesos](STATUS.md).
