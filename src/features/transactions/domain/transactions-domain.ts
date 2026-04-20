import type { Transaction, TransactionCategory, TransactionType } from "../../../shared/types/domain";

export type TransactionOrigin = "manual" | "invoice";

export interface TransactionLedgerItem extends Transaction {
  clientName: string | null;
  clientIdentifier: string | null;
  origin: TransactionOrigin;
  lockedByInvoice: boolean;
}

export const TRANSACTION_CATEGORY_LABELS: Record<TransactionCategory, string> = {
  material_oficina: "Material de oficina",
  servicios_profesionales: "Servicios profesionales",
  suministros: "Suministros",
  alquiler: "Alquiler",
  transporte: "Transporte",
  marketing: "Marketing",
  otros: "Otros",
  factura: "Factura",
};

export function formatTransactionCategory(category: TransactionCategory): string {
  return TRANSACTION_CATEGORY_LABELS[category] ?? category;
}

export function formatTransactionType(type: TransactionType): string {
  return type === "ingreso" ? "Ingreso" : "Gasto";
}

export function resolveTransactionOrigin(transaction: Pick<Transaction, "invoiceId" | "categoria">): TransactionOrigin {
  if (transaction.invoiceId || transaction.categoria === "factura") {
    return "invoice";
  }
  return "manual";
}

export function isInvoiceLinkedTransaction(transaction: Pick<Transaction, "invoiceId" | "categoria">): boolean {
  return resolveTransactionOrigin(transaction) === "invoice";
}

export function canMutateTransaction(transaction: Pick<Transaction, "invoiceId" | "categoria">): boolean {
  return !isInvoiceLinkedTransaction(transaction);
}

export function toTransactionLedgerItem(
  transaction: Transaction,
  options: {
    clientName?: string | null;
    clientIdentifier?: string | null;
  } = {},
): TransactionLedgerItem {
  const origin = resolveTransactionOrigin(transaction);
  return {
    ...transaction,
    clientName: options.clientName ?? null,
    clientIdentifier: options.clientIdentifier ?? null,
    origin,
    lockedByInvoice: origin === "invoice",
  };
}
