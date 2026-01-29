-- Migración: Crear tabla clientes
-- Fecha: 2026-01-29
-- Descripción: Tabla para almacenar información de clientes/contactos

CREATE TABLE clientes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre_razon_social TEXT NOT NULL,
  identificador TEXT NOT NULL UNIQUE,
  email TEXT,
  telefono TEXT,
  direccion TEXT,
  codigo_postal TEXT,
  ciudad TEXT,
  pais TEXT,
  dia_facturacion INTEGER CHECK (dia_facturacion >= 1 AND dia_facturacion <= 31),
  estado TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para optimizar búsquedas
CREATE INDEX idx_clientes_nombre ON clientes(nombre_razon_social);
CREATE INDEX idx_clientes_identificador ON clientes(identificador);
CREATE INDEX idx_clientes_estado ON clientes(estado);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at en cada actualización
CREATE TRIGGER update_clientes_updated_at
  BEFORE UPDATE ON clientes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comentarios para documentación
COMMENT ON TABLE clientes IS 'Tabla de clientes/contactos del sistema de facturación';
COMMENT ON COLUMN clientes.nombre_razon_social IS 'Nombre completo o razón social del cliente';
COMMENT ON COLUMN clientes.identificador IS 'CIF/NIF/ID único del cliente';
COMMENT ON COLUMN clientes.dia_facturacion IS 'Día del mes preferido para facturación (1-31)';
COMMENT ON COLUMN clientes.estado IS 'Estado del cliente: activo o inactivo';
