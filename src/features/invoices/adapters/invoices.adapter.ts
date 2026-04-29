import { billingLimitsService } from "../../../services/billing-limits/billing-limits.service";
import { onboardingService } from "../../../services/onboarding/onboarding.service";
import { invoicesRepository } from "../../../services/repositories";
import { getCurrentUserId, getSupabaseClient } from "../../../services/supabase/client";
import type { Invoice, InvoiceStatus } from "../../../shared/types/domain";
import { fail, ok, type ServiceResult } from "../../../shared/types/service-result";
import { calculateDocumentTotals } from "../../documents/core/document-calculations";
import { buildInvoicePayload, createEmptyDocumentEditor, mapInvoiceToDocumentEditor } from "../../documents/core/document-mappers";
import type { DocumentEditorState } from "../../documents/core/document-types";

export interface InvoiceWorkspaceItem {
  id: string;
  invoiceNumber: string;
  invoiceSeries: string;
  clientName: string;
  issueDate: string;
  dueDate: string | null;
  totalAmount: number;
  currency: string;
  status: InvoiceStatus;
  isPaid: boolean;
  emailSent: boolean;
  updatedAt: string;
}

export interface InvoiceEditorPayload {
  editor: DocumentEditorState;
  status: InvoiceStatus;
}

export interface InvoicePdfPayload {
  editor: DocumentEditorState;
  totals: {
    subtotal: number;
    discount: number;
    taxBase: number;
    taxAmount: number;
    reAmount: number;
    retentionAmount: number;
    expenses: number;
    total: number;
    totalToPay: number;
  };
  documentNumber: string;
}

export interface BulkOperationResult {
  ok: number;
  failed: number;
}

export interface InvoicesAdapter {
  loadInvoices(status?: "all" | InvoiceStatus, search?: string): Promise<ServiceResult<InvoiceWorkspaceItem[]>>;
  loadInvoiceEditor(invoiceId: string): Promise<ServiceResult<InvoiceEditorPayload>>;
  loadInvoicePdfPayload(invoiceId: string): Promise<ServiceResult<InvoicePdfPayload>>;
  createDraft(editor: DocumentEditorState): Promise<ServiceResult<Invoice>>;
  updateDraft(invoiceId: string, editor: DocumentEditorState): Promise<ServiceResult<Invoice>>;
  emitInvoice(invoiceId: string): Promise<ServiceResult<Invoice>>;
  togglePaid(invoiceId: string, isPaid: boolean): Promise<ServiceResult<Invoice>>;
  cancelInvoice(invoiceId: string): Promise<ServiceResult<Invoice>>;
  togglePaidMany(invoiceIds: string[], isPaid: boolean): Promise<BulkOperationResult>;
  cancelMany(invoiceIds: string[]): Promise<BulkOperationResult>;
  markEmailedMany(invoiceIds: string[]): Promise<BulkOperationResult>;
  createEmpty(): DocumentEditorState;
}

function toWorkspaceItem(invoice: Invoice, emailSent = false): InvoiceWorkspaceItem {
  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber ?? "Sin número",
    invoiceSeries: invoice.invoiceSeries ?? "",
    clientName: invoice.clientName,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    totalAmount: invoice.totalAmount,
    currency: invoice.currency,
    status: invoice.status,
    isPaid: invoice.isPaid,
    emailSent,
    updatedAt: invoice.updatedAt,
  };
}

function matchesSearch(invoice: InvoiceWorkspaceItem, search: string): boolean {
  const normalized = search.trim().toLowerCase();
  if (!normalized) return true;
  return (
    invoice.invoiceNumber.toLowerCase().includes(normalized) ||
    invoice.clientName.toLowerCase().includes(normalized) ||
    invoice.status.toLowerCase().includes(normalized)
  );
}

function isEditable(status: InvoiceStatus): boolean {
  return status === "draft";
}

