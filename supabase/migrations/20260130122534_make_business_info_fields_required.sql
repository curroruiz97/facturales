-- Migración: Hacer campos obligatorios en business_info
-- Fecha: 2026-01-30
-- Descripción: Cambiar campos opcionales a NOT NULL en business_info

-- =====================================================
-- HACER CAMPOS OBLIGATORIOS
-- =====================================================

-- Primero actualizar cualquier registro que tenga NULL con valores por defecto
UPDATE business_info 
SET 
  telefono = COALESCE(telefono, ''),
  direccion_facturacion = COALESCE(direccion_facturacion, ''),
  ciudad = COALESCE(ciudad, ''),
  codigo_postal = COALESCE(codigo_postal, ''),
  provincia = COALESCE(provincia, '')
WHERE 
  telefono IS NULL OR 
  direccion_facturacion IS NULL OR 
  ciudad IS NULL OR 
  codigo_postal IS NULL OR 
  provincia IS NULL;

-- Ahora hacer los campos NOT NULL
ALTER TABLE business_info 
  ALTER COLUMN telefono SET NOT NULL,
  ALTER COLUMN direccion_facturacion SET NOT NULL,
  ALTER COLUMN ciudad SET NOT NULL,
  ALTER COLUMN codigo_postal SET NOT NULL,
  ALTER COLUMN provincia SET NOT NULL;

-- =====================================================
-- COMENTARIOS ACTUALIZADOS
-- =====================================================

COMMENT ON COLUMN business_info.telefono IS 'Teléfono de contacto (obligatorio)';
COMMENT ON COLUMN business_info.direccion_facturacion IS 'Dirección para facturación (obligatorio)';
COMMENT ON COLUMN business_info.ciudad IS 'Ciudad (obligatorio)';
COMMENT ON COLUMN business_info.codigo_postal IS 'Código postal (obligatorio)';
COMMENT ON COLUMN business_info.provincia IS 'Provincia (obligatorio)';

-- =====================================================
-- NOTAS:
-- =====================================================
-- 
-- Ahora todos los campos son obligatorios:
-- - nombre_fiscal (ya era obligatorio)
-- - nif_cif (ya era obligatorio)
-- - telefono (ahora obligatorio)
-- - direccion_facturacion (ahora obligatorio)
-- - ciudad (ahora obligatorio)
-- - codigo_postal (ahora obligatorio)
-- - provincia (ahora obligatorio)
-- - pais (opcional, por defecto 'España')
-- - sector (ya era obligatorio)
-- 
-- =====================================================
