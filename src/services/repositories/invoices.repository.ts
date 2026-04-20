import { getCurrentUserId, getSupabaseClient } from "../supabase/client";
import type { Invoice, InvoiceDraftPayload } from "../../shared/types/domain";
import { fail, ok, type ServiceResult } from "../../shared/types/service-result";
import { applyInvoicePaymentSideEffects } from "../../domain/rules/invoice-payment.rule";

export interface CreateInvoiceInput {
  invoiceNumber?: string | null;
  invoiceSeries?: string;
  clientId?: string | null;
  clientName: string;
  issueDate: string;
  dueDate?: string | null;
  subtotal?: number;
  taxAmount?: number;
  totalAmount?: number;
  currency?: string;
  status?: "draft" | "issued" | "cancelled";
  invoiceData: InvoiceDraftPayload;
}

export type UpdateInvoiceInput = Partial<CreateInvoiceInput> & {
  isPaid?: boolean;
  paidAt?: string | null;
};

export interface InvoiceFilters {
  status?: "draft" | "issued" | "cancelled";
  clientId?: string;
  fromDate?: string;
  toDate?: string;
}

export interface InvoicesRepository {
  create(input: CreateInvoiceInput): Promise<ServiceResult<Invoice>>;
  list(filters?: InvoiceFilters): Promise<ServiceResult<Invoice[]>>;
  getById(invoiceId: string): Promise<ServiceResult<Invoice | null>>;
  update(invoiceId: string, input: UpdateInvoiceInput): Promise<ServiceResult<Invoice>>;
  remove(invoiceId: string): Promise<ServiceResult<Invoice>>;
  emit(invoiceId: string): Promise<ServiceResult<Invoice>>;
  togglePaid(invoiceId: string, isPaid: boolean): Promise<ServiceResult<Invoice>>;
}

interface InvoiceRow {
  id: string;
  user_id: string;
  invoice_number: string | null;
  invoice_series: string;
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
  invoice_data: InvoiceDraftPayload;
  created_at: string;
  updated_at: string;
}

function mapInvoiceRow(row: InvoiceRow): Invoice {
  return {
    id: row.id,
    userId: row.user_id,
    invoiceNumber: row.invoice_number,
    invoiceSeries: row.invoice_series,
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
    invoiceData: row.invoice_data,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeCreateInput(input: CreateInvoiceInput, userId: string): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    user_id: userId,
    invoice_series: input.invoiceSeries ?? "A",
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
    invoice_data: input.invoiceData,
  };

  if (input.invoiceNumber && input.invoiceNumber.trim()) {
    payload.invoice_number = input.invoiceNumber.trim();
  }

  return payload;
}

function normalizeUpdateInput(input: UpdateInvoiceInput): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (input.invoiceNumber !== undefined) payload.invoice_number = input.invoiceNumber?.trim() || null;
  if (input.invoiceSeries !== undefined) payload.invoice_series = input.invoiceSeries.trim();
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
  if (input.invoiceData !== undefined) payload.invoice_data = input.invoiceData;

  return payload;
}

async function createInvoiceTransaction(invoice: InvoiceRow): Promise<void> {
  const supabase = getSupabaseClient();
  const { data: existing, error: lookupError } = await supabase
    .from("transacciones")
    .select("id")
    .eq("invoice_id", invoice.id)
    .eq("user_id", invoice.user_id)
    .maybeSingle();
  if (lookupError) {
    throw lookupError;
  }

  if (existing) {
    return;
  }

  const totalAmount = invoice.total_amount ?? Number((invoice.invoice_data as InvoiceDraftPayload)?.summary?.total ?? 0);
  const { error } = await supabase.from("transacciones").insert([
    {
      user_id: invoice.user_id,
      cliente_id: invoice.client_id ?? null,
      importe: Number(totalAmount),
      concepto: `Factura ${invoice.invoice_number ?? "Sin número"}`,
      fecha: invoice.issue_date,
      categoria: "factura",
      tipo: "ingreso",
      invoice_id: invoice.id,
      observaciones: null,
    },
  ]);

  if (error) {
    throw error;
  }
}

async function deleteInvoiceTransaction(invoice: InvoiceRow): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("transacciones").delete().eq("invoice_id", invoice.id).eq("user_id", invoice.user_id);
  if (error) {
    throw error;
  }
}

