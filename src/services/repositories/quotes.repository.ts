import { getCurrentUserId, getSupabaseClient } from "../supabase/client";
import type { Quote, QuoteDraftPayload } from "../../shared/types/domain";
import { fail, ok, type ServiceResult } from "../../shared/types/service-result";

export interface CreateQuoteInput {
  quoteNumber?: string | null;
  quoteSeries?: string;
  clientId?: string | null;
  clientName: string;
  issueDate: string;
  dueDate?: string | null;
  subtotal?: number;
  taxAmount?: number;
  totalAmount?: number;
  currency?: string;
  status?: "draft" | "issued" | "cancelled";
  quoteData: QuoteDraftPayload | Record<string, unknown>;
}

export type UpdateQuoteInput = Partial<CreateQuoteInput> & {
  isPaid?: boolean;
  paidAt?: string | null;
};

export interface QuoteFilters {
  status?: "draft" | "issued" | "cancelled";
  clientId?: string;
  fromDate?: string;
  toDate?: string;
}

export interface QuotesRepository {
  create(input: CreateQuoteInput): Promise<ServiceResult<Quote>>;
  list(filters?: QuoteFilters): Promise<ServiceResult<Quote[]>>;
  getById(quoteId: string): Promise<ServiceResult<Quote | null>>;
  update(quoteId: string, input: UpdateQuoteInput): Promise<ServiceResult<Quote>>;
  remove(quoteId: string): Promise<ServiceResult<Quote>>;
  emit(quoteId: string): Promise<ServiceResult<Quote>>;
  togglePaid(quoteId: string, isPaid: boolean): Promise<ServiceResult<Quote>>;
}

interface QuoteRow {
  id: string;
  user_id: string;
  quote_number: string | null;
  quote_series: string;
  client_id: string | null;
  client_name: string;
  issue_date: string;
  due_date: string | null;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  status: "draft" | "issued" | "cancelled";
  is_paid: boolean;
  paid_at: string | null;
  quote_data: QuoteDraftPayload;
  created_at: string;
  updated_at: string;
}

function mapQuoteRow(row: QuoteRow): Quote {
  return {
    id: row.id,
    userId: row.user_id,
    quoteNumber: row.quote_number,
    quoteSeries: row.quote_series,
    clientId: row.client_id,
    clientName: row.client_name,
    issueDate: row.issue_date,
    dueDate: row.due_date,
    subtotal: Number(row.subtotal),
    taxAmount: Number(row.tax_amount),
    totalAmount: Number(row.total_amount),
    currency: row.currency,
    status: row.status,
    isPaid: Boolean(row.is_paid),
    paidAt: row.paid_at,
    quoteData: row.quote_data,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeCreateInput(input: CreateQuoteInput, userId: string): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    user_id: userId,
    quote_series: input.quoteSeries ?? "P",
    client_id: input.clientId ?? null,
    client_name: input.clientName.trim(),
    issue_date: input.issueDate,
    due_date: input.dueDate ?? null,
    subtotal: Number(input.subtotal ?? 0),
    tax_amount: Number(input.taxAmount ?? 0),
    total_amount: Number(input.totalAmount ?? 0),
    currency: input.currency ?? "EUR",
    status: input.status ?? "draft",
    is_paid: false,
    quote_data: input.quoteData,
  };

  if (input.quoteNumber && input.quoteNumber.trim()) {
    payload.quote_number = input.quoteNumber.trim();
  }

  return payload;
}