export class DefaultInvoicesAdapter implements InvoicesAdapter {
  async loadInvoices(status: "all" | InvoiceStatus = "all", search = ""): Promise<ServiceResult<InvoiceWorkspaceItem[]>> {
    const result = await invoicesRepository.list(status === "all" ? {} : { status });
    if (!result.success) return fail(result.error.message, result.error.code, result.error.cause);

    // Fetch email-sent status for all invoices in one query
    const invoiceIds = result.data.map((i) => i.id);
    const sentIds = new Set<string>();
    if (invoiceIds.length > 0) {
      try {
        const supabase = getSupabaseClient();
        const { data: emailLogs } = await supabase
          .from("document_email_log")
          .select("document_id")
          .eq("document_type", "invoice")
          .eq("status", "sent")
          .in("document_id", invoiceIds);
        if (emailLogs) {
          for (const log of emailLogs) sentIds.add(log.document_id);
        }
      } catch {
        // Silently ignore email log errors — field defaults to false
      }
    }

    const filtered = result.data
      .map((invoice) => toWorkspaceItem(invoice, sentIds.has(invoice.id)))
      .filter((item) => matchesSearch(item, search))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    return ok(filtered);
  }

  async loadInvoiceEditor(invoiceId: string): Promise<ServiceResult<InvoiceEditorPayload>> {
    const result = await invoicesRepository.getById(invoiceId);
    if (!result.success) return fail(result.error.message, result.error.code, result.error.cause);
    if (!result.data) return fail("No se encontró la factura.", "INVOICE_NOT_FOUND");
    return ok({
      editor: mapInvoiceToDocumentEditor(result.data),
      status: result.data.status,
    });
  }

  async loadInvoicePdfPayload(invoiceId: string): Promise<ServiceResult<InvoicePdfPayload>> {
    const result = await invoicesRepository.getById(invoiceId);
    if (!result.success) return fail(result.error.message, result.error.code, result.error.cause);
    if (!result.data) return fail("No se encontró la factura.", "INVOICE_NOT_FOUND");

    const editor = mapInvoiceToDocumentEditor(result.data);
    const { summary } = calculateDocumentTotals(editor);

    const rawNumber = result.data.invoiceNumber || "";
    const seriesCode = result.data.invoiceSeries || "";
    const documentNumber = rawNumber
      ? (seriesCode && !rawNumber.toUpperCase().includes(seriesCode.toUpperCase())
          ? `${seriesCode}-${rawNumber}`
          : rawNumber)
      : `factura-${invoiceId.slice(0, 8)}`;

    return ok({
      editor,
      totals: {
        subtotal: summary.subtotal,
        discount: summary.discount,
        taxBase: summary.taxBase,
        taxAmount: summary.taxAmount,
        reAmount: summary.reAmount,
        retentionAmount: summary.retentionAmount,
        expenses: summary.expenses,
        total: summary.total,
        totalToPay: summary.totalToPay,
      },
      documentNumber,
    });
  }

  async createDraft(editor: DocumentEditorState): Promise<ServiceResult<Invoice>> {
    const canCreate = await billingLimitsService.canCreateDocument("invoice");
    if (!canCreate.success) return fail(canCreate.error.message, canCreate.error.code, canCreate.error.cause);
    if (!canCreate.data.allowed) return fail(canCreate.data.reason ?? "Límite alcanzado", "BILLING_LIMIT_INVOICES_BLOCKED");

    const payload = buildInvoicePayload(editor).invoiceInput;
    // Los borradores NO reservan número de factura. El correlativo se asigna en
    // emisión (trigger `set_invoice_number_on_emit` en BD). Forzar null evita
    // chocar con el unique index `(user_id, invoice_number)` cuando el usuario
    // teclea un número ya usado por otra factura emitida o por otro borrador.
    const created = await invoicesRepository.create({
      ...payload,
      invoiceNumber: null,
      status: "draft",
      invoiceData: payload.invoiceData,
    });

    if (!created.success) return fail(created.error.message, created.error.code, created.error.cause);
    // NB: el contador de uso (`billing_usage.invoices_used`) se incrementa solo al **emitir**,
    // no al crear un borrador. Así borradores/cancelaciones no consumen cuota.
    return created;
  }