async function rollbackInvoicePaymentState(invoiceId: string, userId: string, previousState: Invoice): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("invoices")
      .update({
        is_paid: previousState.isPaid,
        paid_at: previousState.paidAt,
        status: previousState.status,
      })
      .eq("id", invoiceId)
      .eq("user_id", userId);
    if (error) {
      console.error("[invoices.repository] Rollback failed for invoice", invoiceId, error);
    }
  } catch (err) {
    console.error("[invoices.repository] Rollback threw for invoice", invoiceId, err);
  }
}

export class SupabaseInvoicesRepository implements InvoicesRepository {
  async create(input: CreateInvoiceInput): Promise<ServiceResult<Invoice>> {
    try {
      if (!input.clientName?.trim()) return fail("El nombre del cliente es obligatorio", "VALIDATION_INVOICE_CLIENT_NAME_REQUIRED");
      if (!input.issueDate) return fail("La fecha de emision es obligatoria", "VALIDATION_INVOICE_ISSUE_DATE_REQUIRED");

      const userId = await getCurrentUserId();
      if (!userId) return fail("Usuario no autenticado", "AUTH_REQUIRED");

      const supabase = getSupabaseClient();
      const payload = normalizeCreateInput(input, userId);
      const { data, error } = await supabase.from("invoices").insert([payload]).select("*").single();
      if (error || !data) return fail(error?.message ?? "No se pudo crear factura", error?.code, error);
      return ok(mapInvoiceRow(data as InvoiceRow));
    } catch (error) {
      return fail("No se pudo crear factura", "INVOICES_CREATE_ERROR", error);
    }
  }

  async list(filters: InvoiceFilters = {}): Promise<ServiceResult<Invoice[]>> {
    try {
      const userId = await getCurrentUserId();
      if (!userId) return ok([]);

      const supabase = getSupabaseClient();
      let query = supabase
        .from("invoices")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (filters.status) query = query.eq("status", filters.status);
      if (filters.clientId) query = query.eq("client_id", filters.clientId);
      if (filters.fromDate) query = query.gte("issue_date", filters.fromDate);
      if (filters.toDate) query = query.lte("issue_date", filters.toDate);

      const { data, error } = await query;
      if (error) return fail(error.message, error.code, error);
      return ok((data ?? []).map((row) => mapInvoiceRow(row as InvoiceRow)));
    } catch (error) {
      return fail("No se pudo listar facturas", "INVOICES_LIST_ERROR", error);
    }
  }

  async getById(invoiceId: string): Promise<ServiceResult<Invoice | null>> {
    try {
      if (!invoiceId) return fail("ID de factura obligatorio", "VALIDATION_INVOICE_ID_REQUIRED");

      const userId = await getCurrentUserId();
      if (!userId) return ok(null);

      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("user_id", userId)
        .eq("id", invoiceId)
        .maybeSingle();

      if (error) return fail(error.message, error.code, error);
      return ok(data ? mapInvoiceRow(data as InvoiceRow) : null);
    } catch (error) {
      return fail("No se pudo obtener factura", "INVOICES_GET_BY_ID_ERROR", error);
    }
  }

  async update(invoiceId: string, input: UpdateInvoiceInput): Promise<ServiceResult<Invoice>> {
    try {
      if (!invoiceId) return fail("ID de factura obligatorio", "VALIDATION_INVOICE_ID_REQUIRED");
      const userId = await getCurrentUserId();
      if (!userId) return fail("Usuario no autenticado", "AUTH_REQUIRED");

      const supabase = getSupabaseClient();
      const payload = normalizeUpdateInput(input);
      const { data, error } = await supabase
        .from("invoices")
        .update(payload)
        .eq("id", invoiceId)
        .eq("user_id", userId)
        .select("*")
        .single();

      if (error || !data) return fail(error?.message ?? "No se pudo actualizar factura", error?.code, error);
      return ok(mapInvoiceRow(data as InvoiceRow));
    } catch (error) {
      return fail("No se pudo actualizar factura", "INVOICES_UPDATE_ERROR", error);
    }
  }

