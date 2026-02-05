-- Migración: Crear tabla transacciones
-- Fecha: 2026-02-05
-- Descripción: Tabla para almacenar transacciones (gastos e ingresos) vinculadas a usuarios

-- =====================================================
-- 1. CREAR TABLA transacciones
-- =====================================================

CREATE TABLE transacciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  importe NUMERIC(10,2) NOT NULL CHECK (importe > 0),
  concepto TEXT NOT NULL,
  fecha DATE NOT NULL,
  categoria TEXT NOT NULL CHECK (categoria IN (
    'material_oficina',
    'servicios_profesionales',
    'suministros',
    'alquiler',
    'transporte',
    'marketing',
    'otros'
  )),
  observaciones TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN ('gasto', 'ingreso')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. ÍNDICES PARA OPTIMIZAR BÚSQUEDAS
-- =====================================================

CREATE INDEX idx_transacciones_user_id ON transacciones(user_id);
CREATE INDEX idx_transacciones_cliente_id ON transacciones(cliente_id);
CREATE INDEX idx_transacciones_fecha ON transacciones(fecha);
CREATE INDEX idx_transacciones_tipo ON transacciones(tipo);
CREATE INDEX idx_transacciones_categoria ON transacciones(categoria);
CREATE INDEX idx_transacciones_user_fecha ON transacciones(user_id, fecha);
CREATE INDEX idx_transacciones_user_tipo ON transacciones(user_id, tipo);

-- =====================================================
-- 3. TRIGGER PARA ACTUALIZAR updated_at
-- =====================================================

-- Reutilizar la función update_updated_at_column() ya existente
CREATE TRIGGER update_transacciones_updated_at
  BEFORE UPDATE ON transacciones
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 4. HABILITAR ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE transacciones ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 5. POLÍTICAS DE RLS POR USUARIO
-- =====================================================

-- Política de LECTURA: usuarios solo ven sus propias transacciones
CREATE POLICY "Usuarios ven solo sus transacciones"
ON transacciones FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Política de INSERCIÓN: usuarios solo pueden crear transacciones para sí mismos
CREATE POLICY "Usuarios crean sus propias transacciones"
ON transacciones FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Política de ACTUALIZACIÓN: usuarios solo pueden actualizar sus propias transacciones
CREATE POLICY "Usuarios actualizan solo sus transacciones"
ON transacciones FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Política de ELIMINACIÓN: usuarios solo pueden eliminar sus propias transacciones
CREATE POLICY "Usuarios eliminan solo sus transacciones"
ON transacciones FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- =====================================================
-- 6. COMENTARIOS PARA DOCUMENTACIÓN
-- =====================================================

COMMENT ON TABLE transacciones IS 'Tabla de transacciones (gastos e ingresos) con RLS por usuario';
COMMENT ON COLUMN transacciones.user_id IS 'ID del usuario propietario de la transacción';
COMMENT ON COLUMN transacciones.cliente_id IS 'ID del cliente/contacto asociado (opcional)';
COMMENT ON COLUMN transacciones.importe IS 'Importe de la transacción (debe ser mayor que 0)';
COMMENT ON COLUMN transacciones.concepto IS 'Descripción o concepto de la transacción';
COMMENT ON COLUMN transacciones.fecha IS 'Fecha de la transacción';
COMMENT ON COLUMN transacciones.categoria IS 'Categoría de la transacción';
COMMENT ON COLUMN transacciones.observaciones IS 'Notas adicionales (máximo 150 caracteres, validado en aplicación)';
COMMENT ON COLUMN transacciones.tipo IS 'Tipo de transacción: gasto o ingreso';

-- =====================================================
-- NOTAS IMPORTANTES:
-- =====================================================
-- 
-- 1. user_id es obligatorio y se vincula automáticamente en la aplicación
-- 2. cliente_id es opcional (puede haber transacciones sin contacto asociado)
-- 3. Al eliminar un cliente, las transacciones se mantienen (ON DELETE SET NULL)
-- 4. Al eliminar un usuario, sus transacciones se eliminan (ON DELETE CASCADE)
-- 5. RLS garantiza que cada usuario solo vea sus propias transacciones
-- 6. La validación de observaciones (150 caracteres) se hace en la aplicación
-- 7. Las categorías están predefinidas y validadas a nivel de base de datos
-- 
-- =====================================================
