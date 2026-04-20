import { describe, expect, it } from "vitest";
import type { Transaction } from "../../../../shared/types/domain";
import {
  canMutateTransaction,
  formatTransactionCategory,
  formatTransactionType,
  isInvoiceLinkedTransaction,
  resolveTransactionOrigin,
  toTransactionLedgerItem,
} from "../transactions-domain";

function buildTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: "tx-1",
    userId: "user-1",
    clienteId: null,
    importe: 120,
    concepto: "Hosting anual",
    fecha: "2026-03-11",
    categoria: "servicios_profesionales",
    tipo: "gasto",
    observaciones: null,
    ivaPorcentaje: null,
    irpfPorcentaje: null,
    invoiceId: null,
    createdAt: "2026-03-11T10:00:00.000Z",
    updatedAt: "2026-03-11T10:00:00.000Z",
    ...overrides,
  };
}

describe("transactions-domain", () => {
  it("marca origen invoice cuando existe invoiceId", () => {
    const tx = buildTransaction({ invoiceId: "inv-1", categoria: "factura", tipo: "ingreso" });
    expect(resolveTransactionOrigin(tx)).toBe("invoice");
    expect(isInvoiceLinkedTransaction(tx)).toBe(true);
    expect(canMutateTransaction(tx)).toBe(false);
  });

  it("marca origen invoice cuando categoria=factura aunque invoiceId sea null", () => {
    const tx = buildTransaction({ categoria: "factura", invoiceId: null, tipo: "ingreso" });
    expect(resolveTransactionOrigin(tx)).toBe("invoice");
    expect(canMutateTransaction(tx)).toBe(false);
  });

  it("mantiene origen manual para transacciones normales", () => {
    const tx = buildTransaction({ categoria: "marketing", invoiceId: null });
    expect(resolveTransactionOrigin(tx)).toBe("manual");
    expect(isInvoiceLinkedTransaction(tx)).toBe(false);
    expect(canMutateTransaction(tx)).toBe(true);
  });

  it("hidrata item de ledger con metadatos de cliente", () => {
    const tx = buildTransaction({ categoria: "otros" });
    const ledger = toTransactionLedgerItem(tx, {
      clientName: "Acme SL",
      clientIdentifier: "B12345678",
    });

    expect(ledger.clientName).toBe("Acme SL");
    expect(ledger.clientIdentifier).toBe("B12345678");
    expect(ledger.lockedByInvoice).toBe(false);
  });

  it("formatea etiquetas visibles", () => {
    expect(formatTransactionCategory("material_oficina")).toBe("Material de oficina");
    expect(formatTransactionType("ingreso")).toBe("Ingreso");
    expect(formatTransactionType("gasto")).toBe("Gasto");
  });
});
