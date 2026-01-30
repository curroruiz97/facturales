-- Migración: Agregar user_id a tabla clientes y actualizar RLS
-- Fecha: 2026-01-29
-- Descripción: Relacionar clientes con usuarios específicos y filtrar por usuario

-- =====================================================
-- 1. AGREGAR COLUMNA user_id
-- =====================================================

ALTER TABLE clientes 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Comentario para documentación
COMMENT ON COLUMN clientes.user_id IS 'ID del usuario propietario del cliente';

-- =====================================================
-- 2. CREAR ÍNDICE PARA OPTIMIZAR CONSULTAS
-- =====================================================

CREATE INDEX idx_clientes_user_id ON clientes(user_id);

-- =====================================================
-- 3. ACTUALIZAR RLS - ELIMINAR POLÍTICAS ANTIGUAS
-- =====================================================

-- Eliminar políticas que permiten acceso a todos los usuarios autenticados
DROP POLICY IF EXISTS "Usuarios autenticados pueden leer clientes" ON clientes;
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear clientes" ON clientes;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar clientes" ON clientes;
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar clientes" ON clientes;

-- Eliminar políticas de bloqueo para usuarios anónimos (ya no necesarias)
DROP POLICY IF EXISTS "Bloquear lectura a usuarios anónimos" ON clientes;
DROP POLICY IF EXISTS "Bloquear inserción a usuarios anónimos" ON clientes;
DROP POLICY IF EXISTS "Bloquear actualización a usuarios anónimos" ON clientes;
DROP POLICY IF EXISTS "Bloquear eliminación a usuarios anónimos" ON clientes;

-- =====================================================
-- 4. CREAR NUEVAS POLÍTICAS CON FILTRO POR user_id
-- =====================================================

-- Política de LECTURA: usuarios solo ven sus propios clientes
CREATE POLICY "Usuarios ven solo sus clientes"
ON clientes FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Política de INSERCIÓN: usuarios solo pueden crear clientes para sí mismos
CREATE POLICY "Usuarios crean sus propios clientes"
ON clientes FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Política de ACTUALIZACIÓN: usuarios solo pueden actualizar sus propios clientes
CREATE POLICY "Usuarios actualizan solo sus clientes"
ON clientes FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Política de ELIMINACIÓN: usuarios solo pueden eliminar sus propios clientes
CREATE POLICY "Usuarios eliminan solo sus clientes"
ON clientes FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- =====================================================
-- 5. MIGRACIÓN DE DATOS EXISTENTES (OPCIONAL)
-- =====================================================

-- Si ya hay clientes sin user_id, puedes asignarlos a un usuario específico
-- Descomenta y modifica el siguiente comando si es necesario:

-- UPDATE clientes 
-- SET user_id = 'UUID_DEL_USUARIO_AQUI'
-- WHERE user_id IS NULL;

-- Nota: Reemplaza 'UUID_DEL_USUARIO_AQUI' con el UUID real del usuario
-- Puedes obtener el UUID del usuario desde: Authentication > Users en Supabase Dashboard

-- =====================================================
-- 6. VERIFICAR POLÍTICAS CREADAS
-- =====================================================

-- Ejecutar esta consulta para verificar las políticas:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd
-- FROM pg_policies 
-- WHERE tablename = 'clientes';

-- =====================================================
-- NOTAS IMPORTANTES:
-- =====================================================
-- 
-- 1. Después de aplicar esta migración, cada cliente estará asociado a un usuario
-- 2. Los usuarios SOLO verán sus propios clientes
-- 3. Al crear un cliente, el código debe asignar automáticamente el user_id
-- 4. Si intentan acceder a clientes de otros usuarios, RLS lo bloqueará
-- 5. Esta migración es compatible con la estructura existente de la tabla
-- 
-- =====================================================

COMMENT ON TABLE clientes IS 'Tabla de clientes con RLS por usuario. Cada usuario solo ve sus propios clientes.';
