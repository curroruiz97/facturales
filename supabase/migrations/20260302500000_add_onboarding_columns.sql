-- Migración: Añadir columnas para el onboarding mejorado
-- Fecha: 2026-03-02
-- Descripción: Nuevos campos en business_info (nombre_comercial, forma_juridica, impuestos por defecto)
--              y en invoice_series (formato de numeración, reseteo de contador, número inicial)

-- =====================================================
-- 1. NUEVAS COLUMNAS EN business_info
-- =====================================================

ALTER TABLE business_info ADD COLUMN IF NOT EXISTS nombre_comercial TEXT;
ALTER TABLE business_info ADD COLUMN IF NOT EXISTS forma_juridica TEXT;
ALTER TABLE business_info ADD COLUMN IF NOT EXISTS default_tax_type TEXT DEFAULT 'iva'
  CHECK (default_tax_type IN ('iva', 'igic', 'ipsi'));
ALTER TABLE business_info ADD COLUMN IF NOT EXISTS default_iva NUMERIC DEFAULT 21;
ALTER TABLE business_info ADD COLUMN IF NOT EXISTS default_irpf NUMERIC DEFAULT 15;

COMMENT ON COLUMN business_info.nombre_comercial IS 'Nombre comercial (opcional, puede diferir del nombre fiscal)';
COMMENT ON COLUMN business_info.forma_juridica IS 'Forma jurídica para empresas (SL, SA, Cooperativa, etc.)';
COMMENT ON COLUMN business_info.default_tax_type IS 'Tipo de impuesto por defecto: iva, igic o ipsi';
COMMENT ON COLUMN business_info.default_iva IS 'Porcentaje de IVA/IGIC/IPSI por defecto';
COMMENT ON COLUMN business_info.default_irpf IS 'Porcentaje de retención IRPF por defecto';

-- =====================================================
-- 2. NUEVAS COLUMNAS EN invoice_series
-- =====================================================

ALTER TABLE invoice_series ADD COLUMN IF NOT EXISTS invoice_number_format TEXT DEFAULT 'common'
  CHECK (invoice_number_format IN ('common', 'monthly', 'simple', 'slash', 'compact', 'custom'));
ALTER TABLE invoice_series ADD COLUMN IF NOT EXISTS counter_reset TEXT DEFAULT 'yearly'
  CHECK (counter_reset IN ('never', 'yearly', 'monthly'));
ALTER TABLE invoice_series ADD COLUMN IF NOT EXISTS start_number INTEGER DEFAULT 1;
ALTER TABLE invoice_series ADD COLUMN IF NOT EXISTS custom_format TEXT;

COMMENT ON COLUMN invoice_series.invoice_number_format IS 'Formato de numeración: common (A-2026-0001), monthly, simple, slash, compact, custom';
COMMENT ON COLUMN invoice_series.counter_reset IS 'Reseteo del contador: never, yearly, monthly';
COMMENT ON COLUMN invoice_series.start_number IS 'Número inicial del contador';
COMMENT ON COLUMN invoice_series.custom_format IS 'Formato personalizado (solo si invoice_number_format = custom)';
