-- Migración: Motor de numeración de facturas avanzado
-- Fecha: 2026-03-03
-- Descripción: Soporte para start_number, counter_reset (yearly/monthly/never),
--              y formatos de numeración (common, monthly, simple, slash, compact, custom)

-- =====================================================
-- 1. NUEVAS COLUMNAS DE TRACKING EN invoice_series
-- =====================================================

ALTER TABLE invoice_series ADD COLUMN IF NOT EXISTS current_number INTEGER DEFAULT 0;
ALTER TABLE invoice_series ADD COLUMN IF NOT EXISTS current_number_period TEXT DEFAULT '';

COMMENT ON COLUMN invoice_series.current_number IS 'Último número secuencial asignado en el periodo actual';
COMMENT ON COLUMN invoice_series.current_number_period IS 'Periodo del current_number: YYYY (yearly), YYYY-MM (monthly), all (never)';

-- =====================================================
-- 2. INICIALIZAR current_number DESDE FACTURAS EXISTENTES
--    (solo para series con formato common: SERIE-YYYY-NNNNN)
-- =====================================================

UPDATE invoice_series s
SET current_number = sub.max_num,
    current_number_period = sub.period
FROM (
  SELECT
    i.invoice_series AS code,
    i.user_id,
    TO_CHAR(CURRENT_DATE, 'YYYY') AS period,
    MAX(
      CASE
        WHEN i.invoice_number ~ '^.+-.+-.+$'
        THEN CAST(NULLIF(SPLIT_PART(i.invoice_number, '-', 3), '') AS INTEGER)
        ELSE NULL
      END
    ) AS max_num
  FROM invoices i
  WHERE i.invoice_number IS NOT NULL
    AND i.invoice_number LIKE '%-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-%'
  GROUP BY i.invoice_series, i.user_id
) sub
WHERE s.code = sub.code
  AND s.user_id = sub.user_id
  AND sub.max_num IS NOT NULL;

-- =====================================================
-- 3. REEMPLAZAR FUNCIÓN generate_invoice_number()
-- =====================================================

CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
  v_format TEXT;
  v_counter_reset TEXT;
  v_start_number INTEGER;
  v_custom_format TEXT;
  v_current_number INTEGER;
  v_current_period TEXT;
  v_series_id UUID;
  v_series_code TEXT;
  v_year TEXT;
  v_short_year TEXT;
  v_month TEXT;
  v_period TEXT;
  v_next_seq INTEGER;
  v_result TEXT;
BEGIN
  v_series_code := NEW.invoice_series;
  v_year := TO_CHAR(COALESCE(NEW.issue_date, CURRENT_DATE), 'YYYY');
  v_short_year := TO_CHAR(COALESCE(NEW.issue_date, CURRENT_DATE), 'YY');
  v_month := TO_CHAR(COALESCE(NEW.issue_date, CURRENT_DATE), 'MM');

  -- Obtener configuración de la serie (con bloqueo para evitar race conditions)
  SELECT id,
         COALESCE(invoice_number_format, 'common'),
         COALESCE(counter_reset, 'yearly'),
         COALESCE(start_number, 1),
         custom_format,
         COALESCE(current_number, 0),
         COALESCE(current_number_period, '')
  INTO v_series_id, v_format, v_counter_reset, v_start_number, v_custom_format,
       v_current_number, v_current_period
  FROM invoice_series
  WHERE code = v_series_code AND user_id = NEW.user_id
  FOR UPDATE
  LIMIT 1;

  -- Valores por defecto si no existe la serie
  IF v_series_id IS NULL THEN
    v_format := 'common';
    v_counter_reset := 'yearly';
    v_start_number := 1;
    v_current_number := 0;
    v_current_period := '';
  END IF;

  -- Determinar periodo actual según counter_reset
  CASE v_counter_reset
    WHEN 'yearly' THEN v_period := v_year;
    WHEN 'monthly' THEN v_period := v_year || '-' || v_month;
    WHEN 'never' THEN v_period := 'all';
    ELSE v_period := v_year;
  END CASE;

  -- Calcular siguiente número secuencial
  IF v_current_period != v_period THEN
    -- Periodo nuevo: empezar desde start_number
    v_next_seq := v_start_number;
  ELSE
    -- Mismo periodo: incrementar
    v_next_seq := GREATEST(v_current_number + 1, v_start_number);
  END IF;

  -- Actualizar el contador en la serie (atómico gracias al FOR UPDATE)
  IF v_series_id IS NOT NULL THEN
    UPDATE invoice_series
    SET current_number = v_next_seq,
        current_number_period = v_period
    WHERE id = v_series_id;
  END IF;

  -- Construir el número de factura según el formato
  -- Nota: si counter_reset es 'monthly' y el formato no incluye mes,
  --       insertamos el mes para garantizar unicidad
  CASE v_format
    WHEN 'common' THEN
      IF v_counter_reset = 'monthly' THEN
        v_result := v_series_code || '-' || v_year || '-' || v_month || '-' || LPAD(v_next_seq::TEXT, 4, '0');
      ELSE
        v_result := v_series_code || '-' || v_year || '-' || LPAD(v_next_seq::TEXT, 4, '0');
      END IF;

    WHEN 'monthly' THEN
      v_result := v_year || '-' || v_month || '-' || LPAD(v_next_seq::TEXT, 3, '0');

    WHEN 'simple' THEN
      IF v_counter_reset = 'monthly' THEN
        v_result := v_year || v_month || LPAD(v_next_seq::TEXT, 4, '0');
      ELSE
        v_result := v_year || LPAD(v_next_seq::TEXT, 4, '0');
      END IF;

    WHEN 'slash' THEN
      IF v_counter_reset = 'monthly' THEN
        v_result := v_series_code || '/' || v_year || '/' || v_month || '/' || LPAD(v_next_seq::TEXT, 4, '0');
      ELSE
        v_result := v_series_code || '/' || v_year || '/' || LPAD(v_next_seq::TEXT, 4, '0');
      END IF;

    WHEN 'compact' THEN
      IF v_counter_reset = 'monthly' THEN
        v_result := v_series_code || '-' || v_short_year || '-' || v_month || '-' || LPAD(v_next_seq::TEXT, 3, '0');
      ELSE
        v_result := v_series_code || '-' || v_short_year || '-' || LPAD(v_next_seq::TEXT, 3, '0');
      END IF;

    WHEN 'custom' THEN
      v_result := COALESCE(v_custom_format, '{SERIE}-{YYYY}-{NNNN}');
      v_result := REPLACE(v_result, '{SERIE}', v_series_code);
      v_result := REPLACE(v_result, '{YYYY}', v_year);
      v_result := REPLACE(v_result, '{YY}', v_short_year);
      v_result := REPLACE(v_result, '{MM}', v_month);
      v_result := REPLACE(v_result, '{NNNNN}', LPAD(v_next_seq::TEXT, 5, '0'));
      v_result := REPLACE(v_result, '{NNNN}', LPAD(v_next_seq::TEXT, 4, '0'));
      v_result := REPLACE(v_result, '{NNN}', LPAD(v_next_seq::TEXT, 3, '0'));

    ELSE
      v_result := v_series_code || '-' || v_year || '-' || LPAD(v_next_seq::TEXT, 4, '0');
  END CASE;

  NEW.invoice_number := v_result;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
