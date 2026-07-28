#!/usr/bin/env bash
set -euo pipefail

TOKEN=$(sudo cat /data/fleet/secrets/coolify-api.token)
API="${COOLIFY_API:-http://127.0.0.1:8000/api/v1}"
H=(-H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json")

SERVER_UUID="d11ltfeuj6qtltuts2lx8f7l"
DEST_UUID="y1437r4odlo133ltek1l5uyb"

STORE_PASS=$(grep -E "^STORE_PASS=" /data/fleet/secrets/store_palace.env | cut -d= -f2- | tr -d "'\"")
DATABASE_URL="postgres://store_palace:${STORE_PASS}@fleet-pgbouncer:6432/store_palace"
DIRECT_URL="postgres://store_palace:${STORE_PASS}@fleet-postgres:5432/store_palace"

# Strong secrets (generated once; reused if file exists)
SECRETS_FILE=/data/fleet/secrets/palace-app.env
if [[ ! -f "$SECRETS_FILE" ]]; then
  umask 077
  {
    echo "AUTH_JWT_SECRET=$(openssl rand -hex 48)"
    echo "STORAGE_SIGNING_SECRET=$(openssl rand -hex 32)"
    echo "SUPABASE_SERVICE_ROLE_KEY=$(openssl rand -hex 32)"
    echo "CRON_SECRET=$(openssl rand -hex 24)"
  } > "$SECRETS_FILE"
  chmod 600 "$SECRETS_FILE"
fi
# shellcheck disable=SC1090
source "$SECRETS_FILE"

GIT_REPO="${GIT_REPO:-ecrimah/thepricelesspalace}"
GIT_BRANCH="${GIT_BRANCH:-staging/plain-postgres}"

echo "==> ensure uploads dir"
mkdir -p /var/www/palace/uploads
chmod 755 /var/www/palace /var/www/palace/uploads || true

PROJECT_UUID=$(curl -sS "${H[@]}" "$API/projects" | jq -r '.[] | select(.name=="palace") | .uuid' | head -1)
if [[ -z "$PROJECT_UUID" ]]; then
  echo "==> create project palace"
  PROJECT_UUID=$(curl -sS -X POST "${H[@]}" "$API/projects" -d '{
    "name": "palace",
    "description": "The Priceless Palace storefront (plain Postgres)"
  }' | jq -r '.uuid // empty')
  [[ -n "$PROJECT_UUID" ]] || { echo "failed to create project"; exit 1; }
else
  echo "==> project exists: $PROJECT_UUID"
fi

ENV_UUID=$(curl -sS "${H[@]}" "$API/projects/$PROJECT_UUID" | jq -r '.environments[] | select(.name=="production") | .uuid' | head -1)
echo "PROJECT_UUID=$PROJECT_UUID ENV_UUID=$ENV_UUID"

APP_UUID=$(curl -sS "${H[@]}" "$API/applications" | jq -r '.[] | select(.name=="palace-app") | .uuid' | head -1)
if [[ -z "$APP_UUID" ]]; then
  echo "==> create application palace-app"
  CREATE_RESP=$(curl -sS -X POST "${H[@]}" "$API/applications/public" -d "$(jq -n \
    --arg project_uuid "$PROJECT_UUID" \
    --arg server_uuid "$SERVER_UUID" \
    --arg environment_name "production" \
    --arg environment_uuid "$ENV_UUID" \
    --arg destination_uuid "$DEST_UUID" \
    --arg git_repository "$GIT_REPO" \
    --arg git_branch "$GIT_BRANCH" \
    --arg build_pack "nixpacks" \
    --arg ports_exposes "3000" \
    --arg name "palace-app" \
    --arg description "The Priceless Palace Next.js storefront" \
    --arg domains "https://thepricelesspalace.com,https://www.thepricelesspalace.com,https://palace.169-58-8-203.sslip.io" \
    --argjson instant_deploy false \
    --argjson is_auto_deploy_enabled false \
    --argjson autogenerate_domain false \
    '{
      project_uuid: $project_uuid,
      server_uuid: $server_uuid,
      environment_name: $environment_name,
      environment_uuid: $environment_uuid,
      destination_uuid: $destination_uuid,
      git_repository: $git_repository,
      git_branch: $git_branch,
      build_pack: $build_pack,
      ports_exposes: $ports_exposes,
      name: $name,
      description: $description,
      domains: $domains,
      instant_deploy: $instant_deploy,
      is_auto_deploy_enabled: $is_auto_deploy_enabled,
      autogenerate_domain: $autogenerate_domain
    }')")
  echo "$CREATE_RESP" | jq .
  APP_UUID=$(echo "$CREATE_RESP" | jq -r '.uuid // empty')
  [[ -n "$APP_UUID" ]] || { echo "FAILED creating app"; exit 1; }
else
  echo "==> app already exists: $APP_UUID"
  curl -sS -X PATCH "${H[@]}" "$API/applications/$APP_UUID" -d "$(jq -n \
    --arg git_repository "$GIT_REPO" \
    --arg git_branch "$GIT_BRANCH" \
    '{
      name: "palace-app",
      build_pack: "nixpacks",
      ports_exposes: "3000",
      fqdn: "https://thepricelesspalace.com,https://www.thepricelesspalace.com,https://palace.169-58-8-203.sslip.io",
      git_repository: $git_repository,
      git_branch: $git_branch
    }')" | jq '{uuid,name,message,fqdn,ports_exposes,build_pack}' || true
