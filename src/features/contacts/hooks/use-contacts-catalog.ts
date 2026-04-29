import { useEffect, useMemo, useState } from "react";
import type { ClientKind, ClientStatus } from "../../../shared/types/domain";
import type { CreateClientInput, UpdateClientInput } from "../../../services/repositories/clients.repository";
import type { ContactImportRowResult } from "../domain/contacts-import";
import {
  contactsAdapter,
  type ClientFinancialSnapshot,
  type ContactsImportSummary,
  type ContactsUsageBadge,
} from "../adapters/contacts.adapter";

const SEARCH_DEBOUNCE_MS = 280;
export const CONTACT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
export type ContactPageSize = typeof CONTACT_PAGE_SIZE_OPTIONS[number];
const DEFAULT_PAGE_SIZE: ContactPageSize = 10;

export type ContactsSortMode = "name-asc" | "name-desc" | "billing-desc" | "balance-desc";

export interface UseContactsCatalogResult {
  contacts: ClientFinancialSnapshot[];
  pageContacts: ClientFinancialSnapshot[];
  loading: boolean;
  saving: boolean;
  deleting: boolean;
  importing: boolean;
  error: string | null;
  usageError: string | null;
  usageBadge: ContactsUsageBadge | null;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  statusFilter: "all" | ClientStatus;
  setStatusFilter: (value: "all" | ClientStatus) => void;
  typeFilter: "all" | ClientKind;
  setTypeFilter: (value: "all" | ClientKind) => void;
  sortMode: ContactsSortMode;
  setSortMode: (value: ContactsSortMode) => void;
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: ContactPageSize;
  setPageSize: (value: ContactPageSize) => void;
  setPage: (value: number) => void;
  selectedIds: Set<string>;
  selectedCount: number;
  toggleSelected: (contactId: string, checked: boolean) => void;
  togglePageSelection: (checked: boolean, contactIds?: string[]) => void;
  clearSelection: () => void;
  refresh: () => Promise<void>;
  createContact: (input: CreateClientInput) => Promise<boolean>;
  updateContact: (contactId: string, input: UpdateClientInput) => Promise<boolean>;
  toggleContactRecurring: (contactId: string, currentStatus: ClientStatus) => Promise<boolean>;
  deleteContact: (contactId: string) => Promise<boolean>;
  deleteSelectedContacts: () => Promise<{ deleted: number; failed: number } | null>;
  importContacts: (rows: ContactImportRowResult[]) => Promise<ContactsImportSummary | null>;
}

/**
 * Comparador alfabético español case-insensitive y acento-insensitive.
 * Garantiza que "ÁVILA", "Ávila" y "ávila" se ordenen como "ávila", evitando
 * que las mayúsculas/minúsculas mezclen el orden visual (ej. "Hubspot" antes
 * que "RENFE" porque la H minúscula tiene un código mayor que R mayúscula).
 */
function compareNamesEs(a: string, b: string): number {
  return a.localeCompare(b, "es", { sensitivity: "base" });
}

function applySort(data: ClientFinancialSnapshot[], sortMode: ContactsSortMode): ClientFinancialSnapshot[] {
  const sorted = [...data];
  // Sort estable: usamos el id como tiebreaker para que dos contactos con el
  // mismo nombre mantengan siempre el mismo orden relativo.
  switch (sortMode) {
    case "name-desc":
      sorted.sort((a, b) => {
        const cmp = compareNamesEs(b.nombreRazonSocial, a.nombreRazonSocial);
        return cmp !== 0 ? cmp : a.id.localeCompare(b.id);
      });
      return sorted;
    case "billing-desc":
      sorted.sort((a, b) => {
        const diff = b.totalFacturado - a.totalFacturado;
        return diff !== 0 ? diff : compareNamesEs(a.nombreRazonSocial, b.nombreRazonSocial);
      });
      return sorted;
    case "balance-desc":
      sorted.sort((a, b) => {
        const diff = b.balance - a.balance;
        return diff !== 0 ? diff : compareNamesEs(a.nombreRazonSocial, b.nombreRazonSocial);
      });
      return sorted;
    default:
      // "name-asc" — A→Z respetando el alfabeto español.
      sorted.sort((a, b) => {
        const cmp = compareNamesEs(a.nombreRazonSocial, b.nombreRazonSocial);
        return cmp !== 0 ? cmp : a.id.localeCompare(b.id);
      });
      return sorted;
  }
}

