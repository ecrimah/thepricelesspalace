#!/usr/bin/env bash
set -euo pipefail
PASS="${1:?}"

echo "$PASS" | sudo -S docker exec -i fleet-postgres psql -U postgres -d store_palace <<'SQL'
SELECT COUNT(*) AS orders FROM orders;
SELECT COUNT(*) AS products FROM products;
SELECT COUNT(*) AS active_conn FROM pg_stat_activity WHERE datname='store_palace';

CREATE INDEX IF NOT EXISTS idx_orders_payment_status_created_at
  ON orders (payment_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_created_at
  ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_email
  ON orders (email)
  WHERE email IS NOT NULL AND email <> '';
CREATE INDEX IF NOT EXISTS idx_products_quantity
  ON products (quantity ASC)
  WHERE quantity < 10;
CREATE INDEX IF NOT EXISTS idx_product_images_product_position
  ON product_images (product_id, position ASC NULLS LAST, created_at ASC);

\timing on
EXPLAIN ANALYZE
SELECT COUNT(*) FILTER (WHERE payment_status = 'paid'),
       COALESCE(SUM(total) FILTER (WHERE payment_status = 'paid'), 0)
FROM orders;
SQL

echo '=== health ==='
curl -sS -m 10 https://thepricelesspalace.com/api/health/db || true
echo
