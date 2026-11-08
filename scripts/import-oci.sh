#!/usr/bin/env bash
set -euo pipefail
component="${1:?backend|web}"
revision="${2:?commit}"
digest="${3:?digest}"
[[ "$component" == backend || "$component" == web ]]
[[ "$revision" =~ ^[0-9a-f]{40}$ && "$digest" =~ ^sha256:[0-9a-f]{64}$ ]]
archive="$HOME/vetnotify-oci/$component.oci.tar"
ref="docker.io/library/vetnotify-$component"
test -f "$archive"
hex="${digest#sha256:}"
actual=$(tar -xOf "$archive" "blobs/sha256/$hex" | sha256sum | cut -d ' ' -f 1)
[[ "$actual" == "$hex" ]]
sudo k3s ctr -n k8s.io images import --digests "$archive"
if ! sudo k3s ctr -n k8s.io images ls -q | grep -Fx "$ref@$digest" >/dev/null; then
  source="$ref:$revision"
  if ! sudo k3s ctr -n k8s.io images ls -q | grep -Fx "$source" >/dev/null; then
    source=$(sudo k3s ctr -n k8s.io images ls | awk -v digest="$digest" '$3 == digest {print $1;exit}')
  fi
  sudo k3s ctr -n k8s.io images tag "$source" "$ref@$digest"
fi
sudo k3s ctr -n k8s.io images ls | awk -v ref="$ref@$digest" -v digest="$digest" '$1==ref && $3==digest {found=1;print} END {exit !found}'
