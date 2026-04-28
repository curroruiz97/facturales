import { clientsRepository, transactionsRepository } from "../../../services/repositories";
import type {
  CreateTransactionInput,
  TransactionFilters,
  UpdateTransactionInput,
} from "../../../services/repositories/transactions.repository";
import type { Client, Transaction, TransactionCategory, TransactionType } from "../../../shared/types/domain";
import { fail, ok, type ServiceResult } from "../../../shared/types/service-result";
import { canMutateTransaction, toTransactionLedgerItem, type TransactionLedgerItem } from "../domain/transactions-domain";

export type { TransactionLedgerItem } from "../domain/transactions-domain";

export interface TransactionClientOption {
  id: string;
  name: string;
  identifier: string;
  /** Rol del contacto (usado para auto-sugerir categoría al crear transacciones). */
  rol: import("../../../shared/types/domain").ClientRol;
}

export interface TransactionsAdapterFilters {
  search?: string;
  minAmount?: number;
  maxAmount?: number;
  startDate?: string;
  endDate?: string;
  tipo?: "all" | TransactionType;
  categoria?: "all" | TransactionCategory;
}

export interface TransactionsBulkDeleteSummary {
  deleted: number;
  failed: number;
  locked: number;
  failedIds: string[];
}

export interface TransactionsAdapter {
  loadTransactions(filters?: TransactionsAdapterFilters): Promise<ServiceResult<TransactionLedgerItem[]>>;
  loadClients(searchTerm?: string): Promise<ServiceResult<TransactionClientOption[]>>;
  createTransaction(
    input: Omit<CreateTransactionInput, "invoiceId"> & {
      categoria: Exclude<TransactionCategory, "factura">;
    },
  ): Promise<ServiceResult<TransactionLedgerItem>>;
  updateTransaction(
    transactionId: string,
    input: Omit<UpdateTransactionInput, "invoiceId"> & {
      categoria?: Exclude<TransactionCategory, "factura">;
    },
  ): Promise<ServiceResult<TransactionLedgerItem>>;
  deleteTransaction(transactionId: string): Promise<ServiceResult<null>>;
  deleteTransactions(transactionIds: string[]): Promise<ServiceResult<TransactionsBulkDeleteSummary>>;
}

interface ClientLookup {
  name: string;
  identifier: string;
}

function toClientLookup(clients: Client[]): Map<string, ClientLookup> {
  return new Map(
    clients.map((client) => [
      client.id,
      {
        name: client.nombreRazonSocial,
        identifier: client.identificador,
      },
    ]),
  );
}

function mapLedgerTransactions(transactions: Transaction[], lookup: Map<string, ClientLookup>): TransactionLedgerItem[] {
  return transactions.map((transaction) => {
    const client = transaction.clienteId ? lookup.get(transaction.clienteId) : null;
    return toTransactionLedgerItem(transaction, {
      clientName: client?.name ?? null,
      clientIdentifier: client?.identifier ?? null,
    });
  });
}

