-- Migración: permitir estado scheduled y registrar fecha programada
-- Fecha: 2026-03-12

ALTER TABLE document_email_log
  DROP CONSTRAINT IF EXISTS document_email_log_status_check;

ALTER TABLE document_email_log
  ADD CONSTRAINT document_email_log_status_check
  CHECK (status IN ('queued', 'scheduled', 'sent', 'failed'));

ALTER TABLE document_email_log
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;

COMMENT ON COLUMN document_email_log.status IS 'Estado: queued, scheduled, sent, failed';
COMMENT ON COLUMN document_email_log.scheduled_at IS 'Fecha/hora programada para envío (si aplica)';
