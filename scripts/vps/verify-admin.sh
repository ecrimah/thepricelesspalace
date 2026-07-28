#!/usr/bin/env bash
set -euo pipefail
BASE=https://thepricelesspalace.com

echo "== auth login =="
RESP=$(curl -sS -X POST "$BASE/auth/v1/token?grant_type=password" \
  -H 'Content-Type: application/json' \
  -H 'apikey: palace-anon-key' \
  -d '{"email":"admin@palace.com","password":"admin123"}')
echo "$RESP" | head -c 500
echo

TOKEN=$(echo "$RESP" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("access_token",""))' 2>/dev/null || true)
if [[ -z "$TOKEN" ]]; then
  echo "LOGIN_FAILED"
  exit 1
fi
echo "LOGIN_OK token_len=${#TOKEN}"

echo "== admin me =="
curl -sS "$BASE/api/admin/me" -H "Authorization: Bearer $TOKEN" -H 'Cookie: sb-access-token='"$TOKEN" | head -c 400
echo

echo "== product image =="
curl -sS -o /dev/null -w "img=%{http_code}\n" \
  https://thepricelesspalace.com/products/product-blue-midi-dress.png
