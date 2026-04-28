-- Añadir columna `rol` a la tabla clientes para distinguir el tipo de relación
-- (cliente, empleado, proveedor de servicios profesionales, acreedor, otro).
-- Esto permite categorizar mejor los gastos según el contacto y separar nóminas
-- de servicios profesionales.

ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS rol TEXT NOT NULL DEFAULT 'cliente';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'clientes_rol_check'
  ) THEN
    ALTER TABLE clientes
      ADD CONSTRAINT clientes_rol_check
      CHECK (rol IN (
        'cliente',
        'empleado',
        'proveedor_servicios',
        'proveedor_bienes',
        'acreedor',
        'otro'
      ));
  END IF;
END $$;

COMMENT ON COLUMN clientes.rol IS
  'Tipo de relación con el contacto: cliente (factura emitida), empleado (nómina), proveedor_servicios (servicios profesionales), proveedor_bienes (suministros/bienes), acreedor (préstamos/financiación), otro.';