function normalizeUpdateInput(input: UpdateQuoteInput): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (input.quoteNumber !== undefined) payload.quote_number = input.quoteNumber?.trim() || null;
  if (input.quoteSeries !== undefined) payload.quote_series = input.quoteSeries.trim();
  if (input.clientId !== undefined) payload.client_id = input.clientId ?? null;
  if (input.clientName !== undefined) payload.client_name = input.clientName.trim();
  if (input.issueDate !== undefined) payload.issue_date = input.issueDate;
  if (input.dueDate !== undefined) payload.due_date = input.dueDate ?? null;
  if (input.subtotal !== undefined) payload.subtotal = Number(input.subtotal);
  if (input.taxAmount !== undefined) payload.tax_amount = Number(input.taxAmount);
  if (input.totalAmount !== undefined) payload.total_amount = Number(input.totalAmount);
  if (input.currency !== undefined) payload.currency = input.currency;
  if (input.status !== undefined) payload.status = input.status;
  if (input.isPaid !== undefined) payload.is_paid = input.isPaid;
  if (input.paidAt !== undefined) payload.paid_at = input.paidAt ?? null;
  if (input.quoteData !== undefined) payload.quote_data = input.quoteData;

  return payload;
}

export class SupabaseQuotesRepository implements QuotesRepository {
  async create(input: CreateQuoteInput): Promise<ServiceResult<Quote>> {
    try {
      if (!input.clientName?.trim()) return fail("El nombre del cliente es obligatorio", "VALIDATION_QUOTE_CLIENT_NAME_REQUIRED");
      if (!input.issueDate) return fail("La fecha de emision es obligatoria", "VALIDATION_QUOTE_ISSUE_DATE_REQUIRED");

      const userId = await getCurrentUserId();
      if (!userId) return fail("Usuario no autenticado", "AUTH_REQUIRED");

      const supabase = getSupabaseClient();
      const payload = normalizeCreateInput(input, userId);
      const { data, error } = await supabase.from("quotes").insert([payload]).select("*").single();
      if (error || !data) return fail(error?.message ?? "No se pudo crear presupuesto", error?.code, error);
      return ok(mapQuoteRow(data as QuoteRow));
    } catch (error) {
      return fail("No se pudo crear presupuesto", "QUOTES_CREATE_ERROR", error);
    }
  }

  async list(filters: QuoteFilters = {}): Promise<ServiceResult<Quote[]>> {
    try {
      const userId = await getCurrentUserId();
      if (!userId) return ok([]);

      const supabase = getSupabaseClient();
      let query = supabase
        .from("quotes")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (filters.status) query = query.eq("status", filters.status);
      if (filters.clientId) query = query.eq("client_id", filters.clientId);
      if (filters.fromDate) query = query.gte("issue_date", filters.fromDate);
      if (filters.toDate) query = query.lte("issue_date", filters.toDate);

      const { data, error } = await query;
      if (error) return fail(error.message, error.code, error);
      return ok((data ?? []).map((row) => mapQuoteRow(row as QuoteRow)));
    } catch (error) {
      return fail("No se pudo listar presupuestos", "QUOTES_LIST_ERROR", error);
    }
  }

  async getById(quoteId: string): Promise<ServiceResult<Quote | null>> {
    try {
      if (!quoteId) return fail("ID de presupuesto obligatorio", "VALIDATION_QUOTE_ID_REQUIRED");

      const userId = await getCurrentUserId();
      if (!userId) return ok(null);

      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("quotes")
        .select("*")
        .eq("user_id", userId)
        .eq("id", quoteId)
        .maybeSingle();

      if (error) return fail(error.message, error.code, error);
      return ok(data ? mapQuoteRow(data as QuoteRow) : null);
    } catch (error) {
      return fail("No se pudo obtener presupuesto", "QUOTES_GET_BY_ID_ERROR", error);
    }
  }

  async update(quoteId: string, input: UpdateQuoteInput): Promise<ServiceResult<Quote>> {
    try {
      if (!quoteId) return fail("ID de presupuesto obligatorio", "VALIDATION_QUOTE_ID_REQUIRED");
      const userId = await getCurrentUserId();
      if (!userId) return fail("Usuario no autenticado", "AUTH_REQUIRED");

      const payload = normalizeUpdateInput(input);
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("quotes")
        .update(payload)
        .eq("id", quoteId)
        .eq("user_id", userId)
        .select("*")
        .single();

      if (error || !data) return fail(error?.message ?? "No se pudo actualizar presupuesto", error?.code, error);
      return ok(mapQuoteRow(data as QuoteRow));
    } catch (error) {
      return fail("No se pudo actualizar presupuesto", "QUOTES_UPDATE_ERROR", error);
    }
  }

