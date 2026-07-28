#!/usr/bin/env bash
set -euo pipefail
TOKEN=$(cat /data/fleet/secrets/coolify-api.token)
API=http://127.0.0.1:8000/api/v1
DEP=vhnj75v31v107jn6gt1ekm0m
H=(-H "Authorization: Bearer ${TOKEN}")

curl -sS "${H[@]}" "$API/deployments/$DEP" | jq -r '.logs' > /tmp/palace-dep-logs.json
python3 - <<'PY'
import json
raw=open('/tmp/palace-dep-logs.json').read()
logs=json.loads(raw)
# logs may be a JSON string
if isinstance(logs,str):
    logs=json.loads(logs)
for row in logs:
    t=row.get('type')
    o=row.get('output') or ''
    if o.strip():
        print(f"[{t}] {o}")
PY

echo "== compose =="
sed -n '1,120p' /data/coolify/applications/vbw578yuxwwbq9cenmyiwgxd/docker-compose.yaml
