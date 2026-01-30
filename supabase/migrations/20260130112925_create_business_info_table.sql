-- Migración: Crear tabla business_info
-- Fecha: 2026-01-30
-- Descripción: Tabla para almacenar información de negocio/facturación de usuarios

-- =====================================================
-- 1. CREAR TABLA business_info
-- =====================================================

CREATE TABLE business_info (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  nombre_fiscal TEXT NOT NULL,
  nif_cif TEXT NOT NULL UNIQUE,
  telefono TEXT,
  direccion_facturacion TEXT,
  ciudad TEXT,
  codigo_postal TEXT,
  provincia TEXT,
  pais TEXT DEFAULT 'España',
  sector TEXT NOT NULL CHECK (sector IN (
    'actividades lúdicas y viajes',
    'agricultura ganaderia',
    'asociaciones',
    'comercio',
    'formacion',
    'hosteleria',
    'inmobiliario',
    'reformas y reparaciones',
    'salud y bienestar',
    'servicios artísticos y marketing',
    'servicios profesionales',
    'servicios tecnológicos IT',
    'transporte'
  )),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. ÍNDICES PARA OPTIMIZAR BÚSQUEDAS
-- =====================================================

CREATE INDEX idx_business_info_user_id ON business_info(user_id);
CREATE INDEX idx_business_info_nif_cif ON business_info(nif_cif);

-- =====================================================
-- 3. TRIGGER PARA ACTUALIZAR updated_at
-- =====================================================

-- Reutilizar la función update_updated_at_column() existente
CREATE TRIGGER update_business_info_updated_at
  BEFORE UPDATE ON business_info
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 4. HABILITAR ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE business_info ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 5. POLÍTICAS RLS
-- =====================================================

-- Política de LECTURA: usuarios solo ven su propia información de negocio
CREATE POLICY "Usuarios ven solo su business_info"
ON business_info FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Política de INSERCIÓN: usuarios solo pueden crear su propia información
CREATE POLICY "Usuarios crean su propio business_info"
ON business_info FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Política de ACTUALIZACIÓN: usuarios solo pueden actualizar su propia información
CREATE POLICY "Usuarios actualizan solo su business_info"
ON business_info FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Política de ELIMINACIÓN: usuarios solo pueden eliminar su propia información
CREATE POLICY "Usuarios eliminan solo su business_info"
ON business_info FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- =====================================================
-- 6. COMENTARIOS PARA DOCUMENTACIÓN
-- =====================================================

COMMENT ON TABLE business_info IS 'Tabla de información de negocio/facturación de usuarios con RLS. Cada usuario solo ve su propia información.';
COMMENT ON COLUMN business_info.user_id IS 'ID del usuario propietario (único por usuario)';
COMMENT ON COLUMN business_info.nombre_fiscal IS 'Nombre fiscal o razón social del negocio';
COMMENT ON COLUMN business_info.nif_cif IS 'NIF/CIF único del negocio';
COMMENT ON COLUMN business_info.telefono IS 'Teléfono de contacto';
COMMENT ON COLUMN business_info.direccion_facturacion IS 'Dirección para facturación';
COMMENT ON COLUMN business_info.sector IS 'Sector de actividad del negocio';

-- =====================================================
-- NOTAS IMPORTANTES:
-- =====================================================
-- 
-- 1. Cada usuario solo puede tener un registro en business_info (constraint UNIQUE en user_id)
-- 2. El NIF/CIF debe ser único en todo el sistema
-- 3. Los campos nombre_fiscal, nif_cif y sector son obligatorios
-- 4. El país tiene valor por defecto 'España'
-- 5. RLS garantiza que usuarios solo accedan a su propia información
-- 6. El registro debe completarse después del signup para acceder al dashboard
-- 
-- =====================================================