  async remove(quoteId: string): Promise<ServiceResult<Quote>> {
    try {
      if (!quoteId) return fail("ID de presupuesto obligatorio", "VALIDATION_QUOTE_ID_REQUIRED");
      const userId = await getCurrentUserId();
      if (!userId) return fail("Usuario no autenticado", "AUTH_REQUIRED");

      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("quotes")
        .update({
          status: "cancelled",
          is_paid: false,
          paid_at: null,
        })
        .eq("id", quoteId)
        .eq("user_id", userId)
        .select("*")
        .single();

      if (error || !data) return fail(error?.message ?? "No se pudo anular presupuesto", error?.code, error);
      return ok(mapQuoteRow(data as QuoteRow));
    } catch (error) {
      return fail("No se pudo anular presupuesto", "QUOTES_REMOVE_ERROR", error);
    }
  }

  async emit(quoteId: string): Promise<ServiceResult<Quote>> {
    try {
      if (!quoteId) return fail("ID de presupuesto obligatorio", "VALIDATION_QUOTE_ID_REQUIRED");
      const userId = await getCurrentUserId();
      if (!userId) return fail("Usuario no autenticado", "AUTH_REQUIRED");
      const current = await this.getById(quoteId);
      if (!current.success) return fail(current.error.message, current.error.code, current.error.cause);
      if (!current.data) return fail("No se encontro el presupuesto", "QUOTE_NOT_FOUND");
      if (current.data.status === "issued") return ok(current.data);
      if (current.data.status === "cancelled") {
        return fail("No se pueden emitir presupuestos anulados.", "QUOTES_EMIT_INVALID_STATUS");
      }

      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("quotes")
        .update({ status: "issued" })
        .eq("id", quoteId)
        .eq("user_id", userId)
        .select("*")
        .single();

      if (error || !data) return fail(error?.message ?? "No se pudo emitir presupuesto", error?.code, error);
      return ok(mapQuoteRow(data as QuoteRow));
    } catch (error) {
      return fail("No se pudo emitir presupuesto", "QUOTES_EMIT_ERROR", error);
    }
  }

  async togglePaid(quoteId: string, isPaid: boolean): Promise<ServiceResult<Quote>> {
    try {
      if (!quoteId) return fail("ID de presupuesto obligatorio", "VALIDATION_QUOTE_ID_REQUIRED");
      const userId = await getCurrentUserId();
      if (!userId) return fail("Usuario no autenticado", "AUTH_REQUIRED");
      const current = await this.getById(quoteId);
      if (!current.success) return fail(current.error.message, current.error.code, current.error.cause);
      if (!current.data) return fail("No se encontro el presupuesto", "QUOTE_NOT_FOUND");
      if (current.data.status === "cancelled") {
        return fail("No se puede cambiar el cobro de un presupuesto anulado.", "QUOTES_TOGGLE_PAID_CANCELLED");
      }
      if (current.data.isPaid === isPaid) {
        return ok(current.data);
      }

      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("quotes")
        .update({
          is_paid: isPaid,
          paid_at: isPaid ? new Date().toISOString() : null,
        })
        .eq("id", quoteId)
        .eq("user_id", userId)
        .select("*")
        .single();

      if (error || !data) return fail(error?.message ?? "No se pudo cambiar estado de cobro", error?.code, error);
      return ok(mapQuoteRow(data as QuoteRow));
    } catch (error) {
      return fail("No se pudo cambiar estado de cobro", "QUOTES_TOGGLE_PAID_ERROR", error);
    }
  }
}

export const quotesRepository = new SupabaseQuotesRepository();
