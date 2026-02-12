-- Migración: Añadir campo income_goal a business_info
-- Fecha: 2026-02-12
-- Descripción: Almacena el objetivo de ingresos anuales del usuario

ALTER TABLE business_info
ADD COLUMN income_goal NUMERIC DEFAULT 0;

COMMENT ON COLUMN business_info.income_goal IS 'Objetivo de ingresos anuales del usuario en euros';
