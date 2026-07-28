#!/usr/bin/env bash
set -euo pipefail
TOKEN=$(cat /data/fleet/secrets/coolify-api.token)
API=http://127.0.0.1:8000/api/v1
APP=vbw578yuxwwbq9cenmyiwgxd
DEP=mywfkmr6o7ooymkvqbc1ivcg
H=(-H "Authorization: Bearer ${TOKEN}")

for i in $(seq 1 90); do
  STATUS=$(curl -sS "${H[@]}" "$API/applications/$APP" | jq -r '.status // empty')
  DEP_STATUS=$(curl -sS "${H[@]}" "$API/deployments/$DEP" | jq -r '.status // empty')
  echo "[$i] app=$STATUS dep=$DEP_STATUS"
  if [[ "$STATUS" == "running:healthy" ]]; then
    echo READY
    exit 0
  fi
  if [[ "$DEP_STATUS" == "failed" ]]; then
    echo FAILED
    exit 1
  fi
  sleep 20
done
echo TIMEOUT
exit 1
