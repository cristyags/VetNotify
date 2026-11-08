param(
    [Parameter(Mandatory)][string]$OutputDirectory
)
$ErrorActionPreference = 'Stop'
$revision = (git rev-parse HEAD).Trim()
if ($LASTEXITCODE -or $revision -notmatch '^[0-9a-f]{40}$') { throw 'Se requiere un commit local.' }
if ((git status --porcelain --untracked-files=no -- apps clients packages Dockerfile Dockerfile.web package.json package-lock.json infra/local)) {
    throw 'Confirma los cambios del código antes de construir imágenes trazables.'
}
$out = (New-Item -ItemType Directory -Path $OutputDirectory -Force).FullName
$refs = [ordered]@{ commit = $revision }
foreach ($component in 'backend','web') {
    $dockerFile = if ($component -eq 'web') { 'Dockerfile.web' } else { 'Dockerfile' }
    $name = "vetnotify-$component"
    $tag = "docker.io/library/${name}:${revision}"
    docker buildx build --platform linux/amd64 --provenance=false --sbom=false --file $dockerFile `
        --build-arg "REVISION=$revision" --label 'org.opencontainers.image.source=https://github.com/cristyags/VetNotify' `
        --tag $tag --output "type=oci,dest=$out/$component.oci.tar" --metadata-file "$out/$component.meta.json" .
    if ($LASTEXITCODE) { exit $LASTEXITCODE }
    $digest = (Get-Content -Raw -LiteralPath "$out/$component.meta.json" | ConvertFrom-Json).'containerimage.digest'
    if ($digest -notmatch '^sha256:[0-9a-f]{64}$') { throw 'Digest de imagen inválido.' }
    $refs[$component] = "docker.io/library/$name@$digest"
    $refs["${component}Tag"] = $tag
}
$refs | ConvertTo-Json | Set-Content -LiteralPath "$out/release.json" -Encoding utf8
Get-Content -LiteralPath "$out/release.json"
