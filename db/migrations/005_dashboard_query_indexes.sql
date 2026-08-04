-- Indexes for admin dashboard / order list performance (safe, concurrent-friendly).
-- Apply with: psql $DATABASE_URL -f db/migrations/005_dashboard_query_indexes.sql

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
