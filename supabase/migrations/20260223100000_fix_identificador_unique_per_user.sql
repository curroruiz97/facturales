-- Migración: Cambiar constraint UNIQUE de identificador a UNIQUE por usuario
-- Fecha: 2026-02-23
-- Descripción: El UNIQUE global sobre identificador impide que dos usuarios
-- distintos registren un cliente con el mismo CIF/NIF. Se reemplaza por un
-- UNIQUE compuesto (user_id, identificador) para que cada usuario tenga su
-- propio espacio de clientes independiente.

-- 1. Eliminar la constraint UNIQUE global
ALTER TABLE clientes DROP CONSTRAINT IF EXISTS clientes_identificador_key;

-- 2. Eliminar el índice simple sobre identificador (se reemplaza por el compuesto)
DROP INDEX IF EXISTS idx_clientes_identificador;

-- 3. Crear índice UNIQUE compuesto (user_id, identificador)
CREATE UNIQUE INDEX idx_clientes_user_identificador ON clientes(user_id, identificador);

-- 4. Comentario actualizado
COMMENT ON COLUMN clientes.identificador IS 'CIF/NIF/ID del cliente, único por usuario';
