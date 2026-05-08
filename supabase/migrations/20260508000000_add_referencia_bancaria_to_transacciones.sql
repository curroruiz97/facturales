-- Migración: añadir columna `referencia_bancaria` a la tabla `transacciones`
-- Fecha: 2026-05-08
-- Descripción: Permite registrar el dato bancario asociado al gasto (IBAN,
--              número de cuenta, referencia de transferencia, etc.). Opcional.

ALTER TABLE transacciones
  ADD COLUMN IF NOT EXISTS referencia_bancaria TEXT;

COMMENT ON COLUMN transacciones.referencia_bancaria IS
  'Referencia bancaria asociada al gasto (IBAN, número de cuenta, referencia de transferencia, etc.). Opcional.';
