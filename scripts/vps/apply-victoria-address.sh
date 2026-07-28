#!/usr/bin/env bash
set -euo pipefail
source /data/fleet/secrets/db-stack.env
docker exec -i -e PGPASSWORD="$POSTGRES_SUPERPASS" fleet-postgres \
  psql -U postgres -d store_palace < /home/tay/palace-migrations/patch-victoria-address.sql
echo "DB_PATCH_OK"
