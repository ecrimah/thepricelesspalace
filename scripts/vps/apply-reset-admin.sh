#!/usr/bin/env bash
set -euo pipefail
source /data/fleet/secrets/db-stack.env
docker exec -i -e PGPASSWORD="$POSTGRES_SUPERPASS" fleet-postgres \
  psql -U postgres -d store_palace < /home/tay/palace-migrations/reset-admin-password.sql
echo "ADMIN_RESET_OK"
