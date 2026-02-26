-- Migración: Añadir IVA e IRPF a transacciones
-- Fecha: 2026-02-26
-- Descripción: Añade columnas opcionales de IVA (%) e IRPF (%) a la tabla transacciones

ALTER TABLE transacciones
  ADD COLUMN iva_porcentaje NUMERIC(5,2) DEFAULT NULL CHECK (iva_porcentaje IS NULL OR (iva_porcentaje >= 0 AND iva_porcentaje <= 100)),
  ADD COLUMN irpf_porcentaje NUMERIC(5,2) DEFAULT NULL CHECK (irpf_porcentaje IS NULL OR (irpf_porcentaje >= 0 AND irpf_porcentaje <= 100));

COMMENT ON COLUMN transacciones.iva_porcentaje IS 'Porcentaje de IVA aplicado (opcional, 0-100)';
COMMENT ON COLUMN transacciones.irpf_porcentaje IS 'Porcentaje de IRPF aplicado (opcional, 0-100)';
