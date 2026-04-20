import { billingLimitsService } from "../../../services/billing-limits/billing-limits.service";
import { quotesRepository } from "../../../services/repositories";
import type { Quote, QuoteStatus } from "../../../shared/types/domain";
import { fail, ok, type ServiceResult } from "../../../shared/types/service-result";
import { buildQuotePayload, createEmptyDocumentEditor, mapQuoteToDocumentEditor } from "../../documents/core/document-mappers";
import type { DocumentEditorState } from "../../documents/core/document-types";

export interface QuoteWorkspaceItem {
  id: string;
  quoteNumber: string;
  clientName: string;
  issueDate: string;
  dueDate: string | null;
  totalAmount: number;
  currency: string;
  status: QuoteStatus;
  isPaid: boolean;
  updatedAt: string;
}

export interface QuoteEditorPayload {
  editor: DocumentEditorState;
  status: QuoteStatus;
}

export interface QuotesAdapter {
  loadQuotes(status?: "all" | QuoteStatus, search?: string): Promise<ServiceResult<QuoteWorkspaceItem[]>>;
  loadQuoteEditor(quoteId: string): Promise<ServiceResult<QuoteEditorPayload>>;
  createDraft(editor: DocumentEditorState): Promise<ServiceResult<Quote>>;
  updateDraft(quoteId: string, editor: DocumentEditorState): Promise<ServiceResult<Quote>>;
  emitQuote(quoteId: string): Promise<ServiceResult<Quote>>;
  togglePaid(quoteId: string, isPaid: boolean): Promise<ServiceResult<Quote>>;
  cancelQuote(quoteId: string): Promise<ServiceResult<Quote>>;
  createEmpty(): DocumentEditorState;
}

function toWorkspaceItem(quote: Quote): QuoteWorkspaceItem {
  return {
    id: quote.id,
    quoteNumber: quote.quoteNumber ?? "Sin número",
    clientName: quote.clientName,
    issueDate: quote.issueDate,
    dueDate: quote.dueDate,
    totalAmount: quote.totalAmount,
    currency: quote.currency,
    status: quote.status,
    isPaid: quote.isPaid,
    updatedAt: quote.updatedAt,
  };
}

function matchesSearch(quote: QuoteWorkspaceItem, search: string): boolean {
  const normalized = search.trim().toLowerCase();
  if (!normalized) return true;
  return (
    quote.quoteNumber.toLowerCase().includes(normalized) ||
    quote.clientName.toLowerCase().includes(normalized) ||
    quote.status.toLowerCase().includes(normalized)
  );
}

function isEditable(status: QuoteStatus): boolean {
  return status === "draft";
}

export class DefaultQuotesAdapter implements QuotesAdapter {
  async loadQuotes(status: "all" | QuoteStatus = "all", search = ""): Promise<ServiceResult<QuoteWorkspaceItem[]>> {
    const result = await quotesRepository.list(status === "all" ? {} : { status });
    if (!result.success) return fail(result.error.message, result.error.code, result.error.cause);

    const filtered = result.data
      .map(toWorkspaceItem)
      .filter((item) => matchesSearch(item, search))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    return ok(filtered);
  }

  async loadQuoteEditor(quoteId: string): Promise<ServiceResult<QuoteEditorPayload>> {
    const result = await quotesRepository.getById(quoteId);
    if (!result.success) return fail(result.error.message, result.error.code, result.error.cause);
    if (!result.data) return fail("No se encontró el presupuesto.", "QUOTE_NOT_FOUND");
    return ok({
      editor: mapQuoteToDocumentEditor(result.data),
      status: result.data.status,
    });
  }

  async createDraft(editor: DocumentEditorState): Promise<ServiceResult<Quote>> {
    const canCreate = await billingLimitsService.canCreateDocument("quote");
    if (!canCreate.success) return fail(canCreate.error.message, canCreate.error.code, canCreate.error.cause);
    if (!canCreate.data.allowed) return fail(canCreate.data.reason ?? "Límite alcanzado", "BILLING_LIMIT_QUOTES_BLOCKED");

    const payload = buildQuotePayload(editor).quoteInput;
    const created = await quotesRepository.create({
      ...payload,
      status: "draft",
      quoteData: payload.quoteData,
    });

    if (!created.success) return fail(created.error.message, created.error.code, created.error.cause);

    // Mantiene semantica legacy: los presupuestos consumen contador documental compartido.
    await billingLimitsService.recordInvoiceUsage();

    return created;
  }

  async updateDraft(quoteId: string, editor: DocumentEditorState): Promise<ServiceResult<Quote>> {
    const existing = await quotesRepository.getById(quoteId);
    if (!existing.success) return fail(existing.error.message, existing.error.code, existing.error.cause);
    if (!existing.data) return fail("No se encontró el presupuesto.", "QUOTE_NOT_FOUND");
    if (!isEditable(existing.data.status)) {
      return fail("Los presupuestos emitidos/anulados solo permiten cambios de estado.", "QUOTE_UPDATE_LOCKED");
    }

    const payload = buildQuotePayload(editor).quoteInput;
    return quotesRepository.update(quoteId, {
      quoteNumber: payload.quoteNumber,
      quoteSeries: payload.quoteSeries,
      clientId: payload.clientId,
      clientName: payload.clientName,
      issueDate: payload.issueDate,
      dueDate: payload.dueDate,
      subtotal: payload.subtotal,
      taxAmount: payload.taxAmount,
      totalAmount: payload.totalAmount,
      currency: payload.currency,
      quoteData: payload.quoteData,
    });
  }

  async emitQuote(quoteId: string): Promise<ServiceResult<Quote>> {
    return quotesRepository.emit(quoteId);
  }

  async togglePaid(quoteId: string, isPaid: boolean): Promise<ServiceResult<Quote>> {
    return quotesRepository.togglePaid(quoteId, isPaid);
  }

  async cancelQuote(quoteId: string): Promise<ServiceResult<Quote>> {
    return quotesRepository.remove(quoteId);
  }

  createEmpty(): DocumentEditorState {
    return createEmptyDocumentEditor("quote");
  }
}

export const quotesAdapter = new DefaultQuotesAdapter();
