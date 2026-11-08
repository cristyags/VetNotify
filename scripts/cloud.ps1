param(
    [Parameter(Mandatory)][ValidateSet('status','start','stop','plan','apply','destroy')][string]$Action,
    [Parameter(Mandatory)][string]$Subscription,
    [Parameter(Mandatory)][ValidatePattern('^[a-z0-9]{6,12}$')][string]$Suffix,
    [string]$BackendFile,
    [string]$VarsFile,
    [string]$PlanPath,
    [string]$ConfirmResourceGroup
)
$ErrorActionPreference = 'Stop'
$group = "rg-vetnotify-$Suffix"
$vm = "vetnotify-$Suffix"
$selected = az account show --query id -o tsv
if ($LASTEXITCODE -or $selected -ne $Subscription) { throw 'Selecciona explícitamente la suscripción autorizada con az account set.' }
$exists = az group exists --name $group --subscription $Subscription
if ($LASTEXITCODE) { throw 'No se pudo verificar el grupo de recursos.' }
if ($exists -eq 'true') {
    $project = az group show --name $group --subscription $Subscription --query tags.Project -o tsv
    if ($LASTEXITCODE -or $project -ne 'VetNotify') { throw 'El grupo no tiene la etiqueta VetNotify.' }
} elseif ($Action -ne 'plan' -and $Action -ne 'apply') { throw 'El grupo de VetNotify no existe.' }

if ($Action -eq 'status') {
    az vm get-instance-view --name $vm --resource-group $group --subscription $Subscription --query 'instanceView.statuses[].displayStatus' -o tsv
} elseif ($Action -eq 'start') {
    az vm start --name $vm --resource-group $group --subscription $Subscription
} elseif ($Action -eq 'stop') {
    az vm deallocate --name $vm --resource-group $group --subscription $Subscription
} else {
    $root = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '../infra/terraform/main')).Path
    if (!$BackendFile -or !$VarsFile -or !$PlanPath) { throw 'Indica backend, variables y ruta de plan fuera del repositorio.' }
    $backend = (Resolve-Path -LiteralPath $BackendFile).Path
    $vars = (Resolve-Path -LiteralPath $VarsFile).Path
    if ((Get-Content -Raw -LiteralPath $backend) -notmatch "vetnotifyst$Suffix" -or
        (Get-Content -Raw -LiteralPath $vars) -notmatch [regex]::Escape($Subscription) -or
        (Get-Content -Raw -LiteralPath $vars) -notmatch [regex]::Escape($Suffix)) {
        throw 'Los archivos no identifican la suscripción y el backend esperados.'
    }
    terraform -chdir="$root" init -input=false -backend-config="$backend"
    if ($LASTEXITCODE) { exit $LASTEXITCODE }
    if ($Action -eq 'apply') {
        $p = terraform -chdir="$root" show -json "$PlanPath" | ConvertFrom-Json -Depth 100
        if ($LASTEXITCODE -or $p.variables.subscription_id.value -ne $Subscription -or $p.variables.suffix.value -ne $Suffix) {
            throw 'El plan guardado pertenece a otro destino.'
        }
        $deletes = @($p.resource_changes | Where-Object { $_.change.actions -contains 'delete' })
        if ($deletes.Count -and $ConfirmResourceGroup -ne $group) { throw 'El plan contiene eliminaciones. Revisa y confirma el grupo exacto.' }
        terraform -chdir="$root" apply -input=false "$PlanPath"
    } else {
        $flags = @()
        if ($Action -eq 'destroy') { $flags = @('-destroy') }
        terraform -chdir="$root" plan -input=false -var-file="$vars" -out="$PlanPath" @flags
        if ($Action -eq 'destroy' -and !$LASTEXITCODE) { Write-Output 'Plan de eliminación generado. Revisa el plan y usa apply con ConfirmResourceGroup.' }
    }
}
exit $LASTEXITCODE
