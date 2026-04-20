import { billingLimitsService } from "../../../services/billing-limits/billing-limits.service";
import { onboardingService } from "../../../services/onboarding/onboarding.service";
import {
  clientsRepository,
  invoicesRepository,
  transactionsRepository,
} from "../../../services/repositories";
import type { CreateClientInput, UpdateClientInput } from "../../../services/repositories/clients.repository";
import { getCurrentUserId } from "../../../services/supabase/client";
import { fail, ok, type ServiceResult } from "../../../shared/types/service-result";
import type { ContactImportRowResult } from "../domain/contacts-import";
import { buildClientFinancialSnapshots, type ClientFinancialSnapshot } from "../domain/client-financials";

export type { ClientFinancialSnapshot } from "../domain/client-financials";

export interface ContactsUsageBadge {
  current: number;
  limit: number;
  planName: string;
}

export interface ContactsBulkDeleteSummary {
  deleted: number;
  failed: number;
  failedIds: string[];
}

export interface ContactsImportSummary {
  insertedCount: number;
  skippedDuplicates: number;
  errorRows: Array<{ row: number; identificador: string; reason: string }>;
}

export interface ContactsAdapter {
  loadContacts(searchTerm?: string): Promise<ServiceResult<ClientFinancialSnapshot[]>>;
  loadUsageBadge(): Promise<ServiceResult<ContactsUsageBadge | null>>;
  createContact(input: CreateClientInput): Promise<ServiceResult<ClientFinancialSnapshot>>;
  updateContact(contactId: string, input: UpdateClientInput): Promise<ServiceResult<ClientFinancialSnapshot>>;
  deleteContact(contactId: string): Promise<ServiceResult<null>>;
  deleteContacts(contactIds: string[]): Promise<ServiceResult<ContactsBulkDeleteSummary>>;
  importContacts(rows: ContactImportRowResult[]): Promise<ServiceResult<ContactsImportSummary>>;
}

function normalizeIdentifier(identifier: string): string {
  return identifier.trim().toUpperCase();
}

export class DefaultContactsAdapter implements ContactsAdapter {
  async loadContacts(searchTerm = ""): Promise<ServiceResult<ClientFinancialSnapshot[]>> {
    const [clientsResult, invoicesResult, transactionsResult] = await Promise.all([
      clientsRepository.list(searchTerm),
      invoicesRepository.list({ status: "issued" }),
      transactionsRepository.list({ tipo: "gasto" }),
    ]);

    if (!clientsResult.success) return fail(clientsResult.error.message, clientsResult.error.code, clientsResult.error.cause);
    if (!invoicesResult.success) return fail(invoicesResult.error.message, invoicesResult.error.code, invoicesResult.error.cause);
    if (!transactionsResult.success) {
      return fail(transactionsResult.error.message, transactionsResult.error.code, transactionsResult.error.cause);
    }

    return ok(
      buildClientFinancialSnapshots({
        clients: clientsResult.data,
        invoices: invoicesResult.data,
        transactions: transactionsResult.data,
      }),
    );
  }

  async loadUsageBadge(): Promise<ServiceResult<ContactsUsageBadge | null>> {
    const usageResult = await billingLimitsService.getUsage();
    if (!usageResult.success) return fail(usageResult.error.message, usageResult.error.code, usageResult.error.cause);
    if (!usageResult.data) return ok(null);

    return ok({
      current: usageResult.data.usage.clients,
      limit: usageResult.data.limits.clients,
      planName: usageResult.data.planName,
    });
  }

  async createContact(input: CreateClientInput): Promise<ServiceResult<ClientFinancialSnapshot>> {
    const limitResult = await billingLimitsService.canCreateClient();
    if (!limitResult.success) return fail(limitResult.error.message, limitResult.error.code, limitResult.error.cause);
    if (!limitResult.data.allowed) return fail(limitResult.data.reason ?? "Limite de plan alcanzado", "BILLING_LIMIT_CLIENTS_BLOCKED");

    const created = await clientsRepository.create(input);
    if (!created.success) return created;

    const userId = await getCurrentUserId();
    if (userId) {
      await onboardingService.updateStep(userId, 2, true);
    }

    return ok({ ...created.data, totalFacturado: 0, totalGastos: 0, balance: 0 });
  }

  async updateContact(contactId: string, input: UpdateClientInput): Promise<ServiceResult<ClientFinancialSnapshot>> {
    const updated = await clientsRepository.update(contactId, input);
    if (!updated.success) return updated;
    return ok({ ...updated.data, totalFacturado: 0, totalGastos: 0, balance: 0 });
  }

  async deleteContact(contactId: string): Promise<ServiceResult<null>> {
    return clientsRepository.remove(contactId);
  }

  async deleteContacts(contactIds: string[]): Promise<ServiceResult<ContactsBulkDeleteSummary>> {
    if (contactIds.length === 0) return fail("No hay contactos seleccionados", "VALIDATION_CONTACTS_BULK_EMPTY");

    let deleted = 0;
    let failed = 0;
    const failedIds: string[] = [];

    for (const id of contactIds) {
      const result = await clientsRepository.remove(id);
      if (result.success) deleted += 1;
      else {
        failed += 1;
        failedIds.push(id);
      }
    }

    return ok({ deleted, failed, failedIds });
  }

  async importContacts(rows: ContactImportRowResult[]): Promise<ServiceResult<ContactsImportSummary>> {
    if (rows.length === 0) return fail("No hay filas para importar", "VALIDATION_CONTACTS_IMPORT_EMPTY");

    const usageResult = await this.loadUsageBadge();
    if (!usageResult.success) return fail(usageResult.error.message, usageResult.error.code, usageResult.error.cause);
    if (usageResult.data && usageResult.data.limit !== Number.POSITIVE_INFINITY) {
      const remaining = usageResult.data.limit - usageResult.data.current;
      if (remaining <= 0) {
        return fail(`Has alcanzado el limite de ${usageResult.data.limit} clientes del plan ${usageResult.data.planName}.`, "BILLING_LIMIT_CLIENTS_BLOCKED");
      }
      if (rows.length > remaining) {
        return fail(
          `Solo puedes importar ${remaining} contacto(s) con tu plan actual (${usageResult.data.current}/${usageResult.data.limit}).`,
          "BILLING_LIMIT_CLIENTS_IMPORT_EXCEEDED",
        );
      }
    }

    const existingContacts = await clientsRepository.list("");
    if (!existingContacts.success) return fail(existingContacts.error.message, existingContacts.error.code, existingContacts.error.cause);

    const knownIdentifiers = new Set(existingContacts.data.map((contact) => normalizeIdentifier(contact.identificador)));
    let insertedCount = 0;
    let skippedDuplicates = 0;
    const errorRows: Array<{ row: number; identificador: string; reason: string }> = [];

    for (const row of rows) {
      const identifier = normalizeIdentifier(row.data.identificador);
      if (knownIdentifiers.has(identifier)) {
        skippedDuplicates += 1;
        continue;
      }

      const created = await clientsRepository.create(row.data);
      if (created.success) {
        insertedCount += 1;
        knownIdentifiers.add(identifier);
      } else {
        errorRows.push({
          row: row.rowIndex,
          identificador: row.data.identificador,
          reason: created.error.message,
        });
      }
    }

    if (insertedCount > 0) {
      const userId = await getCurrentUserId();
      if (userId) {
        await onboardingService.updateStep(userId, 2, true);
      }
    }

    return ok({
      insertedCount,
      skippedDuplicates,
      errorRows,
    });
  }
}

export const contactsAdapter = new DefaultContactsAdapter();
