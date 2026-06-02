-- Migración: reforzar la inmutabilidad de facturas emitidas (integridad fiscal / Verifactu — hallazgo P1-2)
-- Fecha: 2026-06-02
--
-- La app solo usa soft-delete (UPDATE status='cancelled') y emit (draft->issued); nunca hard-delete
-- ni cambia el número tras emitir. Pero la BASE DE DATOS sí lo permitía vía API directa. Esto lo cierra:
--   1) Solo se pueden BORRAR (hard delete) los borradores; las facturas emitidas/anuladas son inborrables.
--   2) En una factura emitida ahora también es inmutable el invoice_number, y no se puede volver a 'draft'.
--   3) Se fija search_path en la función (buena práctica; mitiga un lint del advisor de seguridad).

-- 1) DELETE restringido a borradores
DROP POLICY IF EXISTS "Users can delete their own invoices" ON invoices;
CREATE POLICY "Users can delete their own draft invoices"
  ON invoices
  FOR DELETE
  USING (auth.uid() = user_id AND status = 'draft');

-- 2) + 3) Validación reforzada de updates
CREATE OR REPLACE FUNCTION validate_invoice_update()
RETURNS TRIGGER AS $$
BEGIN
  -- No se puede devolver a borrador una factura ya emitida o anulada.
  IF OLD.status IN ('issued', 'cancelled') AND NEW.status = 'draft' THEN
    RAISE EXCEPTION 'No se puede devolver a borrador una factura ya emitida o anulada.';
  END IF;

  -- En facturas emitidas, los datos fiscales (incluido el número) son inmutables.
  IF OLD.status = 'issued' THEN
    IF NEW.invoice_number IS DISTINCT FROM OLD.invoice_number
       OR NEW.invoice_data IS DISTINCT FROM OLD.invoice_data
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

  -- Gestión de paid_at (lógica original conservada)
  IF NEW.is_paid = TRUE AND NEW.paid_at IS NULL THEN
    NEW.paid_at = NOW();
  END IF;
  IF NEW.is_paid = FALSE THEN
    NEW.paid_at = NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;
