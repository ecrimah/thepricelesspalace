#!/usr/bin/env bash
# Re-apply uploads bind mount after Coolify regenerates compose.
set -euo pipefail
PASS="${1:-}"
echo "$PASS" | sudo -S bash <<'EOS'
set -euo pipefail
APPDIR=/data/coolify/applications/vbw578yuxwwbq9cenmyiwgxd
COMPOSE="$APPDIR/docker-compose.yaml"
HOST=/var/www/palace/uploads
mkdir -p "$HOST/product-images" "$HOST/category-images"
if grep -q "/var/www/palace/uploads:/var/www/palace/uploads" "$COMPOSE"; then
  echo "volume already present"
else
  python3 - <<'PY'
from pathlib import Path
p = Path("/data/coolify/applications/vbw578yuxwwbq9cenmyiwgxd/docker-compose.yaml")
text = p.read_text()
if "/var/www/palace/uploads" in text:
    print("already referenced")
else:
    lines = text.splitlines(True)
    out=[]; inserted=False
    for line in lines:
        out.append(line)
        if (not inserted) and line.strip() == "- .env":
            out.append("        volumes:\n")
            out.append("            - '/var/www/palace/uploads:/var/www/palace/uploads'\n")
            inserted=True
    p.write_text("".join(out))
    print("patched" if inserted else "FAILED_PATCH")
PY
  cd "$APPDIR"
  docker compose up -d --force-recreate --remove-orphans
fi
APP=$(docker ps --format '{{.ID}} {{.Image}}' | grep vbw578 | awk '{print $1}' | head -1)
echo "container_files=$(docker exec "$APP" sh -c 'ls /var/www/palace/uploads/product-images | wc -l')"
echo "host_files=$(ls "$HOST/product-images" | wc -l)"
EOS
