-- Migración: Crear tabla fiscal_is_settings
-- Fecha: 2026-02-26
-- Descripción: Tabla para persistir inputs del Impuesto de Sociedades (IS) por usuario y año

CREATE TABLE fiscal_is_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year INT NOT NULL CHECK (year >= 2020 AND year <= 2100),
  ajustes_extracontables NUMERIC(12,2) DEFAULT 0,
  compensacion_bin NUMERIC(12,2) DEFAULT 0,
  deducciones_bonificaciones NUMERIC(12,2) DEFAULT 0,
  retenciones_pagos_cuenta NUMERIC(12,2) DEFAULT 0,
  tipo_gravamen TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, year)
);

CREATE INDEX idx_fiscal_is_settings_user ON fiscal_is_settings(user_id);
CREATE INDEX idx_fiscal_is_settings_user_year ON fiscal_is_settings(user_id, year);

CREATE TRIGGER update_fiscal_is_settings_updated_at
  BEFORE UPDATE ON fiscal_is_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE fiscal_is_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios ven solo sus fiscal_is_settings"
ON fiscal_is_settings FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Usuarios crean sus fiscal_is_settings"
ON fiscal_is_settings FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Usuarios actualizan sus fiscal_is_settings"
ON fiscal_is_settings FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Usuarios eliminan sus fiscal_is_settings"
ON fiscal_is_settings FOR DELETE TO authenticated
USING (user_id = auth.uid());

COMMENT ON TABLE fiscal_is_settings IS 'Configuración del Impuesto de Sociedades por usuario y año fiscal';
