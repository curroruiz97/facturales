import type { Invoice, InvoiceDraftPayload, PaymentMethod, Quote, QuoteDraftPayload } from "../../../shared/types/domain";
import { calculateDocumentTotals } from "./document-calculations";
import type {
  DocumentEditorState,
  DocumentExpenseDraft,
  DocumentKind,
  DocumentLineDraft,
  DocumentPaymentMethodDraft,
} from "./document-types";

function toTodayISO(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDaysISO(baseDate: string, days: number): string {
  const [year, month, day] = baseDate.split("-").map((part) => Number.parseInt(part, 10));
  const next = new Date(Date.UTC(year, month - 1, day));
  next.setUTCDate(next.getUTCDate() + days);
  const y = next.getUTCFullYear();
  const m = String(next.getUTCMonth() + 1).padStart(2, "0");
  const d = String(next.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function normalizeString(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

function normalizeNumber(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value ?? 0));
  if (!Number.isFinite(parsed)) return 0;
  return parsed;
}

function inferTaxCodeFromLegacyRecord(
  taxLabelRaw: unknown,
  taxRateRaw: unknown,
  taxTypeRaw: unknown,
): string {
  const taxLabel = normalizeString(taxLabelRaw).toUpperCase();
  if (taxLabel) return taxLabel;
  const taxRate = normalizeNumber(taxRateRaw);
  if (taxRate === 0) return "EXENTO";
  const taxType = normalizeString(taxTypeRaw).toLowerCase();
  if (taxType === "igic") return `IGIC_${taxRate}`;
  if (taxType === "ipsi") return `IPSI_${taxRate}`;
  return `IVA_${taxRate}`;
}

function toLineDrafts(lines: unknown, taxTypeRaw: unknown): DocumentLineDraft[] {
  if (!Array.isArray(lines) || lines.length === 0) {
    return [
      {
        id: "line-1",
        description: "",
        quantity: 1,
        unitPrice: 0,
        discount: 0,
        taxCode: "IVA_21",
      },
    ];
  }

  return lines.map((line, index) => {
    const record = (line ?? {}) as Record<string, unknown>;
    const taxCode = inferTaxCodeFromLegacyRecord(record.taxLabel, record.tax, taxTypeRaw);
    return {
      id: `line-${index + 1}`,
      description: normalizeString(record.description),
      quantity: normalizeNumber(record.quantity) || 1,
      unitPrice: normalizeNumber(record.unitPrice),
      discount: normalizeNumber(record.discount),
      taxCode,
    };
  });
}

function toExpenseDrafts(expenses: unknown): DocumentExpenseDraft[] {
  if (!Array.isArray(expenses)) return [];
  return expenses.map((expense, index) => {
    const record = (expense ?? {}) as Record<string, unknown>;
    return {
      id: `expense-${index + 1}`,
      description: normalizeString(record.description) || "Gasto suplido",
      amount: normalizeNumber(record.amount),
    };
  });
}

function toPaymentMethodDrafts(methods: unknown): DocumentPaymentMethodDraft[] {
  if (!Array.isArray(methods)) return [];
  return methods.map((method, index) => {
    const record = (method ?? {}) as Record<string, unknown>;
    return {
      id: `pm-${index + 1}`,
      type: (record.type as DocumentPaymentMethodDraft["type"]) ?? "otro",
      iban: normalizeString(record.iban),
      phone: normalizeString(record.phone),
      label: normalizeString(record.label),
    };
  });
}

function parsePayload<T>(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") return {};
  return value as Record<string, unknown>;
}

function resolveDocumentPart(payload: Record<string, unknown>, kind: DocumentKind): Record<string, unknown> {
  const key = kind === "invoice" ? "invoice" : "quote";
  const value = payload[key];
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function resolveDefaultSeries(kind: DocumentKind): string {
  return kind === "invoice" ? "A" : "P";
}

function resolveDefaultTaxType(kind: DocumentKind): "iva" | "igic" | "ipsi" {
  if (kind === "quote") return "iva";
  return "iva";
}

const VALID_PAYMENT_TYPES: ReadonlyArray<PaymentMethod["type"]> = [
  "transferencia",
  "bizum",
  "efectivo",
  "domiciliacion",
  "contrareembolso",
  "otro",
];

function normalizePaymentMethods(methods: DocumentPaymentMethodDraft[]): PaymentMethod[] {
  return methods
    .filter((method) => method && typeof method.type === "string" && VALID_PAYMENT_TYPES.includes(method.type as PaymentMethod["type"]))
    .map((method) => ({
      type: method.type,
      // Solo transferencia/domiciliacion/otro llevan IBAN; efectivo/bizum/contrareembolso NO.
      iban: method.iban && method.type !== "efectivo" && method.type !== "bizum" && method.type !== "contrareembolso" ? method.iban : undefined,
      // Solo bizum usa phone.
      phone: method.phone && method.type === "bizum" ? method.phone : undefined,
      label: method.label || undefined,
    }));
}

export function createEmptyDocumentEditor(kind: DocumentKind): DocumentEditorState {
  const issueDate = toTodayISO();
  const dueDate = addDaysISO(issueDate, 30);

  return {
    kind,
    issuer: {
      name: "",
      nif: "",
      email: "",
      address: "",
      postalCode: "",
    },
    client: {
      clientId: null,
      name: "",
      nif: "",
      email: "",
      address: "",
      postalCode: "",
    },
    meta: {
      series: resolveDefaultSeries(kind),
      number: "",
      reference: "",
      issueDate,
      dueDate,
      operationDate: issueDate,
      paymentTerms: "",
      currency: "EUR",
    },
    lines: [
      {
        id: "line-1",
        description: "",
        quantity: 1,
        unitPrice: 0,
        discount: 0,
        taxCode: "IVA_21",
      },
    ],
    expenses: [],
    paymentMethods: [],
    taxSettings: {
      taxType: resolveDefaultTaxType(kind),
      applyRecargoEquivalencia: false,
      retentionRate: 0,
      generalDiscountRate: 0,
    },
    paidAmount: 0,
    observations: "",
  };
}

export function mapInvoiceToDocumentEditor(invoice: Invoice): DocumentEditorState {
  const payload = parsePayload<InvoiceDraftPayload>(invoice.invoiceData);
  const invoicePart = resolveDocumentPart(payload, "invoice");
  const issuer = parsePayload(payload.issuer);
  const client = parsePayload(payload.client);
  const taxSettings = parsePayload(payload.taxSettings);
  const adjustments = parsePayload(payload.adjustments);
  const options = parsePayload(payload.options);
  const payment = parsePayload(payload.payment);
  const dates = parsePayload(payload.dates);
  const summary = parsePayload(payload.summary);

  return {
    kind: "invoice",
    issuer: {
      name: normalizeString(issuer.name),
      nif: normalizeString(issuer.nif),
      email: normalizeString(issuer.email),
      address: normalizeString(issuer.address),
      postalCode: normalizeString(issuer.postalCode),
    },
    client: {
      clientId: invoice.clientId,
      name: normalizeString(client.name) || invoice.clientName,
      nif: normalizeString(client.nif),
      email: normalizeString(client.email),
      address: normalizeString(client.address),
      postalCode: normalizeString(client.postalCode),
    },
    meta: {
      series: invoice.invoiceSeries || resolveDefaultSeries("invoice"),
      number: invoice.invoiceNumber ?? "",
      reference: normalizeString(invoicePart.reference),
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate ?? "",
      operationDate: normalizeString(dates.operation || invoicePart.operationDate),
      paymentTerms: normalizeString(payment.terms || invoicePart.paymentTerms),
      currency: invoice.currency,
    },
    lines: toLineDrafts(payload.concepts, taxSettings.taxType),
    expenses: toExpenseDrafts(payload.expenses),
    paymentMethods: toPaymentMethodDrafts(payload.paymentMethods),
    taxSettings: {
      taxType: (normalizeString(taxSettings.taxType).toLowerCase() as "iva" | "igic" | "ipsi") || "iva",
      applyRecargoEquivalencia: Boolean(taxSettings.applyRE || options.recargoEquivalencia),
      retentionRate: normalizeNumber(adjustments.withholding || taxSettings.retentionRate || summary.retentionRate),
      generalDiscountRate: normalizeNumber(adjustments.discount || taxSettings.generalDiscountRate),
    },
    paidAmount: normalizeNumber(summary.paid || (invoice.isPaid ? invoice.totalAmount : 0)),
    observations: normalizeString(payload.observations),
  };
}

export function mapQuoteToDocumentEditor(quote: Quote): DocumentEditorState {
  const payload = parsePayload<QuoteDraftPayload>(quote.quoteData);
  const quotePart = resolveDocumentPart(payload, "quote");
  const issuer = parsePayload(payload.issuer);
  const client = parsePayload(payload.client);
  const taxSettings = parsePayload(payload.taxSettings);
  const adjustments = parsePayload(payload.adjustments);
  const options = parsePayload(payload.options);
  const payment = parsePayload(payload.payment);
  const dates = parsePayload(payload.dates);
  const summary = parsePayload(payload.summary);

  return {
    kind: "quote",
    issuer: {
      name: normalizeString(issuer.name),
      nif: normalizeString(issuer.nif),
      email: normalizeString(issuer.email),
      address: normalizeString(issuer.address),
      postalCode: normalizeString(issuer.postalCode),
    },
    client: {
      clientId: quote.clientId,
      name: normalizeString(client.name) || quote.clientName,
      nif: normalizeString(client.nif),
      email: normalizeString(client.email),
      address: normalizeString(client.address),
      postalCode: normalizeString(client.postalCode),
    },
    meta: {
      series: quote.quoteSeries || resolveDefaultSeries("quote"),
      number: quote.quoteNumber ?? "",
      reference: normalizeString(quotePart.reference),
      issueDate: quote.issueDate,
      dueDate: quote.dueDate ?? "",
      operationDate: normalizeString(dates.operation || quotePart.operationDate),
      paymentTerms: normalizeString(payment.terms || quotePart.paymentTerms),
      currency: quote.currency,
    },
    lines: toLineDrafts(payload.concepts, taxSettings.taxType),
    expenses: toExpenseDrafts(payload.expenses),
    paymentMethods: toPaymentMethodDrafts(payload.paymentMethods),
    taxSettings: {
      taxType: (normalizeString(taxSettings.taxType).toLowerCase() as "iva" | "igic" | "ipsi") || "iva",
      applyRecargoEquivalencia: Boolean(taxSettings.applyRE || options.recargoEquivalencia),
      retentionRate: normalizeNumber(adjustments.withholding || taxSettings.retentionRate || summary.retentionRate),
      generalDiscountRate: normalizeNumber(adjustments.discount || taxSettings.generalDiscountRate),
    },
    paidAmount: normalizeNumber(summary.paid || (quote.isPaid ? quote.totalAmount : 0)),
    observations: normalizeString(payload.observations),
  };
}

export function buildInvoicePayload(editor: DocumentEditorState): {
  invoiceInput: {
    invoiceNumber?: string;
    invoiceSeries: string;
    clientId: string | null;
    clientName: string;
    issueDate: string;
    dueDate: string | null;
    subtotal: number;
    taxAmount: number;
    totalAmount: number;
    currency: string;
    invoiceData: InvoiceDraftPayload;
  };
} {
  const totals = calculateDocumentTotals(editor);
  const invoiceNumber = editor.meta.number.trim() || undefined;

  const invoiceData: InvoiceDraftPayload = {
    issuer: { ...editor.issuer },
    client: {
      name: editor.client.name,
      nif: editor.client.nif,
      email: editor.client.email,
      address: editor.client.address,
      postalCode: editor.client.postalCode,
    },
    invoice: {
      series: editor.meta.series,
      number: invoiceNumber ?? "",
      reference: editor.meta.reference,
      issueDate: editor.meta.issueDate,
      dueDate: editor.meta.dueDate,
      operationDate: editor.meta.operationDate,
      paymentTerms: editor.meta.paymentTerms,
    },
    concepts: totals.concepts,
    expenses: editor.expenses.map((expense) => ({
      description: expense.description.trim() || "Gasto suplido",
      amount: normalizeNumber(expense.amount),
    })),
    taxSettings: {
      taxType: editor.taxSettings.taxType,
      retentionRate: editor.taxSettings.retentionRate,
      applyRE: editor.taxSettings.applyRecargoEquivalencia,
    },
    dates: {
      issue: editor.meta.issueDate,
      due: editor.meta.dueDate,
      operation: editor.meta.operationDate,
    },
    payment: {
      terms: editor.meta.paymentTerms,
    },
    adjustments: {
      discount: editor.taxSettings.generalDiscountRate,
      withholding: editor.taxSettings.retentionRate,
    },
    options: {
      recargoEquivalencia: editor.taxSettings.applyRecargoEquivalencia,
    },
    paymentMethods: normalizePaymentMethods(editor.paymentMethods),
    observations: editor.observations,
    summary: totals.summary,
  };

  return {
    invoiceInput: {
      invoiceNumber,
      invoiceSeries: editor.meta.series || resolveDefaultSeries("invoice"),
      clientId: editor.client.clientId,
      clientName: editor.client.name.trim(),
      issueDate: editor.meta.issueDate,
      dueDate: editor.meta.dueDate || null,
      subtotal: totals.summary.taxBase,
      taxAmount: totals.summary.taxAmount + totals.summary.reAmount - totals.summary.retentionAmount,
      totalAmount: totals.summary.total,
      currency: editor.meta.currency || "EUR",
      invoiceData,
    },
  };
}

export function buildQuotePayload(editor: DocumentEditorState): {
  quoteInput: {
    quoteNumber?: string;
    quoteSeries: string;
    clientId: string | null;
    clientName: string;
    issueDate: string;
    dueDate: string | null;
    subtotal: number;
    taxAmount: number;
    totalAmount: number;
    currency: string;
    quoteData: QuoteDraftPayload;
  };
} {
  const totals = calculateDocumentTotals(editor);
  const quoteNumber = editor.meta.number.trim() || undefined;

  const quoteData: QuoteDraftPayload = {
    issuer: { ...editor.issuer },
    client: {
      name: editor.client.name,
      nif: editor.client.nif,
      email: editor.client.email,
      address: editor.client.address,
      postalCode: editor.client.postalCode,
    },
    quote: {
      series: editor.meta.series,
      number: quoteNumber ?? "",
      reference: editor.meta.reference,
      issueDate: editor.meta.issueDate,
      dueDate: editor.meta.dueDate,
      operationDate: editor.meta.operationDate,
      paymentTerms: editor.meta.paymentTerms,
    },
    concepts: totals.concepts,
    expenses: editor.expenses.map((expense) => ({
      description: expense.description.trim() || "Gasto suplido",
      amount: normalizeNumber(expense.amount),
    })),
    taxSettings: {
      taxType: editor.taxSettings.taxType,
      retentionRate: editor.taxSettings.retentionRate,
      applyRE: editor.taxSettings.applyRecargoEquivalencia,
    },
    dates: {
      issue: editor.meta.issueDate,
      due: editor.meta.dueDate,
      operation: editor.meta.operationDate,
    },
    payment: {
      terms: editor.meta.paymentTerms,
    },
    adjustments: {
      discount: editor.taxSettings.generalDiscountRate,
      withholding: editor.taxSettings.retentionRate,
    },
    options: {
      recargoEquivalencia: editor.taxSettings.applyRecargoEquivalencia,
    },
    paymentMethods: normalizePaymentMethods(editor.paymentMethods),
    observations: editor.observations,
    summary: totals.summary,
  };

  return {
    quoteInput: {
      quoteNumber,
      quoteSeries: editor.meta.series || resolveDefaultSeries("quote"),
      clientId: editor.client.clientId,
      clientName: editor.client.name.trim(),
      issueDate: editor.meta.issueDate,
      dueDate: editor.meta.dueDate || null,
      subtotal: totals.summary.taxBase,
      taxAmount: totals.summary.taxAmount + totals.summary.reAmount - totals.summary.retentionAmount,
      totalAmount: totals.summary.total,
      currency: editor.meta.currency || "EUR",
      quoteData,
    },
  };
}
