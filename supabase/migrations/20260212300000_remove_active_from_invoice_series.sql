-- Eliminar columna 'active' de invoice_series (no se utiliza)
ALTER TABLE invoice_series DROP COLUMN IF EXISTS active;
