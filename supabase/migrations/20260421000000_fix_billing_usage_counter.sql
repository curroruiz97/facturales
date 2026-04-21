-- Migración: Recalcular billing_usage.invoices_used a partir de facturas realmente emitidas
-- Fecha: 2026-04-21
-- Contexto: hasta ahora el contador se incrementaba al crear borradores y al guardar
--            presupuestos, por lo que un usuario podía agotar la cuota sin haber emitido
--            ninguna factura real. A partir de esta fecha solo se incrementa al emitir una
--            factura (status = 'issued'). Esta migración recalcula el contador del periodo
--            en curso para cada usuario igualándolo al COUNT real de facturas emitidas en
--            ese periodo.

UPDATE public.billing_usage bu
SET invoices_used = COALESCE(actual.count, 0),
    updated_at = NOW()
FROM (
  SELECT
    i.user_id,
    bu_inner.period_start,
    COUNT(*)::int AS count
  FROM public.billing_usage bu_inner
  JOIN public.invoices i
    ON i.user_id = bu_inner.user_id
   AND i.status = 'issued'
   AND i.created_at >= bu_inner.period_start::timestamptz
  GROUP BY i.user_id, bu_inner.period_start
) AS actual
WHERE bu.user_id = actual.user_id
  AND bu.period_start = actual.period_start;

-- Pone a 0 los registros que no tengan ninguna factura emitida en su periodo
UPDATE public.billing_usage bu
SET invoices_used = 0,
    updated_at = NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.invoices i
  WHERE i.user_id = bu.user_id
    AND i.status = 'issued'
    AND i.created_at >= bu.period_start::timestamptz
)
AND bu.invoices_used <> 0;
