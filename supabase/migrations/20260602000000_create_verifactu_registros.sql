-- Migración: tabla append-only de registros de facturación VERI*FACTU
-- Fecha: 2026-06-02
-- Implementa el registro de alta/anulación con HUELLA ENCADENADA (RD 1007/2023, Orden HAC/1177/2024).
--
-- Principios:
--  - La huella se calcula y los registros se INSERTAN SOLO desde el servidor (Edge Function con
--    service_role). El cliente NUNCA escribe aquí (una huella forjable no tendría valor legal).
--  - APPEND-ONLY e INALTERABLE: los campos fiscales y la huella no se pueden modificar ni borrar.
--    Lo ÚNICO actualizable es el estado de remisión a la AEAT (estado_envio, aeat_csv, aeat_respuesta).
--  - La cadena es POR USUARIO (obligado tributario). Arranca limpia desde el primer registro;
--    las facturas anteriores a VERI*FACTU no se encadenan retroactivamente.

CREATE TABLE verifactu_registros (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- RESTRICT: no se puede borrar un usuario/factura que tenga registros fiscales (retención legal).
  user_id UUID REFERENCES auth.users(id) ON DELETE RESTRICT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('alta', 'anulacion')),
  invoice_id UUID REFERENCES invoices(id) ON DELETE RESTRICT NOT NULL,

  -- Snapshot EXACTO de los campos que entran en la huella (tal como se hashean)
  id_emisor TEXT NOT NULL,            -- NIF emisor (IDEmisorFactura)
  num_serie_factura TEXT NOT NULL,    -- número+serie (NumSerieFactura)
  fecha_expedicion TEXT NOT NULL,     -- DD-MM-AAAA (FechaExpedicionFactura)
  tipo_factura TEXT,                  -- F1/F2/R1..; NULL en anulación
  cuota_total TEXT,                   -- string exacto hasheado; NULL en anulación
  importe_total TEXT,                 -- string exacto hasheado; NULL en anulación

  -- Encadenamiento
  num_orden BIGINT NOT NULL,                       -- posición en la cadena del usuario (1,2,3,...)
  es_primer_registro BOOLEAN NOT NULL DEFAULT FALSE,
  huella_anterior TEXT NOT NULL DEFAULT '',        -- huella del registro anterior ('' si es el primero)
  huella TEXT NOT NULL,                            -- SHA-256 hex MAYÚSCULAS (64) de ESTE registro
  fecha_hora_huso_gen TIMESTAMPTZ NOT NULL,        -- FechaHoraHusoGenRegistro
  cadena_canonica TEXT NOT NULL,                   -- la cadena exacta hasheada (auditoría/depuración)

  qr_url TEXT NOT NULL,                            -- URL de cotejo codificada en el QR

  -- Estado de remisión a la AEAT (lo único mutable tras la inserción)
  estado_envio TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (estado_envio IN ('pendiente', 'enviado', 'aceptado', 'aceptado_con_errores', 'rechazado')),
  aeat_csv TEXT,                                   -- CSV devuelto por la AEAT al aceptar
  aeat_respuesta JSONB,                            -- respuesta completa de la AEAT
  enviado_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT verifactu_huella_format CHECK (huella ~ '^[0-9A-F]{64}$'),
  CONSTRAINT verifactu_orden_por_usuario UNIQUE (user_id, num_orden),
  CONSTRAINT verifactu_huella_por_usuario UNIQUE (user_id, huella)
);

CREATE INDEX idx_verifactu_user ON verifactu_registros (user_id, num_orden);
CREATE INDEX idx_verifactu_invoice ON verifactu_registros (invoice_id);
CREATE INDEX idx_verifactu_estado ON verifactu_registros (estado_envio);

-- =====================================================
-- INMUTABILIDAD: prohibir DELETE y bloquear cambios en campos fiscales
-- =====================================================
CREATE OR REPLACE FUNCTION verifactu_block_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Los registros VERI*FACTU son inalterables: no se pueden eliminar.';
  END IF;

  -- UPDATE: solo se permiten cambios en el estado de remisión a la AEAT.
  IF NEW.tipo IS DISTINCT FROM OLD.tipo
     OR NEW.invoice_id IS DISTINCT FROM OLD.invoice_id
     OR NEW.id_emisor IS DISTINCT FROM OLD.id_emisor
     OR NEW.num_serie_factura IS DISTINCT FROM OLD.num_serie_factura
     OR NEW.fecha_expedicion IS DISTINCT FROM OLD.fecha_expedicion
     OR NEW.tipo_factura IS DISTINCT FROM OLD.tipo_factura
     OR NEW.cuota_total IS DISTINCT FROM OLD.cuota_total
     OR NEW.importe_total IS DISTINCT FROM OLD.importe_total
     OR NEW.num_orden IS DISTINCT FROM OLD.num_orden
     OR NEW.es_primer_registro IS DISTINCT FROM OLD.es_primer_registro
     OR NEW.huella_anterior IS DISTINCT FROM OLD.huella_anterior
     OR NEW.huella IS DISTINCT FROM OLD.huella
     OR NEW.fecha_hora_huso_gen IS DISTINCT FROM OLD.fecha_hora_huso_gen
     OR NEW.cadena_canonica IS DISTINCT FROM OLD.cadena_canonica
     OR NEW.qr_url IS DISTINCT FROM OLD.qr_url
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Los campos fiscales de un registro VERI*FACTU son inalterables. Solo puede cambiar el estado de envío a la AEAT.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER verifactu_immutable
  BEFORE UPDATE OR DELETE ON verifactu_registros
  FOR EACH ROW EXECUTE FUNCTION verifactu_block_mutation();

-- =====================================================
-- RLS: el usuario solo LEE sus registros; las escrituras van por service_role (Edge Function)
-- =====================================================
ALTER TABLE verifactu_registros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios ven sus registros verifactu"
  ON verifactu_registros FOR SELECT
  USING (auth.uid() = user_id);
-- Intencionadamente SIN políticas INSERT/UPDATE/DELETE para 'authenticated':
-- solo service_role (la Edge Function de emisión) puede escribir.

COMMENT ON TABLE verifactu_registros IS
  'Registros de facturación VERI*FACTU (alta/anulación) con huella SHA-256 encadenada. Append-only e inalterable; escritura exclusiva vía Edge Function (service_role). Cadena por usuario/obligado tributario.';
