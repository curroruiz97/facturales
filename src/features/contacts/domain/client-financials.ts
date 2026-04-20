import type { Client, Invoice, Transaction } from "../../../shared/types/domain";

export interface ClientFinancialSnapshot extends Client {
  totalFacturado: number;
  totalGastos: number;
  balance: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeKey(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().toUpperCase();
}

function normalizeName(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function readFirstString(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

export function extractLegacyInvoiceIdentifier(invoice: Invoice): string | null {
  const payload = invoice.invoiceData as unknown;
  if (!isRecord(payload)) return null;

  const client = payload.client;
  if (!isRecord(client)) return null;

  const rawIdentifier = readFirstString(client, ["nif", "cif", "identificador", "dni", "tax_id", "taxId", "vat"]);
  if (!rawIdentifier) return null;
  return normalizeKey(rawIdentifier) || null;
}

export function buildClientFinancialSnapshots(params: {
  clients: Client[];
  invoices: Invoice[];
  transactions: Transaction[];
}): ClientFinancialSnapshot[] {
  const { clients, invoices, transactions } = params;

  const identifierToClientId = new Map<string, string>();
  const nameToClientId = new Map<string, string>();

  for (const client of clients) {
    const normalizedIdentifier = normalizeKey(client.identificador);
    if (normalizedIdentifier) {
      identifierToClientId.set(normalizedIdentifier, client.id);
    }

    const normalizedName = normalizeName(client.nombreRazonSocial);
    if (normalizedName) {
      nameToClientId.set(normalizedName, client.id);
    }
  }

  const billedByClientId = new Map<string, number>();
  const expenseByClientId = new Map<string, number>();

  for (const invoice of invoices) {
    if (invoice.status !== "issued" || !invoice.isPaid) continue;

    let resolvedClientId = invoice.clientId;

    if (!resolvedClientId) {
      const legacyIdentifier = extractLegacyInvoiceIdentifier(invoice);
      if (legacyIdentifier) {
        resolvedClientId = identifierToClientId.get(legacyIdentifier) ?? null;
      }
    }

    if (!resolvedClientId) {
      const normalizedClientName = normalizeName(invoice.clientName);
      resolvedClientId = normalizedClientName ? (nameToClientId.get(normalizedClientName) ?? null) : null;
    }

    if (!resolvedClientId) continue;

    const current = billedByClientId.get(resolvedClientId) ?? 0;
    billedByClientId.set(resolvedClientId, current + Number(invoice.totalAmount || 0));
  }

  for (const transaction of transactions) {
    if (transaction.tipo !== "gasto" || !transaction.clienteId) continue;
    const current = expenseByClientId.get(transaction.clienteId) ?? 0;
    expenseByClientId.set(transaction.clienteId, current + Number(transaction.importe || 0));
  }

  return clients.map((client) => {
    const totalFacturado = billedByClientId.get(client.id) ?? 0;
    const totalGastos = expenseByClientId.get(client.id) ?? 0;
    return {
      ...client,
      totalFacturado,
      totalGastos,
      balance: totalFacturado - totalGastos,
    };
  });
}

