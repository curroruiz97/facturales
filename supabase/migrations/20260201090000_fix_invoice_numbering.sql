-- Migración: Corrección de numeración de facturas con concurrencia segura
-- Fecha: 2026-02-01
-- Descripción: Unicidad por usuario, borradores sin número y emisión atómica

-- =====================================================
-- AJUSTES EN LA TABLA invoices
-- =====================================================

-- Eliminar trigger automático de numeración
DROP TRIGGER IF EXISTS set_invoice_number ON public.invoices;
DROP FUNCTION IF EXISTS public.generate_invoice_number;

-- Quitar constraint UNIQUE global si existe
ALTER TABLE public.invoices
  DROP CONSTRAINT IF EXISTS invoices_invoice_number_key;

-- Permitir NULL en invoice_number (para borradores)
ALTER TABLE public.invoices
  ALTER COLUMN invoice_number DROP NOT NULL;

-- Unicidad por usuario (solo cuando hay número)
CREATE UNIQUE INDEX IF NOT EXISTS invoices_user_invoice_number_uq
  ON public.invoices (user_id, invoice_number)
  WHERE invoice_number IS NOT NULL;

-- =====================================================
-- TABLA DE CONTADORES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.invoice_counters (
  user_id uuid NOT NULL,
  series text NOT NULL DEFAULT 'A',
  year int NOT NULL,
  last_number bigint NOT NULL,
  PRIMARY KEY (user_id, series, year)
);

-- =====================================================
-- FUNCIÓN: SIGUIENTE NÚMERO DE FACTURA (ATÓMICO)
-- =====================================================

CREATE OR REPLACE FUNCTION public.next_invoice_number(p_user_id uuid, p_series text, p_year int)
RETURNS bigint
LANGUAGE plpgsql
AS $$
DECLARE
  v_next bigint;
BEGIN
  INSERT INTO public.invoice_counters (user_id, series, year, last_number)
  VALUES (p_user_id, COALESCE(p_series,'A'), p_year, 1)
  ON CONFLICT (user_id, series, year)
  DO UPDATE SET last_number = public.invoice_counters.last_number + 1
  RETURNING last_number INTO v_next;

  RETURN v_next;
END;
$$;

-- =====================================================
-- FUNCIÓN: EMITIR FACTURA (ASIGNA NÚMERO + BLOQUEA)
-- =====================================================

CREATE OR REPLACE FUNCTION public.issue_invoice(p_invoice_id uuid)
RETURNS public.invoices
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice public.invoices;
  v_year int;
  v_next bigint;
BEGIN
  -- Carga y bloquea la factura para evitar doble emisión concurrente
  SELECT *
  INTO v_invoice
  FROM public.invoices
  WHERE id = p_invoice_id
    AND user_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice not found';
  END IF;

  IF v_invoice.status <> 'draft' THEN
    RAISE EXCEPTION 'Only draft invoices can be issued';
  END IF;

  v_year := EXTRACT(YEAR FROM COALESCE(v_invoice.issue_date, now()))::int;
  v_next := public.next_invoice_number(v_invoice.user_id, COALESCE(v_invoice.invoice_series,'A'), v_year);

  UPDATE public.invoices
  SET invoice_number = COALESCE(v_invoice.invoice_series,'A') || '-' || v_year::text || '-' || LPAD(v_next::text, 5, '0'),
      status = 'issued'
  WHERE id = v_invoice.id
  RETURNING * INTO v_invoice;

  RETURN v_invoice;
END;
$$;

-- =====================================================
-- ROW LEVEL SECURITY PARA invoice_counters
-- =====================================================

ALTER TABLE public.invoice_counters ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'invoice_counters'
      AND policyname = 'counters_owner_all'
  ) THEN
    CREATE POLICY "counters_owner_all"
      ON public.invoice_counters
      FOR ALL
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END;
$$;
