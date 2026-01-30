-- Migración: Crear tabla invoices para gestión de facturas
-- Fecha: 2026-01-30
-- Descripción: Sistema completo de facturas con borradores y facturas emitidas

-- =====================================================
-- CREAR TABLA invoices (estructura híbrida)
-- =====================================================

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  invoice_number TEXT UNIQUE,
  invoice_series TEXT NOT NULL DEFAULT 'A',
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
  invoice_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- FUNCIÓN PARA GENERAR NÚMERO DE FACTURA
-- =====================================================

CREATE OR REPLACE FUNCTION generate_invoice_number()
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
        SPLIT_PART(invoice_number, '-', 3) AS INTEGER
      )
    ),
    0
  )
  INTO max_number
  FROM invoices
  WHERE invoice_series = NEW.invoice_series
    AND invoice_number LIKE NEW.invoice_series || '-' || current_year || '-%'
    AND user_id = NEW.user_id;
  
  -- Generar el nuevo número
  new_number := LPAD((max_number + 1)::TEXT, 5, '0');
  
  -- Asignar el número completo
  NEW.invoice_number := NEW.invoice_series || '-' || current_year || '-' || new_number;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGER PARA ASIGNAR NÚMERO DE FACTURA
-- =====================================================

CREATE TRIGGER set_invoice_number
  BEFORE INSERT ON invoices
  FOR EACH ROW
  WHEN (NEW.invoice_number IS NULL)
  EXECUTE FUNCTION generate_invoice_number();

-- =====================================================
-- TRIGGER PARA updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_invoices_updated_at();

-- =====================================================
-- FUNCIÓN PARA VALIDAR ACTUALIZACIONES
-- =====================================================

CREATE OR REPLACE FUNCTION validate_invoice_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Si la factura está emitida, solo permitir cambiar is_paid, paid_at y status
  IF OLD.status = 'issued' THEN
    -- Verificar que solo cambien los campos permitidos
    IF NEW.invoice_data IS DISTINCT FROM OLD.invoice_data
       OR NEW.subtotal IS DISTINCT FROM OLD.subtotal
       OR NEW.tax_amount IS DISTINCT FROM OLD.tax_amount
       OR NEW.total_amount IS DISTINCT FROM OLD.total_amount
       OR NEW.client_id IS DISTINCT FROM OLD.client_id
       OR NEW.client_name IS DISTINCT FROM OLD.client_name
       OR NEW.issue_date IS DISTINCT FROM OLD.issue_date
       OR NEW.due_date IS DISTINCT FROM OLD.due_date
       OR NEW.currency IS DISTINCT FROM OLD.currency
       OR NEW.invoice_series IS DISTINCT FROM OLD.invoice_series THEN
      RAISE EXCEPTION 'No se pueden modificar los datos de una factura emitida. Solo se puede marcar como pagada o anularla.';
    END IF;
  END IF;
  
  -- Validar que si se marca como pagada, se establezca paid_at
  IF NEW.is_paid = TRUE AND NEW.paid_at IS NULL THEN
    NEW.paid_at = NOW();
  END IF;
  
  -- Si se desmarca como pagada, limpiar paid_at
  IF NEW.is_paid = FALSE THEN
    NEW.paid_at = NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_invoice_update_trigger
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION validate_invoice_update();

-- =====================================================
-- ÍNDICES
-- =====================================================

CREATE INDEX idx_invoices_user_id ON invoices(user_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_issue_date ON invoices(issue_date);
CREATE INDEX idx_invoices_client_id ON invoices(client_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Policy: Los usuarios solo pueden ver sus propias facturas
CREATE POLICY "Users can view their own invoices"
  ON invoices
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Los usuarios solo pueden insertar sus propias facturas
CREATE POLICY "Users can insert their own invoices"
  ON invoices
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Los usuarios solo pueden actualizar sus propias facturas
CREATE POLICY "Users can update their own invoices"
  ON invoices
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Los usuarios solo pueden eliminar sus propias facturas
CREATE POLICY "Users can delete their own invoices"
  ON invoices
  FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- COMENTARIOS
-- =====================================================

COMMENT ON TABLE invoices IS 'Tabla de facturas con gestión de borradores y facturas emitidas';
COMMENT ON COLUMN invoices.user_id IS 'ID del usuario propietario de la factura';
COMMENT ON COLUMN invoices.invoice_number IS 'Número único de factura (formato: SERIE-AÑO-NÚMERO)';
COMMENT ON COLUMN invoices.invoice_series IS 'Serie de la factura (A, B, C, etc.)';
COMMENT ON COLUMN invoices.client_id IS 'ID del cliente asociado (puede ser NULL si se eliminó el cliente)';
COMMENT ON COLUMN invoices.client_name IS 'Nombre del cliente (desnormalizado para histórico)';
COMMENT ON COLUMN invoices.issue_date IS 'Fecha de emisión de la factura';
COMMENT ON COLUMN invoices.due_date IS 'Fecha de vencimiento de la factura';
COMMENT ON COLUMN invoices.subtotal IS 'Subtotal sin impuestos';
COMMENT ON COLUMN invoices.tax_amount IS 'Total de impuestos';
COMMENT ON COLUMN invoices.total_amount IS 'Importe total de la factura';
COMMENT ON COLUMN invoices.currency IS 'Moneda (EUR, USD, GBP)';
COMMENT ON COLUMN invoices.status IS 'Estado: draft (borrador), issued (emitida), cancelled (anulada)';
COMMENT ON COLUMN invoices.is_paid IS 'Indica si la factura está pagada';
COMMENT ON COLUMN invoices.paid_at IS 'Fecha y hora de pago';
COMMENT ON COLUMN invoices.invoice_data IS 'Datos completos de la factura en formato JSON (emisor, conceptos, impuestos, métodos de pago, etc.)';

-- =====================================================
-- NOTAS
-- =====================================================
--
-- Estructura del campo invoice_data (JSONB):
-- {
--   "issuer": { "name": "...", "nif": "...", "email": "...", "address": "...", "postalCode": "..." },
--   "client": { "name": "...", "nif": "...", "email": "...", "address": "...", "postalCode": "..." },
--   "concepts": [
--     { "description": "...", "quantity": 1, "price": 100, "tax": "21%", "discount": 0, "total": 121 }
--   ],
--   "payment": { "terms": "30 días", "methods": [...] },
--   "dates": { "operation": "2026-01-30" },
--   "options": { "recargoEquivalencia": false, "gastosSuplidos": 0, "observaciones": "..." },
--   "adjustments": { "discount": 0, "withholding": 0 }
-- }
--
-- Estados:
-- - draft: Borrador editable
-- - issued: Factura emitida (no se puede modificar invoice_data)
-- - cancelled: Factura anulada (soft delete)
--
-- =====================================================
