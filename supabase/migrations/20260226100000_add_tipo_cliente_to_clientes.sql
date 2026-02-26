-- Migración: Añadir tipo de cliente a clientes
-- Fecha: 2026-02-26
-- Descripción: Añade columna obligatoria tipo_cliente (autonomo/sociedad) a la tabla clientes

ALTER TABLE clientes
  ADD COLUMN tipo_cliente TEXT NOT NULL DEFAULT 'autonomo'
    CHECK (tipo_cliente IN ('autonomo', 'sociedad'));

COMMENT ON COLUMN clientes.tipo_cliente IS 'Tipo de cliente: autonomo o sociedad';
