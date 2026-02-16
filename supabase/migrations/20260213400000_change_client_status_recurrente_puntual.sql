-- Migración: Cambiar estado de clientes de activo/inactivo a recurrente/puntual
-- Fecha: 2026-02-13

-- 1. Actualizar registros existentes
UPDATE clientes SET estado = 'recurrente' WHERE estado = 'activo';
UPDATE clientes SET estado = 'puntual' WHERE estado = 'inactivo';

-- 2. Eliminar constraint anterior
ALTER TABLE clientes DROP CONSTRAINT IF EXISTS clientes_estado_check;

-- 3. Cambiar default
ALTER TABLE clientes ALTER COLUMN estado SET DEFAULT 'recurrente';

-- 4. Crear nuevo constraint
ALTER TABLE clientes ADD CONSTRAINT clientes_estado_check 
  CHECK (estado IN ('recurrente', 'puntual'));