fi

echo "APP_UUID=$APP_UUID"

set_env() {
  local key="$1" value="$2"
  local resp
  resp=$(curl -sS -X POST "${H[@]}" "$API/applications/$APP_UUID/envs" -d "$(jq -n \
    --arg key "$key" --arg value "$value" \
    '{key:$key, value:$value, is_literal:true, is_preview:false, is_multiline:false, is_buildtime:true, is_runtime:true}')")
  if echo "$resp" | jq -e '.uuid' >/dev/null 2>&1; then
    echo "  + $key"
    return
  fi
  resp=$(curl -sS -X PATCH "${H[@]}" "$API/applications/$APP_UUID/envs" -d "$(jq -n \
    --arg key "$key" --arg value "$value" \
    '{key:$key, value:$value, is_literal:true, is_buildtime:true, is_runtime:true}')")
  if echo "$resp" | jq -e '.uuid // .message' >/dev/null 2>&1; then
    echo "  ~ $key"
    return
  fi
  echo "  ! $key failed: $resp"
}

echo "==> wire environment variables"
set_env "NODE_ENV" "production"
set_env "PORT" "3000"
set_env "HOSTNAME" "0.0.0.0"
set_env "APP_NAME" "The Priceless Palace"
set_env "NEXT_PUBLIC_APP_URL" "https://thepricelesspalace.com"
set_env "NEXT_PUBLIC_ALLOW_INDEXING" "true"
set_env "DATABASE_URL" "$DATABASE_URL"
set_env "POSTGRES_URL" "$DIRECT_URL"
set_env "DIRECT_URL" "$DIRECT_URL"
set_env "NEXT_PUBLIC_USE_PLAIN_PG" "true"
set_env "NEXT_PUBLIC_SUPABASE_URL" "https://thepricelesspalace.com"
set_env "NEXT_PUBLIC_SUPABASE_ANON_KEY" "palace-anon-key"
set_env "SUPABASE_SERVICE_ROLE_KEY" "$SUPABASE_SERVICE_ROLE_KEY"
set_env "AUTH_JWT_SECRET" "$AUTH_JWT_SECRET"
set_env "JWT_SECRET" "$AUTH_JWT_SECRET"
set_env "SUPABASE_JWT_SECRET" "$AUTH_JWT_SECRET"
set_env "STORAGE_ROOT" "/var/www/palace/uploads"
set_env "STORAGE_PUBLIC_URL" "https://thepricelesspalace.com"
set_env "STORAGE_SIGNING_SECRET" "$STORAGE_SIGNING_SECRET"
set_env "STORAGE_LOCAL_PATH" "/var/www/palace/uploads"
set_env "EMAIL_FROM" "The Priceless Palace <noreply@thepricelesspalace.com>"
set_env "CONTACT_PHONE" "+233 20 178 3800"
set_env "SMS_SENDER_ID" "THEPPALACE"
set_env "NEXT_PUBLIC_CHAT_ENABLED" "true"
set_env "CRON_SECRET" "$CRON_SECRET"
set_env "MOOLRE_BASE_URL" "https://api.moolre.com"

# Optional secrets from companion file if present
ENV_SRC="${ENV_SRC:-/home/tay/palace-env.local}"
if [[ -f "$ENV_SRC" ]]; then
  echo "==> merging secrets from $ENV_SRC"
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ -z "${line// }" ]] && continue
    key=${line%%=*}
    val=${line#*=}
    val=${val%\"}
    val=${val#\"}
    val=${val%\'}
    val=${val#\'}
    case "$key" in
      RESEND_API_KEY|MOOLRE_API_USER|MOOLRE_API_PUBKEY|MOOLRE_SMS_API_KEY|MOOLRE_ACCOUNT_NUMBER|MOOLRE_CALLBACK_SECRET|MOOLRE_MERCHANT_EMAIL|HUBTEL_API_ID|HUBTEL_API_KEY|HUBTEL_MERCHANT_ACCOUNT_NUMBER|PAYSTACK_SECRET_KEY|GROQ_API_KEY|ADMIN_EMAIL|ADMIN_PASSWORD)
        if [[ -n "$val" ]]; then set_env "$key" "$val"; fi
        ;;
    esac
  done < "$ENV_SRC"
fi

echo "==> persistent uploads storage"
curl -sS -X POST "${H[@]}" "$API/applications/$APP_UUID/storages" -d '{
  "name": "palace-uploads",
  "mount_path": "/var/www/palace/uploads",
  "host_path": "/var/www/palace/uploads"
}' | jq . 2>/dev/null || true

echo "==> verify"
curl -sS "${H[@]}" "$API/applications/$APP_UUID" | jq '{name,uuid,fqdn,git_repository,git_branch,build_pack,ports_exposes,status}'
echo "READY_APP_NAME=palace-app"
echo "READY_APP_UUID=$APP_UUID"
echo "Deploy with: sudo fleet deploy palace-app"
