#!/usr/bin/env bash
set -euo pipefail
TOKEN=$(sudo cat /data/fleet/secrets/coolify-api.token)
API=http://127.0.0.1:8000/api/v1
H=(-H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json")

echo "== apps =="
curl -sS "${H[@]}" "$API/applications" | jq -r '.[] | select(.name|test("kiyas|vees|mamator|palace|priceless";"i")) | [.name,.uuid,.git_repository,.git_branch,.build_pack,.ports_exposes,.fqdn] | @tsv'

echo "== kiyas env keys =="
APP=$(curl -sS "${H[@]}" "$API/applications" | jq -r '.[] | select(.name=="kiyas-app") | .uuid' | head -1)
if [[ -n "$APP" ]]; then
  curl -sS "${H[@]}" "$API/applications/$APP/envs" | jq -r '.[].key' | sort
  echo "== kiyas sample =="
  curl -sS "${H[@]}" "$API/applications/$APP" | jq '{name,uuid,fqdn,git_repository,git_branch,build_pack,ports_exposes,dockerfile_location,base_directory}'
fi

echo "== docker ports =="
sudo docker ps --format '{{.Names}} {{.Ports}}' 2>/dev/null | grep -E 'postgres|pgbouncer|fleet' || true
