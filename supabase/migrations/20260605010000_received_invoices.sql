-- Migración: facturas recibidas (recepción, KD §1.5)
-- Fecha: 2026-06-05
-- Buzón de facturas recibidas de proveedores con carga manual (XML Facturae / PDF).
-- La recepción AUTOMÁTICA por email es una fase posterior (source='email').

CREATE TABLE IF NOT EXISTS public.received_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  supplier_name TEXT NOT NULL DEFAULT '',
  supplier_nif TEXT NOT NULL DEFAULT '',
  buyer_nif TEXT NOT NULL DEFAULT '',
  invoice_number TEXT NOT NULL DEFAULT '',
  issue_date TEXT,                       -- texto: las fuentes externas usan formatos diversos
  total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  source TEXT NOT NULL DEFAULT 'upload' CHECK (source IN ('upload', 'email')),
  file_format TEXT CHECK (file_format IN ('xml', 'pdf')),
  file_path TEXT,                        -- ruta en el bucket 'received-invoices'
  raw_xml TEXT,                          -- XML Facturae original (cuando aplica)
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_received_invoices_user ON public.received_invoices (user_id, created_at DESC);

-- =====================================================
-- RLS: cada usuario solo ve y gestiona sus facturas recibidas
-- =====================================================
ALTER TABLE public.received_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuario gestiona sus facturas recibidas (select)"
  ON public.received_invoices FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Usuario gestiona sus facturas recibidas (insert)"
  ON public.received_invoices FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Usuario gestiona sus facturas recibidas (update)"
  ON public.received_invoices FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Usuario gestiona sus facturas recibidas (delete)"
  ON public.received_invoices FOR DELETE USING (user_id = auth.uid());

REVOKE ALL ON public.received_invoices FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.received_invoices TO authenticated;

COMMENT ON TABLE public.received_invoices IS
  'Facturas recibidas de proveedores (KD §1.5). Carga manual XML Facturae/PDF; recepción por email en fase posterior. RLS por usuario.';

-- =====================================================
-- Storage: bucket privado para los ficheros recibidos, aislado por carpeta de usuario
-- =====================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('received-invoices', 'received-invoices', false)
ON CONFLICT (id) DO NOTHING;

-- Las rutas son '<user_id>/<timestamp>_<archivo>'. (storage.foldername(name))[1] = user_id.
CREATE POLICY "received-invoices: subir a la carpeta propia"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'received-invoices' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "received-invoices: leer la carpeta propia"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'received-invoices' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "received-invoices: borrar de la carpeta propia"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'received-invoices' AND (storage.foldername(name))[1] = auth.uid()::text);
