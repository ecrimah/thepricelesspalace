#!/usr/bin/env bash
set -euo pipefail
TOKEN=$(cat /data/fleet/secrets/coolify-api.token)
API=http://127.0.0.1:8000/api/v1
APP=vbw578yuxwwbq9cenmyiwgxd
H=(-H "Authorization: Bearer ${TOKEN}")

for i in $(seq 1 80); do
  STATUS=$(curl -sS "${H[@]}" "$API/applications/$APP" | jq -r '.status // empty')
  echo "[$i] app=$STATUS"
  case "$STATUS" in
    running:healthy)
      echo READY
      exit 0
      ;;
    *:error|exited:unhealthy)
      if [[ "$i" -gt 20 ]]; then
        echo "Still unhealthy after build window — dumping recent deployment"
        curl -sS "${H[@]}" "$API/applications/$APP" | jq '{name,status,fqdn,git_repository,git_branch}'
        # try deployment list
        curl -sS "${H[@]}" "$API/deployments?application_uuid=$APP" 2>/dev/null | jq '.[0:3]' || true
      fi
      ;;
  esac
  sleep 20
done
echo TIMEOUT
exit 1
