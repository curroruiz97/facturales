-- ============================================
-- Tabla: invoice_series
-- Series de facturación personales por usuario
-- ============================================

CREATE TABLE IF NOT EXISTS invoice_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),

  -- Cada usuario tiene códigos de serie únicos
  UNIQUE(user_id, code)
);

-- Índice para consultas por usuario
CREATE INDEX IF NOT EXISTS idx_invoice_series_user_id ON invoice_series(user_id);

-- RLS
ALTER TABLE invoice_series ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own series"
  ON invoice_series FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own series"
  ON invoice_series FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own series"
  ON invoice_series FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own series"
  ON invoice_series FOR DELETE
  USING (auth.uid() = user_id);

-- Insertar series por defecto para usuarios existentes que tengan facturas
-- (los nuevos usuarios recibirán las series por defecto desde el frontend)
COMMENT ON TABLE invoice_series IS 'Series de facturación personalizadas por usuario';
COMMENT ON COLUMN invoice_series.code IS 'Código corto de la serie (A, B, RECT, etc.)';
COMMENT ON COLUMN invoice_series.description IS 'Descripción de la serie (Serie general, Rectificativas, etc.)';
