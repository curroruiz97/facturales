import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import type { TransactionCategory, TransactionType } from "../../../shared/types/domain";
import { transactionsAdapter, type TransactionClientOption, type TransactionsBulkDeleteSummary } from "../adapters/transactions.adapter";
import type { TransactionLedgerItem } from "../domain/transactions-domain";

const SEARCH_DEBOUNCE_MS = 260;
const DEFAULT_PAGE_SIZE = 10;

export type TransactionsSortMode =
  | "date-desc"
  | "date-asc"
  | "amount-desc"
  | "amount-asc"
  | "concept-asc"
  | "concept-desc"
  | "client-asc"
  | "client-desc";

export interface UseTransactionsLedgerResult {
  transactions: TransactionLedgerItem[];
  pageTransactions: TransactionLedgerItem[];
  clients: TransactionClientOption[];
  loading: boolean;
  clientsLoading: boolean;
  saving: boolean;
  deleting: boolean;
  error: string | null;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  typeFilter: "all" | TransactionType;
  setTypeFilter: (value: "all" | TransactionType) => void;
  categoryFilter: "all" | TransactionCategory;
  setCategoryFilter: (value: "all" | TransactionCategory) => void;
  minAmount: string;
  setMinAmount: (value: string) => void;
  maxAmount: string;
  setMaxAmount: (value: string) => void;
  startDate: string;
  setStartDate: (value: string) => void;
  endDate: string;
  setEndDate: (value: string) => void;
  sortMode: TransactionsSortMode;
  setSortMode: (value: TransactionsSortMode) => void;
  page: number;
  totalPages: number;
  setPage: (value: number) => void;
  selectedIds: Set<string>;
  selectedCount: number;
  highlightedId: string | null;
  clearHighlight: () => void;
  toggleSelected: (transactionId: string, checked: boolean) => void;
  togglePageSelection: (checked: boolean) => void;
  clearSelection: () => void;
  refresh: () => Promise<void>;
  createTransaction: (
    input: {
      clienteId?: string | null;
      concepto: string;
      importe: number;
      fecha: string;
      categoria: Exclude<TransactionCategory, "factura">;
      tipo: TransactionType;
      observaciones?: string | null;
      ivaPorcentaje?: number | null;
      irpfPorcentaje?: number | null;
    },
  ) => Promise<boolean>;
  updateTransaction: (
    transactionId: string,
    input: {
      clienteId?: string | null;
      concepto?: string;
      importe?: number;
      fecha?: string;
      categoria?: Exclude<TransactionCategory, "factura">;
      tipo?: TransactionType;
      observaciones?: string | null;
      ivaPorcentaje?: number | null;
      irpfPorcentaje?: number | null;
    },
  ) => Promise<boolean>;
  deleteTransaction: (transactionId: string) => Promise<boolean>;
  deleteSelectedTransactions: () => Promise<TransactionsBulkDeleteSummary | null>;
}

