-- Migración: Añadir invoice_image_url y default_payment_method a business_info
-- Fecha: 2026-02-12
-- Descripción: 
--   invoice_image_url: Logo de factura almacenado como base64 (similar a profile_image_url)
--   default_payment_method: Método(s) de pago predeterminados en formato JSONB

ALTER TABLE business_info
ADD COLUMN invoice_image_url TEXT;

ALTER TABLE business_info
ADD COLUMN default_payment_method JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN business_info.invoice_image_url IS 'Logo de factura almacenado como base64 (PNG, JPG o WebP, máx 500KB)';
COMMENT ON COLUMN business_info.default_payment_method IS 'Métodos de pago predeterminados en formato JSONB. Ej: [{"type":"transferencia","iban":"ES00..."},{"type":"bizum","phone":"600..."}]';
