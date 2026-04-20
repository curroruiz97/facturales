import { describe, expect, it } from "vitest";
import type { Client, Invoice, Transaction } from "../../../../shared/types/domain";
import { buildClientFinancialSnapshots, extractLegacyInvoiceIdentifier } from "../client-financials";

function createClient(partial: Partial<Client> = {}): Client {
  return {
    id: partial.id ?? "client-1",
    userId: partial.userId ?? "user-1",
    nombreRazonSocial: partial.nombreRazonSocial ?? "Acme SL",
    identificador: partial.identificador ?? "B12345678",
    tipoCliente: partial.tipoCliente ?? "empresa",
    email: partial.email ?? null,
    telefono: partial.telefono ?? null,
    direccion: partial.direccion ?? null,
    codigoPostal: partial.codigoPostal ?? null,
    ciudad: partial.ciudad ?? null,
    provincia: partial.provincia ?? null,
    pais: partial.pais ?? null,
    diaFacturacion: partial.diaFacturacion ?? null,
    estado: partial.estado ?? "activo",
    createdAt: partial.createdAt ?? "2026-03-01T10:00:00.000Z",
    updatedAt: partial.updatedAt ?? "2026-03-01T10:00:00.000Z",
  };
}

function createInvoice(partial: Partial<Invoice> = {}): Invoice {
  return {
    id: partial.id ?? "inv-1",
    userId: partial.userId ?? "user-1",
    invoiceNumber: partial.invoiceNumber ?? null,
    invoiceSeries: partial.invoiceSeries ?? "A",
    clientId: partial.clientId ?? null,
    clientName: partial.clientName ?? "Acme SL",
    issueDate: partial.issueDate ?? "2026-03-01",
    dueDate: partial.dueDate ?? null,
    subtotal: partial.subtotal ?? 100,
    taxAmount: partial.taxAmount ?? 21,
    totalAmount: partial.totalAmount ?? 121,
    currency: partial.currency ?? "EUR",
    status: partial.status ?? "issued",
    isPaid: partial.isPaid ?? true,
    paidAt: partial.paidAt ?? "2026-03-03T00:00:00.000Z",
    invoiceData:
      partial.invoiceData ??
      ({
        issuer: {},
        client: { nif: "B12345678" },
        invoice: {},
        concepts: [],
        expenses: [],
        taxSettings: {},
        paymentMethods: [],
        observations: "",
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
          paid: 121,
          totalToPay: 0,
        },
      } as Invoice["invoiceData"]),
    createdAt: partial.createdAt ?? "2026-03-01T10:00:00.000Z",
    updatedAt: partial.updatedAt ?? "2026-03-01T10:00:00.000Z",
  };
}

function createTransaction(partial: Partial<Transaction> = {}): Transaction {
  return {
    id: partial.id ?? "tr-1",
    userId: partial.userId ?? "user-1",
    clienteId: partial.clienteId ?? "client-1",
    importe: partial.importe ?? 35,
    concepto: partial.concepto ?? "Material",
    fecha: partial.fecha ?? "2026-03-02",
    categoria: partial.categoria ?? "material_oficina",
    tipo: partial.tipo ?? "gasto",
    observaciones: partial.observaciones ?? null,
    ivaPorcentaje: partial.ivaPorcentaje ?? null,
    irpfPorcentaje: partial.irpfPorcentaje ?? null,
    invoiceId: partial.invoiceId ?? null,
    createdAt: partial.createdAt ?? "2026-03-02T10:00:00.000Z",
    updatedAt: partial.updatedAt ?? "2026-03-02T10:00:00.000Z",
  };
}

describe("client-financials", () => {
  it("extrae identificador legacy desde invoice_data.client", () => {
    const invoice = createInvoice({
      invoiceData: {
        issuer: {},
        client: { nif: "b12345678" },
        invoice: {},
        concepts: [],
        expenses: [],
        taxSettings: {},
        paymentMethods: [],
        observations: "",
        summary: {
          subtotal: 0,
          discount: 0,
          taxBase: 0,
          taxRate: 0,
          taxAmount: 0,
          reRate: 0,
          reAmount: 0,
          retentionRate: 0,
          retentionAmount: 0,
          expenses: 0,
          total: 0,
          paid: 0,
          totalToPay: 0,
        },
      },
    });

    expect(extractLegacyInvoiceIdentifier(invoice)).toBe("B12345678");
  });

  it("acumula facturacion por client_id y gastos por transacciones", () => {
    const clients = [createClient({ id: "client-1", identificador: "B12345678" })];
    const invoices = [createInvoice({ clientId: "client-1", totalAmount: 200 }), createInvoice({ clientId: "client-1", totalAmount: 55 })];
    const transactions = [createTransaction({ clienteId: "client-1", importe: 80 }), createTransaction({ clienteId: "client-1", importe: 20 })];

    const snapshot = buildClientFinancialSnapshots({ clients, invoices, transactions })[0];
    expect(snapshot.totalFacturado).toBe(255);
    expect(snapshot.totalGastos).toBe(100);
    expect(snapshot.balance).toBe(155);
  });

  it("resuelve facturas legacy sin client_id por identificador", () => {
    const clients = [createClient({ id: "client-legacy", identificador: "X9999999Z" })];
    const invoices = [createInvoice({ clientId: null, totalAmount: 333, invoiceData: { ...createInvoice().invoiceData, client: { nif: "X9999999Z" } } })];
    const transactions: Transaction[] = [];

    const snapshot = buildClientFinancialSnapshots({ clients, invoices, transactions })[0];
    expect(snapshot.totalFacturado).toBe(333);
  });

  it("ignora facturas no emitidas o no pagadas", () => {
    const clients = [createClient({ id: "client-1" })];
    const invoices = [
      createInvoice({ clientId: "client-1", status: "draft", totalAmount: 100 }),
      createInvoice({ clientId: "client-1", isPaid: false, totalAmount: 200 }),
      createInvoice({ clientId: "client-1", status: "issued", isPaid: true, totalAmount: 50 }),
    ];

    const snapshot = buildClientFinancialSnapshots({ clients, invoices, transactions: [] })[0];
    expect(snapshot.totalFacturado).toBe(50);
  });
});

