-- Tracking de uso mensual por periodo de facturación
-- Cada fila = un usuario + un periodo. Los contadores se resetean al iniciar un nuevo periodo.

CREATE TABLE IF NOT EXISTS billing_usage (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  period_start DATE NOT NULL,
  invoices_used INTEGER DEFAULT 0 NOT NULL,
  ocr_scans_used INTEGER DEFAULT 0 NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, period_start)
);

ALTER TABLE billing_usage ENABLE ROW LEVEL SECURITY;

-- Usuarios solo ven su propio uso
CREATE POLICY "billing_usage_select_own" ON billing_usage
  FOR SELECT USING (auth.uid() = user_id);

-- Usuarios pueden insertar/actualizar su propio uso
CREATE POLICY "billing_usage_insert_own" ON billing_usage
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "billing_usage_update_own" ON billing_usage
  FOR UPDATE USING (auth.uid() = user_id);

-- Función RPC para incrementar un contador atómicamente
CREATE OR REPLACE FUNCTION increment_billing_usage(
  p_user_id UUID,
  p_period_start DATE,
  p_field TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_val INTEGER;
BEGIN
  INSERT INTO billing_usage (user_id, period_start)
  VALUES (p_user_id, p_period_start)
  ON CONFLICT (user_id, period_start) DO NOTHING;

  IF p_field = 'invoices_used' THEN
    UPDATE billing_usage
      SET invoices_used = invoices_used + 1, updated_at = NOW()
      WHERE user_id = p_user_id AND period_start = p_period_start
      RETURNING invoices_used INTO new_val;
  ELSIF p_field = 'ocr_scans_used' THEN
    UPDATE billing_usage
      SET ocr_scans_used = ocr_scans_used + 1, updated_at = NOW()
      WHERE user_id = p_user_id AND period_start = p_period_start
      RETURNING ocr_scans_used INTO new_val;
  ELSE
    RAISE EXCEPTION 'Campo no válido: %', p_field;
  END IF;

  RETURN new_val;
END;
$$;
