import { getCurrentUserId, getSupabaseClient } from "../supabase/client";
import { fail, ok, type ServiceResult } from "../../shared/types/service-result";

export type InvoiceSeriesFormat = "common" | "monthly" | "simple" | "slash" | "compact" | "custom";
export type InvoiceSeriesCounterReset = "never" | "yearly" | "monthly";

export interface InvoiceSeriesInput {
  code: string;
  description: string;
  invoiceNumberFormat?: InvoiceSeriesFormat;
  counterReset?: InvoiceSeriesCounterReset;
  startNumber?: number;
  customFormat?: string | null;
}

export interface InvoiceSeriesRecord {
  id: string;
  userId: string;
  code: string;
  description: string;
  invoiceNumberFormat: InvoiceSeriesFormat;
  counterReset: InvoiceSeriesCounterReset;
  startNumber: number;
  customFormat: string | null;
  currentNumber: number;
  currentNumberPeriod: string;
  createdAt: string;
  totalIssued: number;
  lastInvoiceNumber: string | null;
}

export interface InvoiceSeriesService {
  listMine(): Promise<ServiceResult<InvoiceSeriesRecord[]>>;
  create(input: InvoiceSeriesInput): Promise<ServiceResult<InvoiceSeriesRecord>>;
  update(id: string, input: InvoiceSeriesInput): Promise<ServiceResult<InvoiceSeriesRecord>>;
  remove(id: string): Promise<ServiceResult<null>>;
}

interface SeriesStats {
  totalIssued: number;
  lastInvoiceNumber: string | null;
}

function sanitizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeCode(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "");
}

function normalizeStartNumber(value: number | undefined): number {
  if (value === undefined || Number.isNaN(value)) return 1;
  return Math.max(1, Math.floor(value));
}

function validateInput(input: InvoiceSeriesInput): ServiceResult<null> {
  const code = normalizeCode(input.code);
  if (!code) {
    return fail("El codigo de serie es obligatorio.", "SERIES_CODE_REQUIRED");
  }
  if (code.length > 10) {
    return fail("El codigo de serie no puede superar 10 caracteres.", "SERIES_CODE_TOO_LONG");
  }
  if (!/^[A-Z0-9_-]+$/.test(code)) {
    return fail("El codigo de serie solo admite letras, numeros, guion y guion bajo.", "SERIES_CODE_INVALID");
  }

  const description = sanitizeText(input.description || "");
  if (!description) {
    return fail("La descripcion de la serie es obligatoria.", "SERIES_DESCRIPTION_REQUIRED");
  }
  if (description.length > 120) {
    return fail("La descripcion no puede superar 120 caracteres.", "SERIES_DESCRIPTION_TOO_LONG");
  }

  const startNumber = normalizeStartNumber(input.startNumber);
  if (startNumber > 999999) {
    return fail("El número inicial no puede superar 999999.", "SERIES_START_TOO_LARGE");
  }

  if ((input.invoiceNumberFormat ?? "common") === "custom" && !sanitizeText(input.customFormat ?? "")) {
    return fail("Debes indicar un formato personalizado.", "SERIES_CUSTOM_FORMAT_REQUIRED");
  }

  return ok(null);
}

function mapRowToRecord(
  row: Record<string, unknown>,
  statsByCode: Map<string, SeriesStats>,
): InvoiceSeriesRecord {
  const code = String(row.code ?? "").toUpperCase();
  const stats = statsByCode.get(code) ?? { totalIssued: 0, lastInvoiceNumber: null };

  return {
    id: String(row.id ?? ""),
    userId: String(row.user_id ?? ""),
    code,
    description: String(row.description ?? ""),
    invoiceNumberFormat: (row.invoice_number_format as InvoiceSeriesFormat | undefined) ?? "common",
    counterReset: (row.counter_reset as InvoiceSeriesCounterReset | undefined) ?? "yearly",
    startNumber: Number(row.start_number ?? 1),
    customFormat: (row.custom_format as string | null) ?? null,
    currentNumber: Number(row.current_number ?? 0),
    currentNumberPeriod: String(row.current_number_period ?? ""),
    createdAt: String(row.created_at ?? ""),
    totalIssued: stats.totalIssued,
    lastInvoiceNumber: stats.lastInvoiceNumber,
  };
}

