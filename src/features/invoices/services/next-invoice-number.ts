import { getCurrentUserId, getSupabaseClient } from "../../../services/supabase/client";

/**
 * Calcula el siguiente número correlativo para una serie de facturas del
 * usuario actual. Mira el invoice_number máximo existente con esa serie
 * (no NULL, status != "cancelled" se considera también para no reutilizar
 * huecos por anulaciones — el correlativo debe ser estrictamente creciente
 * por exigencia AEAT, ver migration 20260213000000).
 *
 * Devuelve el siguiente número en formato `${seriesCode}-NNNN` (mismo formato
 * con el que el trigger Postgres `set_invoice_number_on_emit` lo asignaría
 * automáticamente al emitir). Si no hay facturas previas, empieza por
 * `${seriesCode}-0001`.
 */
export async function getNextInvoiceNumberForSeries(seriesCode: string): Promise<string | null> {
  const series = (seriesCode || "").trim().toUpperCase();
  if (!series) return null;

  const userId = await getCurrentUserId();
  if (!userId) return null;

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("invoices")
    .select("invoice_number")
    .eq("user_id", userId)
    .eq("invoice_series", series)
    .not("invoice_number", "is", null)
    .order("invoice_number", { ascending: false })
    .limit(50);

  if (error) return null;

  const maxNumeric = (data ?? []).reduce<number>((acc, row) => {
    const raw = String(row.invoice_number ?? "");
    // Extrae el sufijo numérico del invoice_number (después del último guión o del prefijo de serie).
    // Soporta formatos: "ADG-2636", "ADG2636", "20260033", etc.
    const match = raw.match(/(\d+)(?!.*\d)/);
    if (!match) return acc;
    const value = Number.parseInt(match[1], 10);
    return Number.isFinite(value) && value > acc ? value : acc;
  }, 0);

  const next = maxNumeric + 1;
  // Mantener el ancho del último número (al menos 4 dígitos) para conservar formato visual.
  const lastRaw = String((data ?? [])[0]?.invoice_number ?? "");
  const lastDigits = lastRaw.match(/(\d+)(?!.*\d)/)?.[1] ?? "";
  const width = Math.max(lastDigits.length, 4);
  const padded = String(next).padStart(width, "0");

  return `${series}-${padded}`;
}
