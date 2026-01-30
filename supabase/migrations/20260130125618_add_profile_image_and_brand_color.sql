-- Migración: Agregar imagen de perfil y color de marca
-- Fecha: 2026-01-30
-- Descripción: Añadir campos para imagen de perfil y color de marca a business_info

-- =====================================================
-- AGREGAR NUEVOS CAMPOS
-- =====================================================

-- Añadir campo para imagen de perfil (almacenada como URL o base64)
ALTER TABLE business_info 
  ADD COLUMN IF NOT EXISTS profile_image_url TEXT;

-- Añadir campo para color de marca en formato HEX
ALTER TABLE business_info 
  ADD COLUMN IF NOT EXISTS brand_color TEXT DEFAULT '#22C55E';

-- =====================================================
-- VALIDACIONES
-- =====================================================

-- Agregar restricción para validar formato HEX del color de marca
-- Formato: #RRGGBB (6 caracteres hexadecimales)
ALTER TABLE business_info 
  ADD CONSTRAINT brand_color_hex_format 
  CHECK (brand_color IS NULL OR brand_color ~* '^#[0-9A-Fa-f]{6}$');

-- =====================================================
-- COMENTARIOS
-- =====================================================

COMMENT ON COLUMN business_info.profile_image_url IS 'URL o base64 de la imagen de perfil del negocio (máximo 1 MB)';
COMMENT ON COLUMN business_info.brand_color IS 'Color principal de marca en formato HEX (ejemplo: #22C55E) para facturas';

-- =====================================================
-- NOTAS:
-- =====================================================
-- 
-- Nuevos campos opcionales:
-- - profile_image_url: Almacena la imagen de perfil como URL o base64
--   * Máximo recomendado: 1 MB
--   * Formatos soportados: PNG, JPG, GIF, WebP
--   
-- - brand_color: Color de marca en formato HEX (#RRGGBB)
--   * Por defecto: #22C55E (verde)
--   * Se usa en la personalización de facturas
--   * Formato validado por constraint
-- 
-- =====================================================
