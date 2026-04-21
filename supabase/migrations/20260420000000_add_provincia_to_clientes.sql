-- Migración: Añadir provincia a clientes
-- Fecha: 2026-04-20
-- Descripción: Añade la columna opcional provincia a la tabla clientes. El
--              frontend ya la utiliza (formulario, tipos, repositorio e
--              importador CSV) pero la columna no existía en el esquema, lo
--              que provocaba el error "Could not find the 'provincia' column
--              of 'clientes' in the schema cache" al crear contactos.

ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS provincia TEXT;

COMMENT ON COLUMN clientes.provincia IS 'Provincia del domicilio del cliente (opcional)';
