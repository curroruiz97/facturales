-- Migración: Relajar constraint del sector en business_info
-- Fecha: 2026-04-22
-- Descripción: Simplifica el onboarding eliminando la obligatoriedad del campo sector
--              y su lista cerrada de valores. Se conserva la columna por compatibilidad
--              (texto libre, opcional).

ALTER TABLE public.business_info DROP CONSTRAINT IF EXISTS business_info_sector_check;
ALTER TABLE public.business_info ALTER COLUMN sector DROP NOT NULL;

COMMENT ON COLUMN public.business_info.sector IS 'Sector de actividad del negocio (opcional, texto libre)';
