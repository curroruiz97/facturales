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
const DEFAULT_PAGE_SIZE = 10;

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
  setPage: (value: number) => void;
  selectedIds: Set<string>;
  selectedCount: number;
  toggleSelected: (contactId: string, checked: boolean) => void;
  togglePageSelection: (checked: boolean) => void;
  clearSelection: () => void;
  refresh: () => Promise<void>;
  createContact: (input: CreateClientInput) => Promise<boolean>;
  updateContact: (contactId: string, input: UpdateClientInput) => Promise<boolean>;
  toggleContactRecurring: (contactId: string, currentStatus: ClientStatus) => Promise<boolean>;
  deleteContact: (contactId: string) => Promise<boolean>;
  deleteSelectedContacts: () => Promise<{ deleted: number; failed: number } | null>;
  importContacts: (rows: ContactImportRowResult[]) => Promise<ContactsImportSummary | null>;
}

function applySort(data: ClientFinancialSnapshot[], sortMode: ContactsSortMode): ClientFinancialSnapshot[] {
  const sorted = [...data];
  switch (sortMode) {
    case "name-desc":
      sorted.sort((a, b) => b.nombreRazonSocial.localeCompare(a.nombreRazonSocial, "es"));
      return sorted;
    case "billing-desc":
      sorted.sort((a, b) => b.totalFacturado - a.totalFacturado);
      return sorted;
    case "balance-desc":
      sorted.sort((a, b) => b.balance - a.balance);
      return sorted;
    default:
      sorted.sort((a, b) => a.nombreRazonSocial.localeCompare(b.nombreRazonSocial, "es"));
      return sorted;
  }
}

export function useContactsCatalog(pageSize = DEFAULT_PAGE_SIZE): UseContactsCatalogResult {
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

  const togglePageSelection = (checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const contact of pageContacts) {
        if (checked) next.add(contact.id);
        else next.delete(contact.id);
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