function mapInputToPayload(userId: string, input: InvoiceSeriesInput): Record<string, unknown> {
  return {
    user_id: userId,
    code: normalizeCode(input.code),
    description: sanitizeText(input.description),
    invoice_number_format: input.invoiceNumberFormat ?? "common",
    counter_reset: input.counterReset ?? "yearly",
    start_number: normalizeStartNumber(input.startNumber),
    custom_format: input.customFormat ? sanitizeText(input.customFormat) : null,
  };
}

function buildStatsMap(rows: Array<Record<string, unknown>>): Map<string, SeriesStats> {
  const map = new Map<string, SeriesStats>();
  for (const row of rows) {
    const code = String(row.invoice_series ?? "").toUpperCase();
    if (!code) continue;

    const previous = map.get(code) ?? { totalIssued: 0, lastInvoiceNumber: null };
    const totalIssued = previous.totalIssued + 1;
    const lastInvoiceNumber = previous.lastInvoiceNumber ?? ((row.invoice_number as string | null) ?? null);
    map.set(code, { totalIssued, lastInvoiceNumber });
  }
  return map;
}

class SupabaseInvoiceSeriesService implements InvoiceSeriesService {
  async listMine(): Promise<ServiceResult<InvoiceSeriesRecord[]>> {
    try {
      const userId = await getCurrentUserId();
      if (!userId) return fail("No autenticado.", "AUTH_REQUIRED");

      const supabase = getSupabaseClient();
      const [seriesResult, invoicesResult] = await Promise.all([
        supabase
          .from("invoice_series")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: true }),
        supabase
          .from("invoices")
          .select("invoice_series, invoice_number, created_at")
          .eq("user_id", userId)
          .eq("status", "issued")
          .order("created_at", { ascending: false }),
      ]);

      if (seriesResult.error) {
        return fail(seriesResult.error.message, seriesResult.error.code, seriesResult.error);
      }
      if (invoicesResult.error) {
        return fail(invoicesResult.error.message, invoicesResult.error.code, invoicesResult.error);
      }

      const statsByCode = buildStatsMap((invoicesResult.data as Array<Record<string, unknown>> | null) ?? []);
      const mapped = ((seriesResult.data as Array<Record<string, unknown>> | null) ?? []).map((row) => mapRowToRecord(row, statsByCode));
      return ok(mapped);
    } catch (error) {
      return fail("No se pudieron cargar las series.", "SERIES_LIST_ERROR", error);
    }
  }

  async create(input: InvoiceSeriesInput): Promise<ServiceResult<InvoiceSeriesRecord>> {
    const validation = validateInput(input);
    if (!validation.success) return validation;

    try {
      const userId = await getCurrentUserId();
      if (!userId) return fail("No autenticado.", "AUTH_REQUIRED");

      const payload = mapInputToPayload(userId, input);
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.from("invoice_series").insert(payload).select("*").single();
      if (error) {
        return fail(error.message, error.code, error);
      }

      return ok(mapRowToRecord(data as Record<string, unknown>, new Map()));
    } catch (error) {
      return fail("No se pudo crear la serie.", "SERIES_CREATE_ERROR", error);
    }
  }

  async update(id: string, input: InvoiceSeriesInput): Promise<ServiceResult<InvoiceSeriesRecord>> {
    const validation = validateInput(input);
    if (!validation.success) return validation;

    try {
      const userId = await getCurrentUserId();
      if (!userId) return fail("No autenticado.", "AUTH_REQUIRED");

      const payload = mapInputToPayload(userId, input);
      delete payload.user_id;

      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("invoice_series")
        .update(payload)
        .eq("id", id)
        .eq("user_id", userId)
        .select("*")
        .single();

      if (error) {
        return fail(error.message, error.code, error);
      }

      return ok(mapRowToRecord(data as Record<string, unknown>, new Map()));
    } catch (error) {
      return fail("No se pudo actualizar la serie.", "SERIES_UPDATE_ERROR", error);
    }
  }

  async remove(id: string): Promise<ServiceResult<null>> {
    try {
      const userId = await getCurrentUserId();
      if (!userId) return fail("No autenticado.", "AUTH_REQUIRED");

      const supabase = getSupabaseClient();
      const { error } = await supabase.from("invoice_series").delete().eq("id", id).eq("user_id", userId);
      if (error) {
        return fail(error.message, error.code, error);
      }
      return ok(null);
    } catch (error) {
      return fail("No se pudo eliminar la serie.", "SERIES_DELETE_ERROR", error);
    }
  }
}

export const invoiceSeriesService: InvoiceSeriesService = new SupabaseInvoiceSeriesService();

