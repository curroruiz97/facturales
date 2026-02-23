-- Migración: Crear tabla productos
-- Fecha: 2026-02-17
-- Descripción: Tabla para almacenar productos/servicios del catálogo del usuario

-- =====================================================
-- CREAR TABLA productos
-- =====================================================

CREATE TABLE productos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nombre TEXT NOT NULL,
  referencia TEXT,
  descripcion TEXT,
  precio_compra DECIMAL(10,2) NOT NULL DEFAULT 0,
  precio_venta DECIMAL(10,2) NOT NULL DEFAULT 0,
  impuesto TEXT NOT NULL DEFAULT 'IVA_21',
  descuento DECIMAL(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES
-- =====================================================

CREATE INDEX idx_productos_user_id ON productos(user_id);
CREATE INDEX idx_productos_nombre ON productos(nombre);
CREATE UNIQUE INDEX idx_productos_user_referencia ON productos(user_id, referencia) WHERE referencia IS NOT NULL AND referencia <> '';

-- =====================================================
-- TRIGGER PARA updated_at
-- =====================================================

CREATE TRIGGER update_productos_updated_at
  BEFORE UPDATE ON productos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE productos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own products"
  ON productos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own products"
  ON productos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own products"
  ON productos FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own products"
  ON productos FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- COMENTARIOS
-- =====================================================

COMMENT ON TABLE productos IS 'Catálogo de productos/servicios por usuario';
COMMENT ON COLUMN productos.user_id IS 'ID del usuario propietario';
COMMENT ON COLUMN productos.nombre IS 'Nombre del producto o servicio';
COMMENT ON COLUMN productos.referencia IS 'Código de referencia (único por usuario)';
COMMENT ON COLUMN productos.descripcion IS 'Descripción adicional';
COMMENT ON COLUMN productos.precio_compra IS 'Precio de compra sin impuestos';
COMMENT ON COLUMN productos.precio_venta IS 'Precio de venta sin impuestos';
COMMENT ON COLUMN productos.impuesto IS 'Código de impuesto (IVA_21, IVA_10, IGIC_7, EXENTO, etc.)';
COMMENT ON COLUMN productos.descuento IS 'Descuento en porcentaje (0-100)';
