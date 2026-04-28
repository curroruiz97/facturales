-- Añadir nuevas categorías de transacción para mejor clasificación de gastos:
-- - 'salarios': gastos de nómina (empleados)
-- - 'financieros': intereses, comisiones, gastos bancarios, préstamos

ALTER TABLE transacciones DROP CONSTRAINT IF EXISTS transacciones_categoria_check;

ALTER TABLE transacciones ADD CONSTRAINT transacciones_categoria_check
  CHECK (categoria IN (
    'material_oficina',
    'servicios_profesionales',
    'suministros',
    'alquiler',
    'transporte',
    'marketing',
    'salarios',
    'financieros',
    'otros',
    'factura'
  ));
