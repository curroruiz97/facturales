-- Migración: Crear tabla document_email_log + bucket Storage para PDFs
-- Fecha: 2026-02-13
-- Descripción: Trazabilidad de envíos de email de facturas/presupuestos

-- =====================================================
-- 1. CREAR TABLA document_email_log
-- =====================================================

CREATE TABLE document_email_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('invoice', 'quote')),
  document_id UUID NOT NULL,
  to_email TEXT NOT NULL,
  subject TEXT,
  provider TEXT NOT NULL DEFAULT 'resend',
  provider_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed')),
  error_message TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 1,
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

-- =====================================================
-- 2. ÍNDICES
-- =====================================================

CREATE INDEX idx_email_log_user_id ON document_email_log(user_id);
CREATE INDEX idx_email_log_document ON document_email_log(document_type, document_id);
CREATE INDEX idx_email_log_idempotency ON document_email_log(idempotency_key);
CREATE INDEX idx_email_log_status ON document_email_log(status);

-- =====================================================
-- 3. TRIGGER PARA updated_at (reutilizar función existente)
-- =====================================================

-- No se añade updated_at: los logs son append-only, solo se actualiza status/sent_at

-- =====================================================
-- 4. HABILITAR ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE document_email_log ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 5. POLÍTICAS DE RLS
-- =====================================================

-- SELECT: usuarios solo ven sus propios registros
CREATE POLICY "Usuarios ven sus propios email logs"
ON document_email_log FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- INSERT: usuarios solo pueden crear registros para sí mismos
CREATE POLICY "Usuarios crean sus propios email logs"
ON document_email_log FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- UPDATE: usuarios solo pueden actualizar sus propios registros
CREATE POLICY "Usuarios actualizan sus propios email logs"
ON document_email_log FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- No se permite DELETE: los logs son inmutables

-- =====================================================
-- 6. BUCKET DE STORAGE PARA PDFs
-- =====================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('document-pdfs', 'document-pdfs', false, 10485760)
ON CONFLICT (id) DO NOTHING;

-- Política: usuarios pueden subir PDFs en su carpeta (user_id como primer segmento de la ruta)
CREATE POLICY "Usuarios suben PDFs en su carpeta"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'document-pdfs'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Política: usuarios pueden leer sus propios PDFs
CREATE POLICY "Usuarios leen sus propios PDFs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'document-pdfs'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- =====================================================
-- 7. COMENTARIOS
-- =====================================================

COMMENT ON TABLE document_email_log IS 'Registro de envíos de email de facturas y presupuestos';
COMMENT ON COLUMN document_email_log.user_id IS 'Usuario propietario del documento';
COMMENT ON COLUMN document_email_log.document_type IS 'Tipo: invoice o quote';
COMMENT ON COLUMN document_email_log.document_id IS 'ID del documento (factura o presupuesto)';
COMMENT ON COLUMN document_email_log.to_email IS 'Email del destinatario';
COMMENT ON COLUMN document_email_log.subject IS 'Asunto del email enviado';
COMMENT ON COLUMN document_email_log.provider IS 'Proveedor de mailing (default: resend)';
COMMENT ON COLUMN document_email_log.provider_message_id IS 'ID del mensaje en el proveedor';
COMMENT ON COLUMN document_email_log.status IS 'Estado: queued, sent, failed';
COMMENT ON COLUMN document_email_log.error_message IS 'Mensaje de error si falló';
COMMENT ON COLUMN document_email_log.attempt_count IS 'Número de intento de envío';
COMMENT ON COLUMN document_email_log.idempotency_key IS 'Clave SHA-256 para evitar envíos duplicados';
COMMENT ON COLUMN document_email_log.sent_at IS 'Fecha/hora de confirmación de envío exitoso';