  async remove(invoiceId: string): Promise<ServiceResult<Invoice>> {
    try {
      if (!invoiceId) return fail("ID de factura obligatorio", "VALIDATION_INVOICE_ID_REQUIRED");
      const userId = await getCurrentUserId();
      if (!userId) return fail("Usuario no autenticado", "AUTH_REQUIRED");
      const current = await this.getById(invoiceId);
      if (!current.success) return fail(current.error.message, current.error.code, current.error.cause);
      if (!current.data) return fail("No se encontro la factura", "INVOICE_NOT_FOUND");

      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("invoices")
        .update({
          status: "cancelled",
          is_paid: false,
          paid_at: null,
        })
        .eq("id", invoiceId)
        .eq("user_id", userId)
        .select("*")
        .single();

      if (error || !data) return fail(error?.message ?? "No se pudo anular factura", error?.code, error);

      const cancelledRow = data as InvoiceRow;
      try {
        await deleteInvoiceTransaction(cancelledRow);
      } catch (syncError) {
        await rollbackInvoicePaymentState(invoiceId, userId, current.data);
        return fail(
          "No se pudo anular la factura porque fallo la sincronizacion de su transaccion.",
          "INVOICES_CANCEL_SYNC_ERROR",
          syncError,
        );
      }

      return ok(mapInvoiceRow(cancelledRow));
    } catch (error) {
      return fail("No se pudo anular factura", "INVOICES_REMOVE_ERROR", error);
    }
  }

  async emit(invoiceId: string): Promise<ServiceResult<Invoice>> {
    try {
      if (!invoiceId) return fail("ID de factura obligatorio", "VALIDATION_INVOICE_ID_REQUIRED");
      const userId = await getCurrentUserId();
      if (!userId) return fail("Usuario no autenticado", "AUTH_REQUIRED");
      const current = await this.getById(invoiceId);
      if (!current.success) return fail(current.error.message, current.error.code, current.error.cause);
      if (!current.data) return fail("No se encontro la factura", "INVOICE_NOT_FOUND");
      if (current.data.status === "issued") return ok(current.data);
      if (current.data.status === "cancelled") {
        return fail("No se pueden emitir facturas anuladas.", "INVOICES_EMIT_INVALID_STATUS");
      }

      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("invoices")
        .update({ status: "issued" })
        .eq("id", invoiceId)
        .eq("user_id", userId)
        .select("*")
        .single();

      if (error || !data) return fail(error?.message ?? "No se pudo emitir factura", error?.code, error);
      return ok(mapInvoiceRow(data as InvoiceRow));
    } catch (error) {
      return fail("No se pudo emitir factura", "INVOICES_EMIT_ERROR", error);
    }
  }

  async togglePaid(invoiceId: string, isPaid: boolean): Promise<ServiceResult<Invoice>> {
    try {
      if (!invoiceId) return fail("ID de factura obligatorio", "VALIDATION_INVOICE_ID_REQUIRED");
      const userId = await getCurrentUserId();
      if (!userId) return fail("Usuario no autenticado", "AUTH_REQUIRED");
      const current = await this.getById(invoiceId);
      if (!current.success) return fail(current.error.message, current.error.code, current.error.cause);
      if (!current.data) return fail("No se encontro la factura", "INVOICE_NOT_FOUND");
      if (current.data.status === "cancelled") {
        return fail("No se puede cambiar el pago de una factura anulada.", "INVOICES_TOGGLE_PAID_CANCELLED");
      }
      if (current.data.isPaid === isPaid) {
        return ok(current.data);
      }

      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("invoices")
        .update({
          is_paid: isPaid,
          paid_at: isPaid ? new Date().toISOString() : null,
        })
        .eq("id", invoiceId)
        .eq("user_id", userId)
        .select("*")
        .single();

      if (error || !data) return fail(error?.message ?? "No se pudo actualizar estado de pago", error?.code, error);

      const invoiceRow = data as InvoiceRow;
      try {
        await applyInvoicePaymentSideEffects({
          isPaid,
          invoice: invoiceRow,
          createTransaction: createInvoiceTransaction,
          deleteTransaction: deleteInvoiceTransaction,
        });
      } catch (syncError) {
        await rollbackInvoicePaymentState(invoiceId, userId, current.data);
        return fail(
          "No se pudo sincronizar el cambio de pago con la transaccion asociada.",
          "INVOICES_TOGGLE_PAID_SYNC_ERROR",
          syncError,
        );
      }

      return ok(mapInvoiceRow(invoiceRow));
    } catch (error) {
      return fail("No se pudo cambiar estado de pago de factura", "INVOICES_TOGGLE_PAID_ERROR", error);
    }
  }
}

export const invoicesRepository = new SupabaseInvoicesRepository();
