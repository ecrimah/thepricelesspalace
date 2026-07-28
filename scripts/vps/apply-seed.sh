#!/usr/bin/env bash
set -euo pipefail
source /data/fleet/secrets/db-stack.env
SEED="${1:-/home/tay/palace-migrations/seed-palace.sql}"
docker exec -i -e PGPASSWORD="$POSTGRES_SUPERPASS" fleet-postgres \
  psql -v ON_ERROR_STOP=1 -U postgres -d store_palace < "$SEED"
echo "SEED_OK"
