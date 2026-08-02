-- ============================================================================
-- 004: Payment integrity, SMS audit, confirmation dedup, check constraints
-- Target: store_palace (plain Postgres). Idempotent / reversible-leaning.
-- ============================================================================

BEGIN;

-- Confirmation SMS/email dedup (code writes this; was missing after cutover)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS confirmation_sent_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_orders_confirmation_sent_at
  ON public.orders (confirmation_sent_at)
  WHERE confirmation_sent_at IS NULL;

-- Payment attempts (multiple attempts per order; gateway-agnostic)
CREATE TABLE IF NOT EXISTS public.payment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  gateway text NOT NULL CHECK (gateway IN ('moolre', 'hubtel', 'paystack', 'manual', 'pos', 'other')),
  internal_reference text NOT NULL,
  gateway_reference text,
  expected_amount numeric NOT NULL CHECK (expected_amount >= 0),
  amount_paid numeric,
  currency text NOT NULL DEFAULT 'GHS',
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'successful', 'failed', 'cancelled', 'expired', 'refunded')),
  failure_reason text,
  idempotency_key text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz,
  CONSTRAINT payment_attempts_internal_reference_key UNIQUE (internal_reference)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_attempts_idempotency
  ON public.payment_attempts (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_attempts_order
  ON public.payment_attempts (order_id);

CREATE INDEX IF NOT EXISTS idx_payment_attempts_gateway_ref
  ON public.payment_attempts (gateway, gateway_reference);

CREATE INDEX IF NOT EXISTS idx_payment_attempts_status_created
  ON public.payment_attempts (status, created_at DESC);

-- Webhook / callback event deduplication
CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway text NOT NULL,
  external_event_id text,
  event_type text,
  internal_reference text,
  gateway_reference text,
  payload_hash text,
  signature_valid boolean,
  processing_status text NOT NULL DEFAULT 'received'
    CHECK (processing_status IN ('received', 'processing', 'processed', 'ignored', 'failed')),
  failure_reason text,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  payment_attempt_id uuid REFERENCES public.payment_attempts(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_events_gateway_external
  ON public.payment_webhook_events (gateway, external_event_id)
  WHERE external_event_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_events_payload_hash
  ON public.payment_webhook_events (gateway, payload_hash)
  WHERE payload_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_webhook_events_unprocessed
  ON public.payment_webhook_events (processing_status, received_at)
  WHERE processing_status IN ('received', 'processing', 'failed');

-- SMS audit / idempotency (Moolre SMS)
CREATE TABLE IF NOT EXISTS public.sms_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'moolre',
  recipient_hash text,
  recipient_masked text,
  message_type text NOT NULL,
  template_key text,
  related_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  related_order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  related_payment_attempt_id uuid REFERENCES public.payment_attempts(id) ON DELETE SET NULL,
  provider_message_id text,
  idempotency_key text NOT NULL,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'sent', 'delivered', 'failed', 'skipped')),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  failure_reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  delivered_at timestamptz,
  CONSTRAINT sms_messages_idempotency_key UNIQUE (idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_sms_messages_order
  ON public.sms_messages (related_order_id);

CREATE INDEX IF NOT EXISTS idx_sms_messages_status
  ON public.sms_messages (status, created_at DESC);

-- Financial / quantity sanity (NOT VALID then VALIDATE to avoid rewrite locks on bad history)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_total_nonneg'
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_total_nonneg CHECK (total >= 0) NOT VALID;
    ALTER TABLE public.orders VALIDATE CONSTRAINT orders_total_nonneg;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'order_items_qty_positive'
  ) THEN
    ALTER TABLE public.order_items
      ADD CONSTRAINT order_items_qty_positive CHECK (quantity > 0) NOT VALID;
    ALTER TABLE public.order_items VALIDATE CONSTRAINT order_items_qty_positive;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'order_items_unit_price_nonneg'
  ) THEN
    ALTER TABLE public.order_items
      ADD CONSTRAINT order_items_unit_price_nonneg CHECK (unit_price >= 0) NOT VALID;
    ALTER TABLE public.order_items VALIDATE CONSTRAINT order_items_unit_price_nonneg;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_price_nonneg'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_price_nonneg CHECK (price >= 0) NOT VALID;
    ALTER TABLE public.products VALIDATE CONSTRAINT products_price_nonneg;
  END IF;
END $$;

-- Soft-quarantine empty product shells (do not delete)
UPDATE public.products
SET status = 'draft',
    updated_at = now(),
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('quarantined_empty', true)
WHERE coalesce(trim(name), '') = ''
   OR coalesce(trim(slug), '') = '';

COMMIT;