  async updateDraft(invoiceId: string, editor: DocumentEditorState): Promise<ServiceResult<Invoice>> {
    const existing = await invoicesRepository.getById(invoiceId);
    if (!existing.success) return fail(existing.error.message, existing.error.code, existing.error.cause);
    if (!existing.data) return fail("No se encontró la factura.", "INVOICE_NOT_FOUND");
    if (!isEditable(existing.data.status)) {
      return fail("Las facturas emitidas/anuladas solo permiten cambios de estado.", "INVOICE_UPDATE_LOCKED");
    }

    const payload = buildInvoicePayload(editor).invoiceInput;
    // Borradores no reservan número (mismo razonamiento que createDraft).
    return invoicesRepository.update(invoiceId, {
      invoiceNumber: null,
      invoiceSeries: payload.invoiceSeries,
      clientId: payload.clientId,
      clientName: payload.clientName,
      issueDate: payload.issueDate,
      dueDate: payload.dueDate,
      subtotal: payload.subtotal,
      taxAmount: payload.taxAmount,
      totalAmount: payload.totalAmount,
      currency: payload.currency,
      invoiceData: payload.invoiceData,
    });
  }

  async emitInvoice(invoiceId: string): Promise<ServiceResult<Invoice>> {
    const emitted = await invoicesRepository.emit(invoiceId);
    if (!emitted.success) return emitted;

    // El contador se incrementa SOLO en emisión real, no en borrador.
    await billingLimitsService.recordInvoiceUsage();

    const userId = await getCurrentUserId();
    if (userId) {
      await onboardingService.updateStep(userId, 4, true);
    }

    return emitted;
  }

  async togglePaid(invoiceId: string, isPaid: boolean): Promise<ServiceResult<Invoice>> {
    return invoicesRepository.togglePaid(invoiceId, isPaid);
  }

  async cancelInvoice(invoiceId: string): Promise<ServiceResult<Invoice>> {
    return invoicesRepository.remove(invoiceId);
  }

  async togglePaidMany(invoiceIds: string[], isPaid: boolean): Promise<BulkOperationResult> {
    const results = await Promise.allSettled(
      invoiceIds.map((id) => invoicesRepository.togglePaid(id, isPaid)),
    );
    let okCount = 0;
    let failedCount = 0;
    for (const r of results) {
      if (r.status === "fulfilled" && r.value.success) okCount++;
      else failedCount++;
    }
    return { ok: okCount, failed: failedCount };
  }

  async cancelMany(invoiceIds: string[]): Promise<BulkOperationResult> {
    const results = await Promise.allSettled(invoiceIds.map((id) => invoicesRepository.remove(id)));
    let okCount = 0;
    let failedCount = 0;
    for (const r of results) {
      if (r.status === "fulfilled" && r.value.success) okCount++;
      else failedCount++;
    }
    return { ok: okCount, failed: failedCount };
  }

  async markEmailedMany(invoiceIds: string[]): Promise<BulkOperationResult> {
    if (invoiceIds.length === 0) return { ok: 0, failed: 0 };
    const userId = await getCurrentUserId();
    if (!userId) return { ok: 0, failed: invoiceIds.length };

    const supabase = getSupabaseClient();
    const nowIso = new Date().toISOString();

    // Filtrar las que ya tienen un registro 'sent' para evitar duplicados ruidosos.
    const { data: existingLogs } = await supabase
      .from("document_email_log")
      .select("document_id")
      .eq("document_type", "invoice")
      .eq("status", "sent")
      .in("document_id", invoiceIds);
    const alreadySent = new Set<string>((existingLogs ?? []).map((row) => row.document_id as string));
    const pendingIds = invoiceIds.filter((id) => !alreadySent.has(id));

    if (pendingIds.length === 0) {
      // Todas estaban ya marcadas como enviadas; tratamos como éxito.
      return { ok: invoiceIds.length, failed: 0 };
    }

    const rows = pendingIds.map((id) => ({
      user_id: userId,
      document_type: "invoice" as const,
      document_id: id,
      to_email: "manual",
      provider: "manual",
      status: "sent" as const,
      sent_at: nowIso,
      idempotency_key: `manual-${id}-${nowIso}`,
    }));

    const { error } = await supabase.from("document_email_log").insert(rows);
    if (error) {
      return { ok: alreadySent.size, failed: pendingIds.length };
    }
    return { ok: invoiceIds.length, failed: 0 };
  }

  createEmpty(): DocumentEditorState {
    return createEmptyDocumentEditor("invoice");
  }
}

export const invoicesAdapter = new DefaultInvoicesAdapter();
