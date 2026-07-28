#!/usr/bin/env bash
set -euo pipefail
# Apply palace schema into store_palace via fleet-postgres.
# Usage: sudo bash apply-palace-schema.sh /path/to/001.sql /path/to/002.sql

MIG1="${1:?migration 001 path}"
MIG2="${2:?migration 002 path}"
SECRETS=/data/fleet/secrets/db-stack.env
# shellcheck disable=SC1090
source "$SECRETS"
STORE_SECRETS=/data/fleet/secrets/store_palace.env
# shellcheck disable=SC1090
source "$STORE_SECRETS"

echo "==> applying $MIG1"
docker exec -i -e PGPASSWORD="$STORE_PASS" fleet-postgres \
  psql -v ON_ERROR_STOP=1 -U store_palace -d store_palace < "$MIG1"

echo "==> applying $MIG2"
docker exec -i -e PGPASSWORD="$STORE_PASS" fleet-postgres \
  psql -v ON_ERROR_STOP=1 -U store_palace -d store_palace < "$MIG2"

echo "==> table counts"
docker exec -e PGPASSWORD="$STORE_PASS" fleet-postgres \
  psql -U store_palace -d store_palace -c \
  "SELECT relname, n_live_tup FROM pg_stat_user_tables WHERE schemaname='public' ORDER BY relname LIMIT 30;"
