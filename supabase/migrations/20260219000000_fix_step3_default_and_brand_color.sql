-- Migración: Corregir default del paso 3 de onboarding y color de marca
-- Fecha: 2026-02-19
-- Descripción: 
--   1. Cambiar default de step3_customize_invoice a FALSE (antes TRUE)
--   2. Cambiar default de brand_color a #000000 (negro, antes #22C55E)
--   3. Resetear step3 a FALSE para usuarios que nunca personalizaron

-- =====================================================
-- CAMBIAR DEFAULT DE step3_customize_invoice
-- =====================================================

ALTER TABLE user_progress
  ALTER COLUMN step3_customize_invoice SET DEFAULT FALSE;

-- Resetear step3 a FALSE para usuarios cuyo business_info NO tiene logo
-- ni color personalizado (distinto de negro y del antiguo default verde)
UPDATE user_progress
SET step3_customize_invoice = FALSE,
    updated_at = NOW()
WHERE user_id NOT IN (
  SELECT user_id FROM business_info
  WHERE invoice_image_url IS NOT NULL
     OR (brand_color IS NOT NULL AND brand_color NOT IN ('#22C55E', '#000000'))
);

-- =====================================================
-- CAMBIAR DEFAULT DE brand_color
-- =====================================================

ALTER TABLE business_info
  ALTER COLUMN brand_color SET DEFAULT '#000000';

-- Actualizar usuarios que aún tienen el antiguo default verde sin haberlo cambiado
-- (solo si no tienen logo, lo que indica que nunca personalizaron)
UPDATE business_info
SET brand_color = '#000000'
WHERE brand_color = '#22C55E'
  AND invoice_image_url IS NULL;

-- =====================================================
-- ACTUALIZAR COMENTARIOS
-- =====================================================

COMMENT ON COLUMN user_progress.step3_customize_invoice IS 'Paso 3: Personalizar factura (TRUE cuando el usuario sube logo o cambia color)';
COMMENT ON COLUMN business_info.brand_color IS 'Color principal de marca en formato HEX (default: #000000 negro) para facturas';
