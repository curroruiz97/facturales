-- Tabla de logs para OCR de gastos (rate limit + observabilidad)
CREATE TABLE IF NOT EXISTS expense_ocr_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'low_confidence')),
  confidence NUMERIC(4,3),
  vendor TEXT,
  invoice_number TEXT,
  invoice_date DATE,
  total NUMERIC(12,2),
  currency TEXT DEFAULT 'EUR',
  error TEXT
);

CREATE INDEX idx_ocr_log_user_id ON expense_ocr_log(user_id);
CREATE INDEX idx_ocr_log_created_at ON expense_ocr_log(created_at DESC);
CREATE INDEX idx_ocr_log_user_created ON expense_ocr_log(user_id, created_at DESC);

ALTER TABLE expense_ocr_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own OCR logs"
  ON expense_ocr_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own OCR logs"
  ON expense_ocr_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Bucket privado temporal para OCR (subida solo por owner, sin lectura directa)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'expense-ocr-temp',
  'expense-ocr-temp',
  false,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload to own OCR folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'expense-ocr-temp'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
