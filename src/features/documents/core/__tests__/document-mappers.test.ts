import { describe, expect, it } from "vitest";
import type { Invoice, Quote } from "../../../../shared/types/domain";
import {
  buildInvoicePayload,
  buildQuotePayload,
  createEmptyDocumentEditor,
  mapInvoiceToDocumentEditor,
  mapQuoteToDocumentEditor,
} from "../document-mappers";

function buildInvoiceFixture(): Invoice {
  return {
    id: "inv-1",
    userId: "user-1",
    invoiceNumber: "F20260001",
    invoiceSeries: "A",
    clientId: "client-1",
    clientName: "Cliente Demo",
    issueDate: "2026-03-10",
    dueDate: "2026-03-25",
    subtotal: 100,
    taxAmount: 21,
    totalAmount: 121,
    currency: "EUR",
    status: "draft",
    isPaid: false,
    paidAt: null,
    invoiceData: {
      issuer: { name: "Mi Empresa", nif: "B00000000", email: "info@demo.com", address: "Calle 1", postalCode: "28001" },
      client: { name: "Cliente Demo", nif: "12345678Z", email: "cliente@demo.com", address: "Calle 2", postalCode: "28002" },
      invoice: { reference: "REF-1", series: "A", number: "F20260001", issueDate: "2026-03-10", dueDate: "2026-03-25" },
      concepts: [{ description: "Linea 1", quantity: 1, unitPrice: 100, discount: 0, tax: 21, total: 121 }],
      expenses: [],
      taxSettings: { taxType: "iva", retentionRate: 0, applyRE: false },
      paymentMethods: [{ type: "transferencia", iban: "ES123" }],
      observations: "Obs",
      summary: {
        subtotal: 100,
        discount: 0,
        taxBase: 100,
        taxRate: 21,
        taxAmount: 21,
        reRate: 0,
        reAmount: 0,
        retentionRate: 0,
        retentionAmount: 0,
        expenses: 0,
        total: 121,
        paid: 0,
        totalToPay: 121,
      },
    },
    createdAt: "2026-03-10T10:00:00.000Z",
    updatedAt: "2026-03-10T10:00:00.000Z",
  };
}

function buildQuoteFixture(): Quote {
  return {
    id: "quo-1",
    userId: "user-1",
    quoteNumber: "P20260001",
    quoteSeries: "P",
    clientId: "client-1",
    clientName: "Cliente Demo",
    issueDate: "2026-03-10",
    dueDate: "2026-03-25",
    subtotal: 100,
    taxAmount: 21,
    totalAmount: 121,
    currency: "EUR",
    status: "draft",
    isPaid: false,
    paidAt: null,
    quoteData: {
      issuer: { name: "Mi Empresa", nif: "B00000000", email: "info@demo.com", address: "Calle 1", postalCode: "28001" },
      client: { name: "Cliente Demo", nif: "12345678Z", email: "cliente@demo.com", address: "Calle 2", postalCode: "28002" },
      quote: { reference: "Q-REF-1", series: "P", number: "P20260001", issueDate: "2026-03-10", dueDate: "2026-03-25" },
      concepts: [{ description: "Linea 1", quantity: 1, unitPrice: 100, discount: 0, tax: 21, total: 121 }],
      expenses: [],
      taxSettings: { taxType: "iva", retentionRate: 0, applyRE: false },
      paymentMethods: [{ type: "efectivo" }],
      observations: "Obs",
      summary: {
        subtotal: 100,
        discount: 0,
        taxBase: 100,
        taxRate: 21,
        taxAmount: 21,
        reRate: 0,
        reAmount: 0,
        retentionRate: 0,
        retentionAmount: 0,
        expenses: 0,
        total: 121,
        paid: 0,
        totalToPay: 121,
      },
    },
    createdAt: "2026-03-10T10:00:00.000Z",
    updatedAt: "2026-03-10T10:00:00.000Z",
  };
}

describe("document-mappers", () => {
  it("crea estado vacio por defecto", () => {
    const state = createEmptyDocumentEditor("invoice");
    expect(state.kind).toBe("invoice");
    expect(state.meta.series).toBe("A");
    expect(state.lines).toHaveLength(1);
  });

  it("mapea invoice a editor y reconstruye payload", () => {
    const editor = mapInvoiceToDocumentEditor(buildInvoiceFixture());
    const payload = buildInvoicePayload(editor);

    expect(editor.client.name).toBe("Cliente Demo");
    expect(payload.invoiceInput.clientName).toBe("Cliente Demo");
    expect(payload.invoiceInput.invoiceData.concepts.length).toBeGreaterThan(0);
  });

  it("mapea quote a editor y reconstruye payload", () => {
    const editor = mapQuoteToDocumentEditor(buildQuoteFixture());
    const payload = buildQuotePayload(editor);

    expect(editor.meta.series).toBe("P");
    expect(payload.quoteInput.quoteSeries).toBe("P");
    expect(payload.quoteInput.quoteData.paymentMethods.length).toBe(1);
  });
});
