param(
    [Parameter(Mandatory)][long]$ReleaseRun,
    [Parameter(Mandatory)][ValidatePattern('^[0-9a-f]{40}$')][string]$ExpectedCommit,
    [Parameter(Mandatory)][string]$CredentialsFile,
    [ValidateRange(0,[long]::MaxValue)][long]$ProductionAuthorizationRun = 0
)

$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $true
$repo = 'cristyags/VetNotify'
$target = $env:VET_SSH_TARGET
if ($target -cnotmatch '^vetops@(vetnotify-[a-z0-9]+\.[a-z0-9.-]+)$' -or !$env:VET_SSH_KEY -or !$env:VET_SSH_KNOWN_HOSTS) {
    throw 'Indica el destino VetNotify, la clave privada y el archivo known_hosts verificado.'
}
$env:PUBLIC_ORIGIN = 'https://' + $Matches[1]
$credentials = (Resolve-Path -LiteralPath $CredentialsFile).Path
$ssh = @('-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=yes', '-o', "UserKnownHostsFile=$env:VET_SSH_KNOWN_HOSTS",
    '-o', 'ConnectionAttempts=3', '-o', 'ConnectTimeout=5', '-i', $env:VET_SSH_KEY)

Push-Location (Join-Path $PSScriptRoot '..')
try {
    $run = gh api "repos/$repo/actions/runs/$ReleaseRun" | ConvertFrom-Json
    if ($run.path -cne '.github/workflows/publish.yml' -or $run.event -ne 'push' -or $run.head_branch -notin 'main','work/vetnotify' `
        -or $run.head_sha -cne $ExpectedCommit -or $run.status -ne 'completed' -or $run.conclusion -ne 'success') {
        throw 'Se requiere una ejecución de publicación exitosa para el commit autorizado.'
    }
    $folder = New-Item -ItemType Directory -Force -Path (Join-Path '.runtime' "release-$ReleaseRun-$([guid]::NewGuid().ToString('N'))")
    gh run download $ReleaseRun --repo $repo --name "release-$ExpectedCommit" --dir $folder.FullName
    $release = Get-Content -Raw -LiteralPath (Join-Path $folder.FullName 'release.json') | ConvertFrom-Json
    if ($release.commit -cne $ExpectedCommit -or $release.run -ne [string]$ReleaseRun) {
        throw 'El manifiesto no corresponde a la ejecución autorizada.'
    }
    foreach ($component in 'backend','web') {
        if ($release.$component -cnotmatch "^ghcr\.io/cristyags/vetnotify-$component@sha256:[0-9a-f]{64}$") {
            throw "Referencia OCI inválida para $component."
        }
    }
    $environment = 'dev'
    if ($ProductionAuthorizationRun) {
        $authorization = gh api "repos/$repo/actions/runs/$ProductionAuthorizationRun" | ConvertFrom-Json
        if ($run.head_branch -cne 'main' -or $authorization.path -cne '.github/workflows/deploy.yml' `
            -or $authorization.head_branch -cne 'main' -or $authorization.event -ne 'workflow_dispatch' `
            -or $authorization.conclusion -ne 'success') {
            throw 'Producción requiere publicación y autorización exitosas desde main.'
        }
        $policy = gh api "repos/$repo/branches/main/protection" | ConvertFrom-Json
        if (!$policy.enforce_admins.enabled -or !$policy.required_status_checks.strict `
            -or $policy.required_pull_request_reviews.required_approving_review_count -lt 1 `
            -or 'iac' -notin $policy.required_status_checks.contexts -or 'verify' -notin $policy.required_status_checks.contexts) {
            throw 'main debe conservar los checks y la aprobación obligatoria.'
        }
        gh run download $ProductionAuthorizationRun --repo $repo --name "production-$ExpectedCommit" --dir $folder.FullName
        $approval = Get-Content -Raw -LiteralPath (Join-Path $folder.FullName 'vetnotify-authorization.json') | ConvertFrom-Json
        if ($approval.commit -cne $ExpectedCommit -or $approval.backend -cne $release.backend -or $approval.web -cne $release.web `
            -or $approval.releaseRun -ne [string]$ReleaseRun -or $approval.pr -notmatch '^\d+$') {
            throw 'La aprobación pertenece a otra entrega.'
        }
        $validated = Invoke-RestMethod "$env:PUBLIC_ORIGIN/api/v1/version"
        if ($validated.environment -cne 'dev' -or $validated.commit -cne $ExpectedCommit -or $validated.image -cne $release.backend) {
            throw 'El digest autorizado debe seguir activo en validación.'
        }
        $environment = 'prod'
        $env:VET_PROD_BOOTSTRAP = 'approved'
    }
    gh run download $ReleaseRun --repo $repo --name "oci-$ExpectedCommit" --dir $folder.FullName
    ssh @ssh $target 'mkdir -p vetnotify-oci'
    scp @ssh (Join-Path $folder.FullName 'backend.oci.tar') (Join-Path $folder.FullName 'web.oci.tar') `
        'scripts/import-oci.sh' "${target}:vetnotify-oci/"
    foreach ($component in 'backend','web') {
        $name, $digest = $release.$component -split '@', 2
        ssh @ssh $target "bash vetnotify-oci/import-oci.sh $component $ExpectedCommit $digest $name"
    }
    $env:BACKEND_IMAGE = $release.backend
    $env:WEB_IMAGE = $release.web
    node "--env-file=$credentials" scripts/deploy-k3s.mjs $environment
    $active = if ($environment -eq 'dev') {
        Invoke-RestMethod "$env:PUBLIC_ORIGIN/api/v1/version"
    } else {
        ssh @ssh $target 'curl -fsS --max-time 10 http://127.0.0.1:31081/health/ready >/dev/null && curl -fsS --max-time 10 http://127.0.0.1:31081/api/v1/version' | ConvertFrom-Json
    }
    if ($active.environment -cne $environment -or $active.commit -cne $ExpectedCommit -or $active.image -cne $release.backend) {
        throw 'La versión servida por el gateway del ambiente no coincide con la entrega.'
    }
    $active | ConvertTo-Json
} finally {
    Pop-Location
}
