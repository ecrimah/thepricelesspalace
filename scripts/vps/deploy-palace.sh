#!/usr/bin/env bash
set -euo pipefail
TOKEN=$(cat /data/fleet/secrets/coolify-api.token)
API=http://127.0.0.1:8000/api/v1
APP=vbw578yuxwwbq9cenmyiwgxd
H=(-H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json")

mkdir -p /var/www/palace/uploads
chmod 755 /var/www/palace /var/www/palace/uploads || true

curl -sS -X POST "${H[@]}" "$API/applications/$APP/storages" -d '{
  "name": "palace-uploads",
  "mount_path": "/var/www/palace/uploads",
  "host_path": "/var/www/palace/uploads",
  "type": "local"
}' | jq . || true

echo "==> deploying"
sudo fleet deploy palace-app
echo "DEPLOY_TRIGGERED"
