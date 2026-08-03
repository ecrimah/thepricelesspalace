#!/usr/bin/env bash
set -euo pipefail
PASS="${1:-}"
echo "$PASS" | sudo -S bash <<'EOS'
set -euo pipefail
PCID=$(docker ps --format '{{.ID}} {{.Names}}' | grep fleet-postgres | awk '{print $1}' | head -1)
DIR=/var/www/palace/uploads/product-images
ls -1 "$DIR" | sort > /tmp/disk-files.txt
echo "disk_files=$(wc -l </tmp/disk-files.txt)"

# Build SQL list of existing basenames
python3 - <<'PY'
from pathlib import Path
files = [p.name for p in Path("/var/www/palace/uploads/product-images").iterdir() if p.is_file() and not p.name.startswith(".")]
print("files", len(files))
# Write a SQL script
lines = ["BEGIN;"]
# Create temp table of existing files
lines.append("CREATE TEMP TABLE existing_files(name text PRIMARY KEY);")
for f in files:
    safe = f.replace("'", "''")
    lines.append(f"INSERT INTO existing_files(name) VALUES ('{safe}');")
lines.append("""
DELETE FROM product_images
WHERE url LIKE '%/storage/v1/object/public/product-images/%'
  AND split_part(url, '/', array_length(string_to_array(url, '/'), 1)) NOT IN (SELECT name FROM existing_files);
""")
lines.append("""
UPDATE categories
SET image_url = NULL
WHERE image_url LIKE '%/storage/v1/object/public/%'
  AND split_part(image_url, '/', array_length(string_to_array(image_url, '/'), 1)) NOT IN (SELECT name FROM existing_files);
""")
lines.append("SELECT count(*) AS remaining_images FROM product_images;")
lines.append("COMMIT;")
Path("/tmp/prune-imgs.sql").write_text("\n".join(lines))
print("wrote /tmp/prune-imgs.sql")
PY
docker cp /tmp/prune-imgs.sql "$PCID":/tmp/prune-imgs.sql
docker exec -i "$PCID" psql -U postgres -d store_palace -v ON_ERROR_STOP=1 -f /tmp/prune-imgs.sql

echo '=== verify http ==='
ok=0; bad=0
while read -r u; do
  [ -z "$u" ] && continue
  c=$(curl -sS -o /dev/null -w '%{http_code}' -L --max-time 5 "$u" || echo 000)
  if [ "$c" = 200 ]; then ok=$((ok+1)); else bad=$((bad+1)); echo "BAD $c $u"; fi
done < <(docker exec -i "$PCID" psql -U postgres -d store_palace -At -c "SELECT url FROM product_images;")
echo "OK=$ok BAD=$bad"
EOS
