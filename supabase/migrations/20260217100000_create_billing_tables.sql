-- Migración: Crear tablas de billing para integración Stripe
-- billing_subscriptions: fuente de verdad de suscripciones sincronizadas vía webhook
-- billing_events: idempotencia de webhooks de Stripe

-- ============================================================
-- 1. billing_subscriptions
-- ============================================================
CREATE TABLE billing_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  stripe_checkout_session_id TEXT,
  plan TEXT NOT NULL CHECK (plan IN ('starter', 'pro', 'business')),
  "interval" TEXT NOT NULL CHECK ("interval" IN ('monthly', 'yearly')),
  status TEXT NOT NULL DEFAULT 'incomplete',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_billing_sub_user ON billing_subscriptions(user_id);
CREATE INDEX idx_billing_sub_stripe_cust ON billing_subscriptions(stripe_customer_id);
CREATE INDEX idx_billing_sub_status ON billing_subscriptions(status);

CREATE TRIGGER update_billing_sub_updated_at
  BEFORE UPDATE ON billing_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 2. billing_events (idempotencia webhook)
-- ============================================================
CREATE TABLE billing_events (
  stripe_event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. RLS
-- ============================================================

-- billing_subscriptions: usuario solo lee sus propias filas.
-- INSERT/UPDATE/DELETE solo vía service role (Edge Functions).
ALTER TABLE billing_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscriptions"
  ON billing_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- billing_events: sin acceso desde cliente. Solo service role.
ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;
