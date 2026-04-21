-- Migración: Configuración editable de planes de suscripción
-- Fecha: 2026-04-23
-- Descripción: Tabla + RPC admin para que desde el panel admin se puedan editar
--              etiquetas, precios y features de los planes sin tocar código.

CREATE TABLE IF NOT EXISTS public.subscription_plan_configs (
  id TEXT PRIMARY KEY CHECK (id IN ('starter', 'pro', 'business')),
  label TEXT NOT NULL,
  tagline TEXT NOT NULL DEFAULT '',
  badge TEXT,
  monthly_price NUMERIC(10, 2) NOT NULL,
  yearly_price NUMERIC(10, 2) NOT NULL,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  display_order INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.subscription_plan_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read plan configs"
  ON public.subscription_plan_configs FOR SELECT
  TO authenticated
  USING (true);

CREATE OR REPLACE FUNCTION update_subscription_plan_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_subscription_plan_configs_updated_at
  BEFORE UPDATE ON public.subscription_plan_configs
  FOR EACH ROW EXECUTE FUNCTION update_subscription_plan_configs_updated_at();

INSERT INTO public.subscription_plan_configs (id, label, tagline, badge, monthly_price, yearly_price, features, display_order) VALUES
  ('starter', 'Starter', 'Para empezar a facturar.', NULL, 6.45, 4.95,
    '["Hasta 10 clientes","1 usuario","Hasta 30 productos","10 facturas / mes","Escaneado: 10 docs/mes","Soporte por email"]'::jsonb, 1),
  ('pro', 'Pro', 'Para profesionales y autónomos activos.', 'Más popular', 11.95, 8.95,
    '["Hasta 150 clientes","Hasta 3 usuarios","Hasta 150 productos","Facturas ilimitadas","Escaneado: 75 docs/mes","Soporte por chat y email"]'::jsonb, 2),
  ('business', 'Ilimitado', 'Equipos, asesorías y alto volumen.', NULL, 23.95, 17.95,
    '["Clientes ilimitados","Usuarios ilimitados","Productos ilimitados","Facturas ilimitadas","Escaneado: 300 docs/mes","Soporte prioritario (chat, email y teléfono)"]'::jsonb, 3)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION admin_upsert_plan_config(
  p_id TEXT,
  p_label TEXT,
  p_tagline TEXT,
  p_badge TEXT,
  p_monthly_price NUMERIC,
  p_yearly_price NUMERIC,
  p_features JSONB
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role FROM public.admin_users WHERE user_id = auth.uid() LIMIT 1;
  IF v_role IS NULL OR v_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Forbidden: solo administradores pueden editar planes';
  END IF;

  INSERT INTO public.subscription_plan_configs (id, label, tagline, badge, monthly_price, yearly_price, features)
  VALUES (p_id, p_label, p_tagline, p_badge, p_monthly_price, p_yearly_price, p_features)
  ON CONFLICT (id) DO UPDATE SET
    label = EXCLUDED.label,
    tagline = EXCLUDED.tagline,
    badge = EXCLUDED.badge,
    monthly_price = EXCLUDED.monthly_price,
    yearly_price = EXCLUDED.yearly_price,
    features = EXCLUDED.features,
    updated_at = NOW();

  INSERT INTO public.admin_audit_logs (admin_user_id, action, target_type, target_id, metadata)
  VALUES (auth.uid(), 'update_plan_config', 'plan', p_id, jsonb_build_object(
    'label', p_label, 'monthly_price', p_monthly_price, 'yearly_price', p_yearly_price
  ));
END;
$$;

GRANT EXECUTE ON FUNCTION admin_upsert_plan_config TO authenticated;
