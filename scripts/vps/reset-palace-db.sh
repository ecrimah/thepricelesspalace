#!/usr/bin/env bash
set -euo pipefail
source /data/fleet/secrets/db-stack.env
source /data/fleet/secrets/store_palace.env

echo "==> terminate + drop store_palace"
docker exec -e PGPASSWORD="$POSTGRES_SUPERPASS" fleet-postgres \
  psql -v ON_ERROR_STOP=1 -U postgres -d postgres -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='store_palace' AND pid <> pg_backend_pid();"

docker exec -e PGPASSWORD="$POSTGRES_SUPERPASS" fleet-postgres \
  psql -v ON_ERROR_STOP=1 -U postgres -d postgres -c "DROP DATABASE IF EXISTS store_palace;"

docker exec -e PGPASSWORD="$POSTGRES_SUPERPASS" fleet-postgres \
  psql -v ON_ERROR_STOP=1 -U postgres -d postgres -c "CREATE DATABASE store_palace OWNER store_palace;"

echo "==> verify empty"
COUNT=$(docker exec -e PGPASSWORD="$POSTGRES_SUPERPASS" fleet-postgres \
  psql -U postgres -d store_palace -tAc "SELECT count(*) FROM pg_type WHERE typname='user_role';")
echo "user_role count=$COUNT (expect 0)"
if [[ "$COUNT" != "0" ]]; then
  echo "DB not clean"; exit 1
fi
echo "store_palace recreated clean"
