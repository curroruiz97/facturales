-- Migración: Soporte para transacciones automáticas de facturas
-- Fecha: 2026-02-13
-- Descripción: Añade columna invoice_id a transacciones y categoría 'factura'

-- =====================================================
-- 1. AÑADIR COLUMNA invoice_id A transacciones
-- =====================================================

ALTER TABLE transacciones
  ADD COLUMN invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE;

-- Índice para buscar transacciones por factura
CREATE INDEX idx_transacciones_invoice_id ON transacciones(invoice_id);

-- =====================================================
-- 2. AMPLIAR CHECK DE CATEGORÍA PARA INCLUIR 'factura'
-- =====================================================

-- Eliminar constraint anterior
ALTER TABLE transacciones DROP CONSTRAINT IF EXISTS transacciones_categoria_check;

-- Crear nuevo constraint incluyendo 'factura'
ALTER TABLE transacciones ADD CONSTRAINT transacciones_categoria_check
  CHECK (categoria IN (
    'material_oficina',
    'servicios_profesionales',
    'suministros',
    'alquiler',
    'transporte',
    'marketing',
    'otros',
    'factura'
  ));

-- =====================================================
-- 3. COMENTARIOS
-- =====================================================

COMMENT ON COLUMN transacciones.invoice_id IS 'ID de la factura asociada (para transacciones generadas automáticamente al pagar una factura)';
