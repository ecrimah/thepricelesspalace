-- Product admin / storefront expect variant display order.
ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_product_variants_sort_order
  ON public.product_variants (product_id, sort_order);
