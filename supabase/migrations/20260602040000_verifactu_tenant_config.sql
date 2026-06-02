-- Migración: configuración Verifactu por tenant (Fase 1)
-- Fecha: 2026-06-02
--
-- Modelo Colaboración Social Tipo 017: facturales remite los registros con SU PROPIO sello
-- (certificado de plataforma, NUNCA por cliente). Por tanto en business_info NO se guarda ningún
-- certificado: solo si el usuario ha activado Verifactu y la evidencia de su autorización para
-- que facturales remita en su nombre.
--
-- Columnas aditivas y nullable (salvo el flag con default) → migración segura, sin tocar RLS
-- (las políticas existentes de business_info ya cubren estas columnas: cada usuario gestiona la suya).

ALTER TABLE business_info
  ADD COLUMN IF NOT EXISTS verifactu_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS verifactu_autorizado_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verifactu_autorizacion_ref TEXT;

COMMENT ON COLUMN business_info.verifactu_enabled IS
  'El usuario ha activado el envío VERI*FACTU de sus facturas a la AEAT.';
COMMENT ON COLUMN business_info.verifactu_autorizado_at IS
  'Momento en que el usuario autorizó a facturales (colaboración social Tipo 017) a remitir sus registros a la AEAT en su nombre.';
COMMENT ON COLUMN business_info.verifactu_autorizacion_ref IS
  'Referencia/evidencia de la autorización Tipo 017 (p. ej. identificador del documento de autorización firmado).';
