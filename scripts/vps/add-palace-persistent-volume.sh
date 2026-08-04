#!/usr/bin/env bash
# Register Coolify persistent storage for palace-app (survives redeploys).
set -euo pipefail
PASS="${1:?}"
UUID=$(python3 -c 'import secrets; print(secrets.token_urlsafe(18)[:24].lower().replace("_","a").replace("-","b"))')
NAME="vbw578yuxwwbq9cenmyiwgxd-palace-uploads"
HOST=/var/www/palace/uploads
MOUNT=/var/www/palace/uploads

echo "$PASS" | sudo -S mkdir -p "$HOST/product-images" "$HOST/category-images" "$HOST/avatars" "$HOST/blog-covers"

echo "$PASS" | sudo -S docker exec coolify-db psql -U coolify -d coolify -v ON_ERROR_STOP=1 -c "
INSERT INTO local_persistent_volumes
  (name, mount_path, host_path, resource_type, resource_id, created_at, updated_at, is_preview_suffix_enabled, uuid)
SELECT
  '$NAME',
  '$MOUNT',
  '$HOST',
  'App\\Models\\Application',
  53,
  NOW(),
  NOW(),
  false,
  '$UUID'
WHERE NOT EXISTS (
  SELECT 1 FROM local_persistent_volumes
  WHERE resource_id = 53 AND mount_path = '$MOUNT'
);
"

echo "$PASS" | sudo -S docker exec coolify-db psql -U coolify -d coolify -c "
SELECT id, name, mount_path, host_path, resource_id, uuid
FROM local_persistent_volumes WHERE resource_id = 53;"

# Ensure compose has the volume right now
APPDIR=/data/coolify/applications/vbw578yuxwwbq9cenmyiwgxd
COMPOSE="$APPDIR/docker-compose.yaml"
if ! echo "$PASS" | sudo -S grep -q "$HOST:$MOUNT" "$COMPOSE"; then
  echo "$PASS" | sudo -S python3 - <<'PY'
from pathlib import Path
p = Path("/data/coolify/applications/vbw578yuxwwbq9cenmyiwgxd/docker-compose.yaml")
text = p.read_text()
if "/var/www/palace/uploads" not in text:
    lines = text.splitlines(True)
    out=[]; inserted=False
    for line in lines:
        out.append(line)
        if (not inserted) and line.strip() == "- .env":
            out.append("        volumes:\n")
            out.append("            - '/var/www/palace/uploads:/var/www/palace/uploads'\n")
            inserted=True
    p.write_text("".join(out))
    print("patched compose")
else:
    print("compose already ok")
PY
  echo "$PASS" | sudo -S bash -c "cd '$APPDIR' && docker compose up -d --force-recreate --remove-orphans"
fi

APP=$(echo "$PASS" | sudo -S docker ps --format '{{.ID}} {{.Image}}' | grep vbw578 | awk '{print $1}' | head -1)
echo "FINAL_IMAGE=$(echo "$PASS" | sudo -S docker ps --format '{{.Image}}' | grep vbw578 | head -1)"
echo "container_files=$(echo "$PASS" | sudo -S docker exec "$APP" sh -c 'ls /var/www/palace/uploads/product-images | wc -l')"
echo "host_files=$(echo "$PASS" | sudo -S ls "$HOST/product-images" | wc -l)"

# Spot-check a few product image URLs
echo "$PASS" | sudo -S docker exec fleet-postgres psql -U postgres -d store_palace -At -c "
SELECT url FROM product_images ORDER BY created_at DESC LIMIT 5;" | while read -r u; do
  code=$(curl -sS -o /dev/null -w '%{http_code}' -L --max-time 8 "$u" || echo ERR)
  echo "$code $u"
done
