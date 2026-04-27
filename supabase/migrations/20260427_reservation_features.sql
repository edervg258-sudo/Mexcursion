-- Migration: reservation features
-- Adds Stripe tracking columns, webhook idempotency, and double-booking index

-- Stripe payment tracking on reservas
ALTER TABLE reservas
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_refund_id TEXT,
  ADD COLUMN IF NOT EXISTS politica_cancelacion TEXT DEFAULT 'moderada'
    CHECK (politica_cancelacion IN ('flexible', 'moderada', 'estricta'));

-- Fast lookup for webhooks → reserva
CREATE INDEX IF NOT EXISTS idx_reservas_stripe_pi
  ON reservas(stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

-- Unique constraint to prevent double-booking (same user, same destino, same fecha, same paquete)
CREATE UNIQUE INDEX IF NOT EXISTS idx_reservas_no_double_booking
  ON reservas(usuario_id, destino, fecha, paquete)
  WHERE estado NOT IN ('cancelada');

-- Idempotency table for Stripe webhook events
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_event_id  TEXT        UNIQUE NOT NULL,
  event_type       TEXT        NOT NULL,
  processed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_stripe_id
  ON stripe_webhook_events(stripe_event_id);

-- RLS: only service role can touch webhook events table
ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_only" ON stripe_webhook_events
  USING (false) WITH CHECK (false);
