#!/usr/bin/env bash
# Persist palace uploads to host + clean dead DB image URLs.
set -euo pipefail
PASS="${1:-}"
echo "$PASS" | sudo -S bash <<'EOS'
set -euo pipefail
APPDIR=/data/coolify/applications/vbw578yuxwwbq9cenmyiwgxd
APP=$(docker ps --format '{{.ID}} {{.Image}}' | grep vbw578 | awk '{print $1}' | head -1)
PCID=$(docker ps --format '{{.ID}} {{.Names}}' | grep fleet-postgres | awk '{print $1}' | head -1)
HOST_UPLOADS=/var/www/palace/uploads
echo "APP=$APP"

# 1) Ensure host dirs exist with write perms for container (uid 0 currently)
mkdir -p "$HOST_UPLOADS/product-images" "$HOST_UPLOADS/category-images"
chmod -R 755 /var/www/palace

# 2) Copy current container uploads onto the host BEFORE remount
echo '=== copying live container files to host ==='
docker cp "$APP:/var/www/palace/uploads/product-images/." "$HOST_UPLOADS/product-images/" 2>/dev/null || true
docker cp "$APP:/var/www/palace/uploads/category-images/." "$HOST_UPLOADS/category-images/" 2>/dev/null || true
echo "host product-images count: $(ls -1 "$HOST_UPLOADS/product-images" | wc -l)"
echo "host category-images count: $(ls -1 "$HOST_UPLOADS/category-images" 2>/dev/null | wc -l)"

# 3) Patch docker-compose to bind-mount host uploads if missing
COMPOSE="$APPDIR/docker-compose.yaml"
if [ -f "$COMPOSE" ]; then
  cp -a "$COMPOSE" "$COMPOSE.bak.$(date +%s)"
  if ! grep -q '/var/www/palace/uploads' "$COMPOSE"; then
    python3 - <<'PY'
from pathlib import Path
p = Path("/data/coolify/applications/vbw578yuxwwbq9cenmyiwgxd/docker-compose.yaml")
text = p.read_text()
# Insert volumes under the first service block after env_file or restart
needle = "        env_file:\n            - .env\n"
vol = """        env_file:
            - .env
        volumes:
            - '/var/www/palace/uploads:/var/www/palace/uploads'\n"""
if needle in text and "volumes:" not in text.split("services:",1)[1][:800]:
    text = text.replace(needle, vol, 1)
    p.write_text(text)
    print("patched compose with bind mount")
else:
    # try alternate: after container_name
    if "volumes:" in text and "/var/www/palace/uploads" in text:
        print("compose already has uploads volume")
    else:
        # append volumes key under service by line scan
        lines = text.splitlines(True)
        out=[]
        inserted=False
        for i,line in enumerate(lines):
            out.append(line)
            if (not inserted) and line.strip().startswith("env_file:"):
                # wait until after '- .env'
                pass
            if (not inserted) and line.strip() == "- .env":
                # peek indent
                out.append("        volumes:\n")
                out.append("            - '/var/www/palace/uploads:/var/www/palace/uploads'\n")
                inserted=True
        if inserted:
            p.write_text("".join(out))
            print("patched compose (fallback)")
        else:
            print("WARN: could not auto-patch compose; manual Coolify persistent storage needed")
            print(text[:1200])
PY
  else
    echo "compose already references uploads path"
  fi
  grep -n 'uploads\|volumes' "$COMPOSE" | head -20
fi

# 4) Recreate container with new mount
cd "$APPDIR"
docker compose up -d --force-recreate --remove-orphans
sleep 6
APP2=$(docker ps --format '{{.ID}} {{.Image}}' | grep vbw578 | awk '{print $1}' | head -1)
echo "NEW_APP=$APP2"
docker exec "$APP2" sh -c 'ls /var/www/palace/uploads/product-images | wc -l; touch /var/www/palace/uploads/product-images/.persist-test && ls -la /var/www/palace/uploads/product-images/.persist-test'
ls -la /var/www/palace/uploads/product-images/.persist-test
test -f /var/www/palace/uploads/product-images/.persist-test && echo PERSIST_OK || echo PERSIST_FAIL

# 5) Delete DB rows whose files 404 (so UI uses placeholders instead of broken cards)
echo '=== pruning missing image URLs from DB ==='
docker exec -i "$PCID" psql -U postgres -d store_palace -At -c "SELECT id||'|'||url FROM product_images;" > /tmp/all-imgs.txt
DEL=0
KEEP=0
while IFS='|' read -r id url; do
  [ -z "$url" ] && continue
  code=$(curl -sS -o /dev/null -w '%{http_code}' -L --max-time 6 "$url" || echo 000)
  if [ "$code" != "200" ]; then
    echo "DELETE $code $url"
    docker exec -i "$PCID" psql -U postgres -d store_palace -c "DELETE FROM product_images WHERE id='$id';" >/dev/null
    DEL=$((DEL+1))
  else
    KEEP=$((KEEP+1))
  fi
done < /tmp/all-imgs.txt
echo "KEEP=$KEEP DELETED=$DEL"

# Also clear broken category image_urls
docker exec -i "$PCID" psql -U postgres -d store_palace -At -c "SELECT id||'|'||coalesce(image_url,'') FROM categories WHERE image_url IS NOT NULL AND trim(image_url)<>'';" > /tmp/cat-imgs.txt || true
while IFS='|' read -r id url; do
  [ -z "$url" ] && continue
  code=$(curl -sS -o /dev/null -w '%{http_code}' -L --max-time 6 "$url" || echo 000)
  if [ "$code" != "200" ]; then
    echo "CLEAR_CAT $code $url"
    docker exec -i "$PCID" psql -U postgres -d store_palace -c "UPDATE categories SET image_url=NULL WHERE id='$id';" >/dev/null
  fi
done < /tmp/cat-imgs.txt

echo '=== remaining product_images ==='
docker exec -i "$PCID" psql -U postgres -d store_palace -c "SELECT count(*) FROM product_images;"
EOS
