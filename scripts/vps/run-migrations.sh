#!/usr/bin/env bash
set -euo pipefail
source /data/fleet/secrets/db-stack.env
MIG_DIR="${1:-/home/tay/palace-migrations}"

echo "==> applying 001"
docker exec -i -e PGPASSWORD="$POSTGRES_SUPERPASS" fleet-postgres \
  psql -v ON_ERROR_STOP=1 -U postgres -d store_palace < "$MIG_DIR/001_plain_postgres.sql"

echo "==> applying 002"
docker exec -i -e PGPASSWORD="$POSTGRES_SUPERPASS" fleet-postgres \
  psql -v ON_ERROR_STOP=1 -U postgres -d store_palace < "$MIG_DIR/002_uuid_id_defaults.sql"

echo "==> grants"
docker exec -e PGPASSWORD="$POSTGRES_SUPERPASS" fleet-postgres \
  psql -v ON_ERROR_STOP=1 -U postgres -d store_palace -c "
ALTER SCHEMA public OWNER TO store_palace;
ALTER SCHEMA auth OWNER TO store_palace;
GRANT ALL ON SCHEMA public TO store_palace;
GRANT ALL ON SCHEMA auth TO store_palace;
GRANT ALL ON ALL TABLES IN SCHEMA public TO store_palace;
GRANT ALL ON ALL TABLES IN SCHEMA auth TO store_palace;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO store_palace;
GRANT ALL ON ALL SEQUENCES IN SCHEMA auth TO store_palace;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO store_palace;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO store_palace;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT ALL ON TABLES TO store_palace;
"

echo "==> verify tables"
docker exec -e PGPASSWORD="$POSTGRES_SUPERPASS" fleet-postgres \
  psql -U postgres -d store_palace -c "SELECT count(*) AS public_tables FROM information_schema.tables WHERE table_schema='public';"
docker exec -e PGPASSWORD="$POSTGRES_SUPERPASS" fleet-postgres \
  psql -U postgres -d store_palace -c "SELECT count(*) AS auth_users FROM auth.users;"
echo "DONE"
