#!/usr/bin/env bash
set -euo pipefail
ns="${1:?namespace}"
[[ "$ns" == vetnotify-dev || "$ns" == vetnotify-prod ]]
[[ "$KUBE_CONTEXT" == "$ns-release" ]]
[[ "$BACKEND" =~ @sha256:[0-9a-f]{64}$ && "$WEB" =~ @sha256:[0-9a-f]{64}$ && "$COMMIT" =~ ^[0-9a-f]{40}$ ]]
k=(kubectl --context "$KUBE_CONTEXT" -n "$ns")
patch=$(jq -n --arg ref "$BACKEND" '{spec:{template:{spec:{containers:[{name:"api",image:$ref,env:[{name:"IMAGE_REF",value:$ref,valueFrom:null}]}]}}}}')
"${k[@]}" patch deployment/api --type=strategic -p "$patch"
for app in worker-email worker-internal simulator agenda laboratorio probe; do
  "${k[@]}" set image "deployment/$app" "$app=$BACKEND"
done
"${k[@]}" set image deployment/web "web=$WEB"
for app in api worker-email worker-internal simulator agenda laboratorio probe web; do
  "${k[@]}" rollout status "deployment/$app" --timeout=150s
done
curl --fail --silent --show-error --retry 4 "$BASE_URL/health/ready" >/dev/null
version=$(curl --fail --silent --show-error "$BASE_URL/api/v1/version")
jq -e --arg commit "$COMMIT" --arg backend "$BACKEND" '.commit==$commit and .image==$backend' <<< "$version"
curl --fail --silent --show-error "$BASE_URL/" >/dev/null
