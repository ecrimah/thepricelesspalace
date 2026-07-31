#!/usr/bin/env bash
set -euo pipefail
# Print only whether payment-related env vars are set (never values)
UUID=vbw578yuxwwbq9cenmyiwgxd
ENV_FILE=""
for f in /data/coolify/applications/"$UUID"/.env /data/coolify/applications/*"$UUID"*/*.env; do
  if [ -f "$f" ]; then ENV_FILE="$f"; break; fi
done
if [ -z "$ENV_FILE" ]; then
  # try coolify db / docker inspect
  CID=$(docker ps --format '{{.ID}} {{.Names}}' | awk '/palace/ {print $1; exit}')
  if [ -n "$CID" ]; then
    echo "container=$CID"
    for k in DATABASE_URL HUBTEL_API_ID HUBTEL_API_KEY HUBTEL_MERCHANT_ACCOUNT_NUMBER MOOLRE_API_USER MOOLRE_API_PUBKEY MOOLRE_ACCOUNT_NUMBER MOOLRE_SMS_API_KEY PAYSTACK_SECRET_KEY SUPABASE_SERVICE_ROLE_KEY; do
      v=$(docker exec "$CID" printenv "$k" 2>/dev/null || true)
      if [ -n "$v" ]; then echo "$k=SET"; else echo "$k=MISSING"; fi
    done
    exit 0
  fi
  echo "NO_ENV_FOUND"
  exit 1
fi
echo "env_file=$ENV_FILE"
for k in DATABASE_URL HUBTEL_API_ID HUBTEL_API_KEY HUBTEL_MERCHANT_ACCOUNT_NUMBER MOOLRE_API_USER MOOLRE_API_PUBKEY MOOLRE_ACCOUNT_NUMBER MOOLRE_SMS_API_KEY PAYSTACK_SECRET_KEY SUPABASE_SERVICE_ROLE_KEY; do
  if grep -qE "^${k}=.+" "$ENV_FILE" 2>/dev/null; then echo "$k=SET"; else echo "$k=MISSING"; fi
done
