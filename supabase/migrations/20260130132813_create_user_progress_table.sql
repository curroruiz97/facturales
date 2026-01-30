-- Migración: Crear tabla user_progress para seguimiento de "Primeros Pasos"
-- Fecha: 2026-01-30
-- Descripción: Sistema de onboarding que rastrea el progreso del usuario en los pasos iniciales

-- =====================================================
-- CREAR TABLA user_progress
-- =====================================================

CREATE TABLE user_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  step1_business_info BOOLEAN DEFAULT TRUE,
  step2_first_client BOOLEAN DEFAULT FALSE,
  step3_customize_invoice BOOLEAN DEFAULT TRUE,
  step4_first_invoice BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES
-- =====================================================

-- Índice en user_id para búsquedas rápidas
CREATE INDEX idx_user_progress_user_id ON user_progress(user_id);

-- =====================================================
-- TRIGGER PARA updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_user_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_progress_updated_at
  BEFORE UPDATE ON user_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_user_progress_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- Policy: Los usuarios solo pueden ver su propio progreso
CREATE POLICY "Users can view their own progress"
  ON user_progress
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Los usuarios solo pueden insertar su propio progreso
CREATE POLICY "Users can insert their own progress"
  ON user_progress
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Los usuarios solo pueden actualizar su propio progreso
CREATE POLICY "Users can update their own progress"
  ON user_progress
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Los usuarios solo pueden eliminar su propio progreso
CREATE POLICY "Users can delete their own progress"
  ON user_progress
  FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- COMENTARIOS
-- =====================================================

COMMENT ON TABLE user_progress IS 'Seguimiento del progreso de onboarding de usuarios';
COMMENT ON COLUMN user_progress.user_id IS 'ID del usuario (referencia a auth.users)';
COMMENT ON COLUMN user_progress.step1_business_info IS 'Paso 1: Añadir datos de negocio (auto-completado al registrarse)';
COMMENT ON COLUMN user_progress.step2_first_client IS 'Paso 2: Crear primer contacto/cliente';
COMMENT ON COLUMN user_progress.step3_customize_invoice IS 'Paso 3: Personalizar factura (siempre TRUE por ahora)';
COMMENT ON COLUMN user_progress.step4_first_invoice IS 'Paso 4: Crear primera factura (preparado para futuro)';

-- =====================================================
-- NOTAS:
-- =====================================================
-- 
-- Estados de pasos:
-- - step1_business_info: TRUE por defecto (completado al tener business_info)
-- - step2_first_client: FALSE por defecto, TRUE al crear primer cliente
-- - step3_customize_invoice: TRUE por defecto (funcionalidad pendiente)
-- - step4_first_invoice: FALSE por defecto (funcionalidad pendiente)
-- 
-- =====================================================
