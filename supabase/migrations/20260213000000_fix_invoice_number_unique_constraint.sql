-- ============================================
-- Fix: Colisión multi-tenant en numeración
-- Reemplaza UNIQUE global por UNIQUE compuesto (user_id, number)
-- ============================================

-- INVOICES: Eliminar UNIQUE global, crear UNIQUE compuesto
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_invoice_number_key;
DROP INDEX IF EXISTS idx_invoices_number;
CREATE UNIQUE INDEX idx_invoices_user_invoice_number
  ON invoices(user_id, invoice_number);

-- QUOTES: Eliminar UNIQUE global, crear UNIQUE compuesto
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_quote_number_key;
DROP INDEX IF EXISTS idx_quotes_number;
CREATE UNIQUE INDEX idx_quotes_user_quote_number
  ON quotes(user_id, quote_number);
