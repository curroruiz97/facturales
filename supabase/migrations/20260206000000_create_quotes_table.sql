-- Migración: Crear tabla quotes para gestión de presupuestos
-- Fecha: 2026-02-06
-- Descripción: Sistema completo de presupuestos con borradores y presupuestos emitidos

-- =====================================================
-- CREAR TABLA quotes (estructura híbrida)
-- =====================================================

CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  quote_number TEXT UNIQUE,
  quote_series TEXT NOT NULL DEFAULT 'P',
  client_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  issue_date DATE NOT NULL,
  due_date DATE,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'cancelled')),
  is_paid BOOLEAN DEFAULT FALSE,
  paid_at TIMESTAMPTZ,
  quote_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- FUNCIÓN PARA GENERAR NÚMERO DE PRESUPUESTO
-- =====================================================

CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS TRIGGER AS $$
DECLARE
  current_year TEXT;
  max_number INTEGER;
  new_number TEXT;
BEGIN
  -- Obtener el año actual
  current_year := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  -- Buscar el número más alto para esta serie y año
  SELECT COALESCE(
    MAX(
      CAST(
        SPLIT_PART(quote_number, '-', 3) AS INTEGER
      )
    ),
    0
  )
  INTO max_number
  FROM quotes
  WHERE quote_series = NEW.quote_series
    AND quote_number LIKE NEW.quote_series || '-' || current_year || '-%'
    AND user_id = NEW.user_id;
  
  -- Generar el nuevo número
  new_number := LPAD((max_number + 1)::TEXT, 5, '0');
  
  -- Asignar el número completo
  NEW.quote_number := NEW.quote_series || '-' || current_year || '-' || new_number;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGER PARA ASIGNAR NÚMERO DE PRESUPUESTO
-- =====================================================

CREATE TRIGGER set_quote_number
  BEFORE INSERT ON quotes
  FOR EACH ROW
  WHEN (NEW.quote_number IS NULL)
  EXECUTE FUNCTION generate_quote_number();

-- =====================================================
-- TRIGGER PARA updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_quotes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER quotes_updated_at
  BEFORE UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_quotes_updated_at();

-- =====================================================
-- FUNCIÓN PARA VALIDAR ACTUALIZACIONES
-- =====================================================

CREATE OR REPLACE FUNCTION validate_quote_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Si el presupuesto está emitido, solo permitir cambiar is_paid, paid_at y status
  IF OLD.status = 'issued' THEN
    -- Verificar que solo cambien los campos permitidos
    IF NEW.quote_data IS DISTINCT FROM OLD.quote_data
       OR NEW.subtotal IS DISTINCT FROM OLD.subtotal
       OR NEW.tax_amount IS DISTINCT FROM OLD.tax_amount
       OR NEW.total_amount IS DISTINCT FROM OLD.total_amount
       OR NEW.client_id IS DISTINCT FROM OLD.client_id
       OR NEW.client_name IS DISTINCT FROM OLD.client_name
       OR NEW.issue_date IS DISTINCT FROM OLD.issue_date
       OR NEW.due_date IS DISTINCT FROM OLD.due_date
       OR NEW.currency IS DISTINCT FROM OLD.currency
       OR NEW.quote_series IS DISTINCT FROM OLD.quote_series THEN
      RAISE EXCEPTION 'No se pueden modificar los datos de un presupuesto emitido. Solo se puede marcar como pagado o anularlo.';
    END IF;
  END IF;
  
  -- Validar que si se marca como pagado, se establezca paid_at
  IF NEW.is_paid = TRUE AND NEW.paid_at IS NULL THEN
    NEW.paid_at = NOW();
  END IF;
  
  -- Si se desmarca como pagado, limpiar paid_at
  IF NEW.is_paid = FALSE THEN
    NEW.paid_at = NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_quote_update_trigger
  BEFORE UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION validate_quote_update();

-- =====================================================
-- ÍNDICES
-- =====================================================

CREATE INDEX idx_quotes_user_id ON quotes(user_id);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quotes_number ON quotes(quote_number);
CREATE INDEX idx_quotes_issue_date ON quotes(issue_date);
CREATE INDEX idx_quotes_client_id ON quotes(client_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

-- Policy: Los usuarios solo pueden ver sus propios presupuestos
CREATE POLICY "Users can view their own quotes"
  ON quotes
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Los usuarios solo pueden insertar sus propios presupuestos
CREATE POLICY "Users can insert their own quotes"
  ON quotes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Los usuarios solo pueden actualizar sus propios presupuestos
CREATE POLICY "Users can update their own quotes"
  ON quotes
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Los usuarios solo pueden eliminar sus propios presupuestos
CREATE POLICY "Users can delete their own quotes"
  ON quotes
  FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- COMENTARIOS
-- =====================================================

COMMENT ON TABLE quotes IS 'Tabla de presupuestos con gestión de borradores y presupuestos emitidos';
COMMENT ON COLUMN quotes.user_id IS 'ID del usuario propietario del presupuesto';
COMMENT ON COLUMN quotes.quote_number IS 'Número único de presupuesto (formato: SERIE-AÑO-NÚMERO)';
COMMENT ON COLUMN quotes.quote_series IS 'Serie del presupuesto (P, Q, R, etc.)';
COMMENT ON COLUMN quotes.client_id IS 'ID del cliente asociado (puede ser NULL si se eliminó el cliente)';
COMMENT ON COLUMN quotes.client_name IS 'Nombre del cliente (desnormalizado para histórico)';
COMMENT ON COLUMN quotes.issue_date IS 'Fecha de emisión del presupuesto';
COMMENT ON COLUMN quotes.due_date IS 'Fecha de vencimiento del presupuesto';
COMMENT ON COLUMN quotes.subtotal IS 'Subtotal sin impuestos';
COMMENT ON COLUMN quotes.tax_amount IS 'Total de impuestos';
COMMENT ON COLUMN quotes.total_amount IS 'Importe total del presupuesto';
COMMENT ON COLUMN quotes.currency IS 'Moneda (EUR, USD, GBP)';
COMMENT ON COLUMN quotes.status IS 'Estado: draft (borrador), issued (emitido), cancelled (anulado)';
COMMENT ON COLUMN quotes.is_paid IS 'Indica si el presupuesto está pagado';
COMMENT ON COLUMN quotes.paid_at IS 'Fecha y hora de pago';
COMMENT ON COLUMN quotes.quote_data IS 'Datos completos del presupuesto en formato JSON (emisor, conceptos, impuestos, métodos de pago, etc.)';

-- =====================================================
-- NOTAS
-- =====================================================
--
-- Estructura del campo quote_data (JSONB):
-- {
--   "issuer": { "name": "...", "nif": "...", "email": "...", "address": "...", "postalCode": "..." },
--   "client": { "name": "...", "nif": "...", "email": "...", "address": "...", "postalCode": "..." },
--   "concepts": [
--     { "description": "...", "quantity": 1, "price": 100, "tax": "21%", "discount": 0, "total": 121 }
--   ],
--   "payment": { "terms": "30 días", "methods": [...] },
--   "dates": { "operation": "2026-02-06" },
--   "options": { "recargoEquivalencia": false, "gastosSuplidos": 0, "observaciones": "..." },
--   "adjustments": { "discount": 0, "withholding": 0 }
-- }
--
-- Estados:
-- - draft: Borrador editable
-- - issued: Presupuesto emitido (no se puede modificar quote_data)
-- - cancelled: Presupuesto anulado (soft delete)
--
-- =====================================================