function normalizeSearch(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

function includesSearch(ledger: TransactionLedgerItem, search: string): boolean {
  if (!search) return true;
  const concept = ledger.concepto.toLowerCase();
  const clientName = ledger.clientName?.toLowerCase() ?? "";
  const clientIdentifier = ledger.clientIdentifier?.toLowerCase() ?? "";
  return concept.includes(search) || clientName.includes(search) || clientIdentifier.includes(search);
}

function buildRepositoryFilters(filters: TransactionsAdapterFilters): TransactionFilters {
  const result: TransactionFilters = {};
  if (filters.minAmount !== undefined) result.minAmount = filters.minAmount;
  if (filters.maxAmount !== undefined) result.maxAmount = filters.maxAmount;
  if (filters.startDate) result.startDate = filters.startDate;
  if (filters.endDate) result.endDate = filters.endDate;
  if (filters.tipo && filters.tipo !== "all") result.tipo = filters.tipo;
  if (filters.categoria && filters.categoria !== "all") result.categoria = filters.categoria;
  return result;
}

function validateManualTransactionPayload(input: { categoria?: TransactionCategory; invoiceId?: string | null }): ServiceResult<null> {
  if (input.invoiceId) {
    return fail("Las transacciones manuales no pueden vincularse a una factura.", "VALIDATION_TRANSACTION_INVOICE_LINK_BLOCKED");
  }
  if (input.categoria === "factura") {
    return fail("No se pueden crear ni editar transacciones manuales con categoria Factura.", "VALIDATION_TRANSACTION_FACTURA_BLOCKED");
  }
  return ok(null);
}

export class DefaultTransactionsAdapter implements TransactionsAdapter {
  async loadTransactions(filters: TransactionsAdapterFilters = {}): Promise<ServiceResult<TransactionLedgerItem[]>> {
    const [transactionsResult, clientsResult] = await Promise.all([
      transactionsRepository.list(buildRepositoryFilters(filters)),
      clientsRepository.list(""),
    ]);

    if (!transactionsResult.success) {
      return fail(transactionsResult.error.message, transactionsResult.error.code, transactionsResult.error.cause);
    }
    if (!clientsResult.success) {
      return fail(clientsResult.error.message, clientsResult.error.code, clientsResult.error.cause);
    }

    const lookup = toClientLookup(clientsResult.data);
    const ledgerItems = mapLedgerTransactions(transactionsResult.data, lookup);
    const search = normalizeSearch(filters.search);
    const filtered = ledgerItems.filter((item) => includesSearch(item, search));
    return ok(filtered);
  }

  async loadClients(searchTerm = ""): Promise<ServiceResult<TransactionClientOption[]>> {
    const clientsResult = await clientsRepository.list(searchTerm);
    if (!clientsResult.success) {
      return fail(clientsResult.error.message, clientsResult.error.code, clientsResult.error.cause);
    }
    return ok(
      clientsResult.data.map((client) => ({
        id: client.id,
        name: client.nombreRazonSocial,
        identifier: client.identificador,
        rol: client.rol,
      })),
    );
  }

  async createTransaction(
    input: Omit<CreateTransactionInput, "invoiceId"> & {
      categoria: Exclude<TransactionCategory, "factura">;
    },
  ): Promise<ServiceResult<TransactionLedgerItem>> {
    const validation = validateManualTransactionPayload(input);
    if (!validation.success) return validation;

    const created = await transactionsRepository.create({ ...input, invoiceId: null });
    if (!created.success) return fail(created.error.message, created.error.code, created.error.cause);

    const lookupResult = await this.loadClients("");
    if (!lookupResult.success) return fail(lookupResult.error.message, lookupResult.error.code, lookupResult.error.cause);
    const lookup = new Map(lookupResult.data.map((client) => [client.id, client]));
    const selectedClient = created.data.clienteId ? lookup.get(created.data.clienteId) : null;

    return ok(
      toTransactionLedgerItem(created.data, {
        clientName: selectedClient?.name ?? null,
        clientIdentifier: selectedClient?.identifier ?? null,
      }),
    );
  }

  async updateTransaction(
    transactionId: string,
    input: Omit<UpdateTransactionInput, "invoiceId"> & {
      categoria?: Exclude<TransactionCategory, "factura">;
    },
  ): Promise<ServiceResult<TransactionLedgerItem>> {
    const current = await transactionsRepository.getById(transactionId);
    if (!current.success) return fail(current.error.message, current.error.code, current.error.cause);
    if (!current.data) return fail("No se encontro la transaccion", "TRANSACTION_NOT_FOUND");
    if (!canMutateTransaction(current.data)) {
      return fail(
        "Las transacciones generadas por factura solo se gestionan desde la propia factura.",
        "VALIDATION_TRANSACTION_INVOICE_LOCKED",
      );
    }

    const validation = validateManualTransactionPayload(input);
    if (!validation.success) return validation;

    const updated = await transactionsRepository.update(transactionId, input);
    if (!updated.success) return fail(updated.error.message, updated.error.code, updated.error.cause);

    let clientName: string | null = null;
    let clientIdentifier: string | null = null;
    if (updated.data.clienteId) {
      const clientResult = await clientsRepository.getById(updated.data.clienteId);
      if (clientResult.success && clientResult.data) {
        clientName = clientResult.data.nombreRazonSocial;
        clientIdentifier = clientResult.data.identificador;
      }
    }

    return ok(
      toTransactionLedgerItem(updated.data, {
        clientName,
        clientIdentifier,
      }),
    );
  }

  async deleteTransaction(transactionId: string): Promise<ServiceResult<null>> {
    const current = await transactionsRepository.getById(transactionId);
    if (!current.success) return fail(current.error.message, current.error.code, current.error.cause);
    if (!current.data) return fail("No se encontro la transaccion", "TRANSACTION_NOT_FOUND");
    if (!canMutateTransaction(current.data)) {
      return fail(
        "Las transacciones generadas por factura no se pueden eliminar manualmente.",
        "VALIDATION_TRANSACTION_INVOICE_LOCKED",
      );
    }
    return transactionsRepository.remove(transactionId);
  }

  async deleteTransactions(transactionIds: string[]): Promise<ServiceResult<TransactionsBulkDeleteSummary>> {
    if (transactionIds.length === 0) {
      return fail("No hay transacciones seleccionadas", "VALIDATION_TRANSACTIONS_BULK_EMPTY");
    }

    let deleted = 0;
    let failed = 0;
    let locked = 0;
    const failedIds: string[] = [];

    for (const transactionId of transactionIds) {
      const current = await transactionsRepository.getById(transactionId);
      if (!current.success || !current.data) {
        failed += 1;
        failedIds.push(transactionId);
        continue;
      }

      if (!canMutateTransaction(current.data)) {
        locked += 1;
        failed += 1;
        failedIds.push(transactionId);
        continue;
      }

      const removed = await transactionsRepository.remove(transactionId);
      if (removed.success) deleted += 1;
      else {
        failed += 1;
        failedIds.push(transactionId);
      }
    }

    return ok({ deleted, failed, locked, failedIds });
  }
}

export const transactionsAdapter = new DefaultTransactionsAdapter();
