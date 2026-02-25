-- Añadir campo business_type a business_info
-- Valores posibles: 'autonomo', 'empresa'
-- Por defecto null para registros existentes (se pedirá que lo completen)

ALTER TABLE business_info
  ADD COLUMN IF NOT EXISTS business_type TEXT
  CHECK (business_type IN ('autonomo', 'empresa'));

COMMENT ON COLUMN business_info.business_type IS 'Tipo de negocio: autonomo o empresa. Afecta a la retención IRPF por defecto.';
