-- Corregir función SECURITY DEFINER sin SET search_path
-- Riesgo: schema injection si se modifica el search_path por defecto

CREATE OR REPLACE FUNCTION increment_billing_usage(
  p_user_id UUID,
  p_period_start DATE,
  p_field TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
