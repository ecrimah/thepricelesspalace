#!/usr/bin/env bash
set -euo pipefail
TOKEN=$(cat /data/fleet/secrets/coolify-api.token)
API=http://127.0.0.1:8000/api/v1
APP=vbw578yuxwwbq9cenmyiwgxd
H=(-H "Authorization: Bearer ${TOKEN}")

echo "== app =="
curl -sS "${H[@]}" "$API/applications/$APP" | jq '{name,status,fqdn,git_repository,git_branch,build_pack,ports_exposes}'

echo "== recent deployments =="
# Coolify may store deployments under application
curl -sS "${H[@]}" "$API/deployments" 2>/dev/null | jq --arg app "$APP" '[.[] | select(.application_id==$app or .application_uuid==$app or .resource_uuid==$app)] | .[0:5]' 2>/dev/null || true

echo "== deployment vhnj75 =="
curl -sS "${H[@]}" "$API/deployments/vhnj75v31v107jn6gt1ekm0m" | jq '{status,deployment_status,message,error,logs}' 2>/dev/null | head -c 4000 || true

echo "== find coolify app dir =="
ls -la /data/coolify/applications/ 2>/dev/null | head
APPDIR=$(ls -d /data/coolify/applications/$APP 2>/dev/null || true)
if [[ -n "$APPDIR" ]]; then
  echo "APPDIR=$APPDIR"
  ls -la "$APPDIR" | head
  # latest deployment log
  find "$APPDIR" -name '*.log' 2>/dev/null | head
fi

echo "== docker ps palace =="
docker ps -a --format '{{.Names}}\t{{.Status}}' | grep -i palace || true

echo "== last deployment folders =="
ls -lt /data/coolify/applications/$APP/ 2>/dev/null | head -20 || true