function parseNumberish(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function sortTransactions(items: TransactionLedgerItem[], sortMode: TransactionsSortMode): TransactionLedgerItem[] {
  const next = [...items];
  switch (sortMode) {
    case "date-asc":
      next.sort((a, b) => a.fecha.localeCompare(b.fecha));
      return next;
    case "amount-desc":
      next.sort((a, b) => b.importe - a.importe);
      return next;
    case "amount-asc":
      next.sort((a, b) => a.importe - b.importe);
      return next;
    case "concept-asc":
      next.sort((a, b) => a.concepto.localeCompare(b.concepto, "es"));
      return next;
    case "concept-desc":
      next.sort((a, b) => b.concepto.localeCompare(a.concepto, "es"));
      return next;
    case "client-asc":
      next.sort((a, b) => (a.clientName ?? "").localeCompare(b.clientName ?? "", "es"));
      return next;
    case "client-desc":
      next.sort((a, b) => (b.clientName ?? "").localeCompare(a.clientName ?? "", "es"));
      return next;
    default:
      next.sort((a, b) => b.fecha.localeCompare(a.fecha));
      return next;
  }
}

export function useTransactionsLedger(pageSize = DEFAULT_PAGE_SIZE): UseTransactionsLedgerResult {
  const location = useLocation();
  const [transactions, setTransactions] = useState<TransactionLedgerItem[]>([]);
  const [clients, setClients] = useState<TransactionClientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | TransactionType>("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | TransactionCategory>("all");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortMode, setSortMode] = useState<TransactionsSortMode>("date-desc");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const sortedTransactions = useMemo(() => sortTransactions(transactions, sortMode), [sortMode, transactions]);

  const totalPages = useMemo(() => {
    const pages = Math.ceil(sortedTransactions.length / pageSize);
    return pages <= 0 ? 1 : pages;
  }, [pageSize, sortedTransactions.length]);

  const pageTransactions = useMemo(() => {
    const clampedPage = Math.min(page, totalPages);
    const start = (clampedPage - 1) * pageSize;
    return sortedTransactions.slice(start, start + pageSize);
  }, [page, pageSize, sortedTransactions, totalPages]);

  const loadClients = async () => {
    setClientsLoading(true);
    const result = await transactionsAdapter.loadClients("");
    setClientsLoading(false);
    if (!result.success) {
      setError(result.error.message);
      setClients([]);
      return;
    }
    setClients(result.data);
  };

  const loadTransactions = async () => {
    setLoading(true);
    const result = await transactionsAdapter.loadTransactions({
      search: searchTerm,
      minAmount: parseNumberish(minAmount),
      maxAmount: parseNumberish(maxAmount),
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      tipo: typeFilter,
      categoria: categoryFilter,
    });

    if (!result.success) {
      setTransactions([]);
      setError(result.error.message);
      setLoading(false);
      return;
    }

    setTransactions(result.data);
    setError(null);
    setLoading(false);
  };

  const refresh = async () => {
    await Promise.all([loadTransactions(), loadClients()]);
  };

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const nextSearch = params.get("search")?.trim() ?? "";
    const nextHighlight = params.get("highlight")?.trim() || null;
    setSearchTerm((prev) => (prev === nextSearch ? prev : nextSearch));
    setHighlightedId(nextHighlight);
  }, [location.search]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setPage(1);
      setSelectedIds(new Set());
      void loadTransactions();
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [searchTerm, typeFilter, categoryFilter, minAmount, maxAmount, startDate, endDate]);

  useEffect(() => {
    if (page <= totalPages) return;
    setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    if (!highlightedId) return;
    const index = sortedTransactions.findIndex((item) => item.id === highlightedId);
    if (index < 0) return;
    setPage(Math.floor(index / pageSize) + 1);
  }, [highlightedId, pageSize, sortedTransactions]);

  const createTransaction: UseTransactionsLedgerResult["createTransaction"] = async (input) => {
    setSaving(true);
    const result = await transactionsAdapter.createTransaction(input);
    setSaving(false);
    if (!result.success) {
      setError(result.error.message);
      return false;
    }
    await loadTransactions();
    return true;
  };

  const updateTransaction: UseTransactionsLedgerResult["updateTransaction"] = async (transactionId, input) => {
    setSaving(true);
    const result = await transactionsAdapter.updateTransaction(transactionId, input);
    setSaving(false);
    if (!result.success) {
      setError(result.error.message);
      return false;
    }
    await loadTransactions();
    return true;
  };

  const deleteTransaction = async (transactionId: string): Promise<boolean> => {
    setDeleting(true);
    const result = await transactionsAdapter.deleteTransaction(transactionId);
    setDeleting(false);
    if (!result.success) {
      setError(result.error.message);
      return false;
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(transactionId);
      return next;
    });
    await loadTransactions();
    return true;
  };

  const deleteSelectedTransactions = async (): Promise<TransactionsBulkDeleteSummary | null> => {
    const ids = Array.from(selectedIds);
    setDeleting(true);
    const result = await transactionsAdapter.deleteTransactions(ids);
    setDeleting(false);
    if (!result.success) {
      setError(result.error.message);
      return null;
    }
    setSelectedIds(new Set());
    await loadTransactions();
    return result.data;
  };

  const toggleSelected = (transactionId: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(transactionId);
      else next.delete(transactionId);
      return next;
    });
  };

  const togglePageSelection = (checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const transaction of pageTransactions) {
        if (transaction.lockedByInvoice) continue;
        if (checked) next.add(transaction.id);
        else next.delete(transaction.id);
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const clearHighlight = () => setHighlightedId(null);

  return {
    transactions: sortedTransactions,
    pageTransactions,
    clients,
    loading,
    clientsLoading,
    saving,
    deleting,
    error,
    searchTerm,
    setSearchTerm,
    typeFilter,
    setTypeFilter,
    categoryFilter,
    setCategoryFilter,
    minAmount,
    setMinAmount,
    maxAmount,
    setMaxAmount,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    sortMode,
    setSortMode,
    page,
    totalPages,
    setPage,
    selectedIds,
    selectedCount: selectedIds.size,
    highlightedId,
    clearHighlight,
    toggleSelected,
    togglePageSelection,
    clearSelection,
    refresh,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    deleteSelectedTransactions,
  };
}
