#!/usr/bin/env bash
set -euo pipefail
PASS="${1:?password required}"
SHA="${2:-095efc0}"

echo "$PASS" | sudo -S true

for i in $(seq 1 60); do
  img=$(echo "$PASS" | sudo -S docker ps --format '{{.Image}}' | grep vbw578 | head -1 || true)
  echo "--- $i $img ---"
  if echo "$img" | grep -qi "$SHA"; then
    echo IMAGE_LIVE
    break
  fi
  sleep 30
done

APPDIR=/data/coolify/applications/vbw578yuxwwbq9cenmyiwgxd
COMPOSE="$APPDIR/docker-compose.yaml"
HOST=/var/www/palace/uploads

echo "$PASS" | sudo -S mkdir -p "$HOST/product-images" "$HOST/category-images"

HAS_VOL=$(echo "$PASS" | sudo -S grep -c "/var/www/palace/uploads:/var/www/palace/uploads" "$COMPOSE" || true)
if [ "${HAS_VOL:-0}" = "0" ]; then
  echo "$PASS" | sudo -S python3 - <<'PY'
from pathlib import Path
p = Path("/data/coolify/applications/vbw578yuxwwbq9cenmyiwgxd/docker-compose.yaml")
text = p.read_text()
if "/var/www/palace/uploads" not in text:
    lines = text.splitlines(True)
    out = []
    inserted = False
    for line in lines:
        out.append(line)
        if (not inserted) and line.strip() == "- .env":
            out.append("        volumes:\n")
            out.append("            - '/var/www/palace/uploads:/var/www/palace/uploads'\n")
            inserted = True
    p.write_text("".join(out))
    print("patched compose")
else:
    print("compose already has path")
PY
  echo "$PASS" | sudo -S bash -c "cd '$APPDIR' && docker compose up -d --force-recreate --remove-orphans"
else
  echo compose_has_volume
fi

APP=$(echo "$PASS" | sudo -S docker ps --format '{{.ID}} {{.Image}}' | grep vbw578 | awk '{print $1}' | head -1)
echo "FINAL_IMAGE=$(echo "$PASS" | sudo -S docker ps --format '{{.Image}}' | grep vbw578 | head -1)"
echo "container_files=$(echo "$PASS" | sudo -S docker exec "$APP" sh -c 'ls /var/www/palace/uploads/product-images | wc -l')"
echo "host_files=$(echo "$PASS" | sudo -S ls "$HOST/product-images" | wc -l)"
u=$(echo "$PASS" | sudo -S docker exec fleet-postgres psql -U postgres -d store_palace -At -c 'SELECT url FROM product_images ORDER BY created_at DESC LIMIT 1;')
echo "sample=$u"
curl -sS -o /dev/null -w "http=%{http_code}\n" -L --max-time 8 "$u" || true
