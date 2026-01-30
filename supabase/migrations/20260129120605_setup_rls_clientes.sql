-- Migración: Configurar Row Level Security para tabla clientes
-- Fecha: 2026-01-29
-- Descripción: Habilitar RLS y crear políticas de acceso basadas en autenticación

-- =====================================================
-- 1. HABILITAR ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. POLÍTICAS DE LECTURA (SELECT)
-- =====================================================

-- Permitir lectura a usuarios autenticados
CREATE POLICY "Usuarios autenticados pueden leer clientes"
ON clientes
FOR SELECT
TO authenticated
USING (true);

-- Bloquear lectura a usuarios anónimos (por seguridad)
CREATE POLICY "Bloquear lectura a usuarios anónimos"
ON clientes
FOR SELECT
TO anon
USING (false);

-- =====================================================
-- 3. POLÍTICAS DE INSERCIÓN (INSERT)
-- =====================================================

-- Permitir inserción a usuarios autenticados
CREATE POLICY "Usuarios autenticados pueden crear clientes"
ON clientes
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Bloquear inserción a usuarios anónimos
CREATE POLICY "Bloquear inserción a usuarios anónimos"
ON clientes
FOR INSERT
TO anon
WITH CHECK (false);

-- =====================================================
-- 4. POLÍTICAS DE ACTUALIZACIÓN (UPDATE)
-- =====================================================

-- Permitir actualización a usuarios autenticados
CREATE POLICY "Usuarios autenticados pueden actualizar clientes"
ON clientes
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Bloquear actualización a usuarios anónimos
CREATE POLICY "Bloquear actualización a usuarios anónimos"
ON clientes
FOR UPDATE
TO anon
USING (false);

-- =====================================================
-- 5. POLÍTICAS DE ELIMINACIÓN (DELETE)
-- =====================================================

-- Permitir eliminación a usuarios autenticados
CREATE POLICY "Usuarios autenticados pueden eliminar clientes"
ON clientes
FOR DELETE
TO authenticated
USING (true);

-- Bloquear eliminación a usuarios anónimos
CREATE POLICY "Bloquear eliminación a usuarios anónimos"
ON clientes
FOR DELETE
TO anon
USING (false);

-- =====================================================
-- 6. VERIFICAR POLÍTICAS CREADAS
-- =====================================================

-- Puedes ejecutar esta consulta para ver todas las políticas:
-- SELECT * FROM pg_policies WHERE tablename = 'clientes';

-- =====================================================
-- 7. COMENTARIOS PARA DOCUMENTACIÓN
-- =====================================================

COMMENT ON TABLE clientes IS 'Tabla de clientes con RLS habilitado. Solo usuarios autenticados pueden acceder.';

-- =====================================================
-- NOTAS IMPORTANTES:
-- =====================================================
-- 
-- 1. RLS (Row Level Security) protege los datos a nivel de fila
-- 2. Las políticas se aplican automáticamente en todas las consultas
-- 3. Los usuarios autenticados tienen acceso completo (CRUD)
-- 4. Los usuarios anónimos están bloqueados explícitamente
-- 5. Para modificar políticas, primero elimínalas con DROP POLICY
-- 
-- Ejemplo de cómo eliminar una política:
-- DROP POLICY "nombre_de_la_politica" ON clientes;
-- 
-- =====================================================
