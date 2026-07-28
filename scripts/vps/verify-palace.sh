#!/usr/bin/env bash
set -euo pipefail
TOKEN=$(cat /data/fleet/secrets/coolify-api.token)
API=http://127.0.0.1:8000/api/v1
APP=vbw578yuxwwbq9cenmyiwgxd
H=(-H "Authorization: Bearer ${TOKEN}")

echo "== coolify =="
curl -sS "${H[@]}" "$API/applications/$APP" | jq '{name,status,fqdn}'

echo "== docker =="
docker ps --format '{{.Names}} {{.Status}}' | grep vbw578 || true

echo "== http host =="
curl -sS -o /dev/null -w "local80=%{http_code}\n" -H 'Host: thepricelesspalace.com' http://127.0.0.1/ || true
curl -sS -o /dev/null -w "https=%{http_code}\n" https://thepricelesspalace.com/ || true
curl -sS -o /dev/null -w "shop=%{http_code}\n" https://thepricelesspalace.com/shop || true
curl -sS -o /dev/null -w "admin=%{http_code}\n" https://thepricelesspalace.com/admin/login || true

echo "== moolre callback GET =="
curl -sS https://thepricelesspalace.com/api/payment/moolre/callback || true
echo

echo "== products rest =="
curl -sS 'https://thepricelesspalace.com/rest/v1/products?select=name,slug&limit=3' \
  -H 'apikey: palace-anon-key' -H 'Authorization: Bearer palace-anon-key' || true
echo

echo "== moolre callback unauthorized =="
curl -sS -o /dev/null -w "post_no_secret=%{http_code}\n" \
  -X POST https://thepricelesspalace.com/api/payment/moolre/callback \
  -H 'Content-Type: application/json' \
  -d '{"data":{"externalref":"TEST"}}' || true