export function useContactsCatalog(initialPageSize: ContactPageSize = DEFAULT_PAGE_SIZE): UseContactsCatalogResult {
  const [contacts, setContacts] = useState<ClientFinancialSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usageError, setUsageError] = useState<string | null>(null);
  const [usageBadge, setUsageBadge] = useState<ContactsUsageBadge | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ClientStatus>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | ClientKind>("all");
  const [sortMode, setSortMode] = useState<ContactsSortMode>("name-asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<ContactPageSize>(initialPageSize);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredContacts = useMemo(() => {
    let next = contacts;
    if (statusFilter !== "all") {
      next = next.filter((contact) => contact.estado === statusFilter);
    }
    if (typeFilter !== "all") {
      next = next.filter((contact) => contact.tipoCliente === typeFilter);
    }
    return applySort(next, sortMode);
  }, [contacts, sortMode, statusFilter, typeFilter]);

  const totalPages = useMemo(() => {
    const pages = Math.ceil(filteredContacts.length / pageSize);
    return pages <= 0 ? 1 : pages;
  }, [filteredContacts.length, pageSize]);

  const pageContacts = useMemo(() => {
    const clampedPage = Math.min(page, totalPages);
    const start = (clampedPage - 1) * pageSize;
    return filteredContacts.slice(start, start + pageSize);
  }, [filteredContacts, page, pageSize, totalPages]);

  const loadUsageBadge = async () => {
    const result = await contactsAdapter.loadUsageBadge();
    if (!result.success) {
      setUsageError(result.error.message);
      setUsageBadge(null);
      return;
    }
    setUsageBadge(result.data);
    setUsageError(null);
  };

  const loadContacts = async (query = "") => {
    setLoading(true);
    const result = await contactsAdapter.loadContacts(query);
    if (!result.success) {
      setContacts([]);
      setError(result.error.message);
      setLoading(false);
      return;
    }
    setContacts(result.data);
    setError(null);
    setLoading(false);
  };

  const refresh = async () => {
    await Promise.all([loadContacts(searchTerm), loadUsageBadge()]);
  };

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setPage(1);
      setSelectedIds(new Set());
      void loadContacts(searchTerm);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [searchTerm]);

  useEffect(() => {
    if (page <= totalPages) return;
    setPage(totalPages);
  }, [page, totalPages]);

  // Resetear página y selección al cambiar tamaño de página o filtros que cambian la lista visible.
  useEffect(() => {
    setPage(1);
    setSelectedIds(new Set());
  }, [pageSize, statusFilter, typeFilter, sortMode]);

  const createContact = async (input: CreateClientInput): Promise<boolean> => {
    setSaving(true);
    const result = await contactsAdapter.createContact(input);
    setSaving(false);
    if (!result.success) {
      setError(result.error.message);
      return false;
    }
    await refresh();
    return true;
  };

  const updateContact = async (contactId: string, input: UpdateClientInput): Promise<boolean> => {
    setSaving(true);
    const result = await contactsAdapter.updateContact(contactId, input);
    setSaving(false);
    if (!result.success) {
      setError(result.error.message);
      return false;
    }
    await refresh();
    return true;
  };

  const toggleContactRecurring = async (contactId: string, currentStatus: ClientStatus): Promise<boolean> => {
    const nextStatus: ClientStatus = currentStatus === "recurrente" ? "puntual" : "recurrente";
    return updateContact(contactId, { estado: nextStatus });
  };

  const deleteContact = async (contactId: string): Promise<boolean> => {
    setDeleting(true);
    const result = await contactsAdapter.deleteContact(contactId);
    setDeleting(false);
    if (!result.success) {
      setError(result.error.message);
      return false;
    }

    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(contactId);
      return next;
    });
    await refresh();
    return true;
  };

  const deleteSelectedContacts = async (): Promise<{ deleted: number; failed: number } | null> => {
    const ids = Array.from(selectedIds);
    setDeleting(true);
    const result = await contactsAdapter.deleteContacts(ids);
    setDeleting(false);
    if (!result.success) {
      setError(result.error.message);
      return null;
    }
    setSelectedIds(new Set());
    await refresh();
    return { deleted: result.data.deleted, failed: result.data.failed };
  };

  const importContacts = async (rows: ContactImportRowResult[]): Promise<ContactsImportSummary | null> => {
    setImporting(true);
    const result = await contactsAdapter.importContacts(rows);
    setImporting(false);
    if (!result.success) {
      setError(result.error.message);
      return null;
    }
    await refresh();
    return result.data;
  };

  const toggleSelected = (contactId: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(contactId);
      else next.delete(contactId);
      return next;
    });
  };

  const togglePageSelection = (checked: boolean, contactIds?: string[]) => {
    // Aceptamos los IDs explícitamente desde el componente para evitar capturar
    // un `pageContacts` stale en el closure (causa raíz del bug en el que el
    // header solo marcaba algunos contactos en vez de todos los visibles).
    const ids = contactIds ?? pageContacts.map((contact) => contact.id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  return {
    contacts: filteredContacts,
    pageContacts,
    loading,
    saving,
    deleting,
    importing,
    error,
    usageError,
    usageBadge,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    sortMode,
    setSortMode,
    page,
    totalPages,
    totalItems: filteredContacts.length,
    pageSize,
    setPageSize,
    setPage,
    selectedIds,
    selectedCount: selectedIds.size,
    toggleSelected,
    togglePageSelection,
    clearSelection,
    refresh,
    createContact,
    updateContact,
    toggleContactRecurring,
    deleteContact,
    deleteSelectedContacts,
    importContacts,
  };
}

