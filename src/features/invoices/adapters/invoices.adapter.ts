import { billingLimitsService } from "../../../services/billing-limits/billing-limits.service";
import { onboardingService } from "../../../services/onboarding/onboarding.service";
import { invoicesRepository } from "../../../services/repositories";
import { getCurrentUserId, getSupabaseClient } from "../../../services/supabase/client";
import type { Invoice, InvoiceStatus } from "../../../shared/types/domain";
import { fail, ok, type ServiceResult } from "../../../shared/types/service-result";
import { buildInvoicePayload, createEmptyDocumentEditor, mapInvoiceToDocumentEditor } from "../../documents/core/document-mappers";
import type { DocumentEditorState } from "../../documents/core/document-types";

export interface InvoiceWorkspaceItem {
  id: string;
  invoiceNumber: string;
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

export interface InvoicesAdapter {
  loadInvoices(status?: "all" | InvoiceStatus, search?: string): Promise<ServiceResult<InvoiceWorkspaceItem[]>>;
  loadInvoiceEditor(invoiceId: string): Promise<ServiceResult<InvoiceEditorPayload>>;
  createDraft(editor: DocumentEditorState): Promise<ServiceResult<Invoice>>;
  updateDraft(invoiceId: string, editor: DocumentEditorState): Promise<ServiceResult<Invoice>>;
  emitInvoice(invoiceId: string): Promise<ServiceResult<Invoice>>;
  togglePaid(invoiceId: string, isPaid: boolean): Promise<ServiceResult<Invoice>>;
  cancelInvoice(invoiceId: string): Promise<ServiceResult<Invoice>>;
  createEmpty(): DocumentEditorState;
}

function toWorkspaceItem(invoice: Invoice, emailSent = false): InvoiceWorkspaceItem {
  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber ?? "Sin número",
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

  async createDraft(editor: DocumentEditorState): Promise<ServiceResult<Invoice>> {
    const canCreate = await billingLimitsService.canCreateDocument("invoice");
    if (!canCreate.success) return fail(canCreate.error.message, canCreate.error.code, canCreate.error.cause);
    if (!canCreate.data.allowed) return fail(canCreate.data.reason ?? "Límite alcanzado", "BILLING_LIMIT_INVOICES_BLOCKED");

    const payload = buildInvoicePayload(editor).invoiceInput;
    const created = await invoicesRepository.create({
      ...payload,
      status: "draft",
      invoiceData: payload.invoiceData,
    });

    if (!created.success) return fail(created.error.message, created.error.code, created.error.cause);
    await billingLimitsService.recordInvoiceUsage();
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
    return invoicesRepository.update(invoiceId, {
      invoiceNumber: payload.invoiceNumber,
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

  createEmpty(): DocumentEditorState {
    return createEmptyDocumentEditor("invoice");
  }
}

export const invoicesAdapter = new DefaultInvoicesAdapter();
