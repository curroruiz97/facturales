import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import JSZip from "jszip";
import { useDocumentEditor } from "../../documents/hooks/use-document-editor";
import { invoicesAdapter, type InvoiceWorkspaceItem } from "../adapters/invoices.adapter";
import { businessInfoService } from "../../../services/business/business-info.service";
import { getSupabaseClient } from "../../../services/supabase/client";
import { loadDefaultPaymentMethod, loadDefaultPaymentMethodFromDB } from "../../../services/payment/default-payment-method";
import { getPdfBlob } from "../../documents/pdf/document-pdf-generator";

export const INVOICE_PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
export type InvoicePageSize = typeof INVOICE_PAGE_SIZE_OPTIONS[number];
const DEFAULT_PAGE_SIZE: InvoicePageSize = 20;
const CURRENT_YEAR = new Date().getFullYear();

export type InvoicePaymentFilter = "all" | "paid" | "unpaid";
export type InvoiceEmailFilter = "all" | "sent" | "unsent";

export type InvoiceSortField = "invoiceNumber" | "clientName" | "issueDate" | "totalAmount" | "updatedAt";
export type InvoiceSortDir = "asc" | "desc";
export interface InvoiceSortMode {
  field: InvoiceSortField;
  dir: InvoiceSortDir;
}

function compareInvoices(a: InvoiceWorkspaceItem, b: InvoiceWorkspaceItem, sort: InvoiceSortMode): number {
  const dirMul = sort.dir === "asc" ? 1 : -1;
  switch (sort.field) {
    case "invoiceNumber":
      return a.invoiceNumber.localeCompare(b.invoiceNumber, "es", { numeric: true, sensitivity: "base" }) * dirMul;
    case "clientName":
      return a.clientName.localeCompare(b.clientName, "es", { sensitivity: "base" }) * dirMul;
    case "issueDate":
      return a.issueDate.localeCompare(b.issueDate) * dirMul;
    case "totalAmount":
      return (a.totalAmount - b.totalAmount) * dirMul;
    case "updatedAt":
    default:
      return a.updatedAt.localeCompare(b.updatedAt) * dirMul;
  }
}

interface IssuerPrefill {
  name: string;
  nif: string;
  address: string;
  postalCode: string;
  email: string;
  brandColor: string;
  invoiceImageUrl: string | null;
}

export interface UseInvoicesWorkspaceResult {
  invoices: InvoiceWorkspaceItem[];
  pageInvoices: InvoiceWorkspaceItem[];
  availableYears: number[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  statusFilter: "all" | "draft" | "issued" | "cancelled";
  setStatusFilter: (value: "all" | "draft" | "issued" | "cancelled") => void;
  search: string;
  setSearch: (value: string) => void;
  yearFilter: number | "all";
  setYearFilter: (value: number | "all") => void;
  paymentFilter: InvoicePaymentFilter;
  setPaymentFilter: (value: InvoicePaymentFilter) => void;
  emailFilter: InvoiceEmailFilter;
  setEmailFilter: (value: InvoiceEmailFilter) => void;
  hasActiveFilters: boolean;
  resetFilters: () => void;
  sortMode: InvoiceSortMode;
  setSortMode: (value: InvoiceSortMode) => void;
  toggleSort: (field: InvoiceSortField) => void;
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: InvoicePageSize;
  setPageSize: (value: InvoicePageSize) => void;
  setPage: (value: number) => void;
  selectedIds: Set<string>;
  selectedCount: number;
  toggleSelected: (invoiceId: string, checked: boolean) => void;
  togglePageSelection: (checked: boolean, invoiceIds?: string[]) => void;
  clearSelection: () => void;
  activeInvoiceId: string | null;
  activeInvoiceStatus: InvoiceWorkspaceItem["status"] | null;
  readOnlyEditor: boolean;
  editorController: ReturnType<typeof useDocumentEditor>;
  refresh: () => Promise<void>;
  startNew: () => void;
  openInvoice: (invoiceId: string) => Promise<void>;
  saveDraft: () => Promise<{ ok: boolean; error?: string; id?: string }>;
  emitActive: () => Promise<boolean>;
  togglePaid: (invoiceId: string, isPaid: boolean) => Promise<boolean>;
  cancelInvoice: (invoiceId: string) => Promise<boolean>;
  togglePaidSelected: (isPaid: boolean) => Promise<{ ok: number; failed: number } | null>;
  cancelSelected: () => Promise<{ ok: number; failed: number } | null>;
  markEmailedSelected: () => Promise<{ ok: number; failed: number } | null>;
  downloadSelectedAsZip: () => Promise<{ ok: number; failed: number } | null>;
  markInvoiceEmailed: (invoiceId: string) => Promise<boolean>;
  downloadInvoicePdf: (invoiceId: string) => Promise<boolean>;
  pdfBrandColor: string;
  pdfLogoUrl: string | null;
}

function isReadOnlyStatus(status: InvoiceWorkspaceItem["status"] | null): boolean {
  if (!status) return false;
  return status !== "draft";
}

export function useInvoicesWorkspace(): UseInvoicesWorkspaceResult {
  const location = useLocation();
  const editorController = useDocumentEditor(invoicesAdapter.createEmpty());
  const [invoices, setInvoices] = useState<InvoiceWorkspaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "issued" | "cancelled">("all");
  const [search, setSearch] = useState("");
  const [activeInvoiceId, setActiveInvoiceId] = useState<string | null>(null);
  const [activeInvoiceStatus, setActiveInvoiceStatus] = useState<InvoiceWorkspaceItem["status"] | null>(null);
  const [issuerPrefill, setIssuerPrefill] = useState<IssuerPrefill | null>(null);
  const [pdfBrandColor, setPdfBrandColor] = useState("#ec8228");
  const [pdfLogoUrl, setPdfLogoUrl] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [yearFilter, setYearFilter] = useState<number | "all">(CURRENT_YEAR);
  const [paymentFilter, setPaymentFilter] = useState<InvoicePaymentFilter>("all");
  const [emailFilter, setEmailFilter] = useState<InvoiceEmailFilter>("all");
  const [pageSize, setPageSize] = useState<InvoicePageSize>(DEFAULT_PAGE_SIZE);
  const [sortMode, setSortMode] = useState<InvoiceSortMode>({ field: "updatedAt", dir: "desc" });

  const readOnlyEditor = useMemo(() => isReadOnlyStatus(activeInvoiceStatus), [activeInvoiceStatus]);

  // Años disponibles para el selector — derivados del set completo cargado.
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    for (const invoice of invoices) {
      const year = Number.parseInt((invoice.issueDate || "").slice(0, 4), 10);
      if (Number.isFinite(year) && year > 1900) years.add(year);
    }
    return Array.from(years).sort((a, b) => b - a);
  }, [invoices]);

  // Vista filtrada (por año, pago y envío) y ordenada — base para contador, paginación y bulk.
  const filteredInvoices = useMemo(() => {
    let base = invoices;
    if (yearFilter !== "all") {
      base = base.filter((invoice) => (invoice.issueDate || "").startsWith(`${yearFilter}`));
    }
    if (paymentFilter === "paid") base = base.filter((invoice) => invoice.isPaid);
    else if (paymentFilter === "unpaid") base = base.filter((invoice) => !invoice.isPaid);
    if (emailFilter === "sent") base = base.filter((invoice) => invoice.emailSent);
    else if (emailFilter === "unsent") base = base.filter((invoice) => !invoice.emailSent);
    return [...base].sort((a, b) => compareInvoices(a, b, sortMode));
  }, [invoices, yearFilter, paymentFilter, emailFilter, sortMode]);

  const totalPages = useMemo(() => {
    const pages = Math.ceil(filteredInvoices.length / pageSize);
    return pages <= 0 ? 1 : pages;
  }, [filteredInvoices.length, pageSize]);

  const pageInvoices = useMemo(() => {
    const clampedPage = Math.min(page, totalPages);
    const start = (clampedPage - 1) * pageSize;
    return filteredInvoices.slice(start, start + pageSize);
  }, [filteredInvoices, page, totalPages, pageSize]);

  const hasActiveFilters = yearFilter !== "all" || paymentFilter !== "all" || emailFilter !== "all";

  const resetFilters = () => {
    setYearFilter("all");
    setPaymentFilter("all");
    setEmailFilter("all");
  };

  const toggleSort = (field: InvoiceSortField) => {
    setSortMode((prev) => {
      if (prev.field === field) {
        return { field, dir: prev.dir === "asc" ? "desc" : "asc" };
      }
      // Default direction sensata por campo: textos asc, números/fechas desc.
      const dir: InvoiceSortDir = field === "totalAmount" || field === "issueDate" || field === "updatedAt" ? "desc" : "asc";
      return { field, dir };
    });
  };

  const refresh = async () => {
    setLoading(true);
    const result = await invoicesAdapter.loadInvoices(statusFilter, search);
    if (!result.success) {
      setInvoices([]);
      setError(result.error.message);
      setLoading(false);
      return;
    }

    setInvoices(result.data);
    setError(null);
    setLoading(false);
  };

  useEffect(() => {
    void refresh();
  }, [statusFilter, search]);

  // Reset paginación y selección al cambiar filtros/búsqueda/año/orden/pago/envío/pageSize.
  useEffect(() => {
    setPage(1);
    setSelectedIds(new Set());
  }, [statusFilter, search, yearFilter, paymentFilter, emailFilter, sortMode, pageSize]);

  // Si la página actual queda fuera de rango (p.ej. tras una anulación), encajarla.
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const toggleSelected = (invoiceId: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(invoiceId);
      else next.delete(invoiceId);
      return next;
    });
  };

  const togglePageSelection = (checked: boolean, invoiceIds?: string[]) => {
    // Si el componente nos pasa los IDs explícitamente los usamos (evita capturar
    // un `pageInvoices` stale en el closure).
    const ids = invoiceIds ?? pageInvoices.map((invoice) => invoice.id);
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

  const startNew = () => {
    editorController.reset(invoicesAdapter.createEmpty());
    if (issuerPrefill) {
      editorController.setIssuerField("name", issuerPrefill.name);
      editorController.setIssuerField("nif", issuerPrefill.nif);
      editorController.setIssuerField("address", issuerPrefill.address);
      editorController.setIssuerField("postalCode", issuerPrefill.postalCode);
      editorController.setIssuerField("email", issuerPrefill.email);
    }
    // Prefill inmediato desde localStorage (no bloqueante)
    const cachedPm = loadDefaultPaymentMethod();
    if (cachedPm) {
      editorController.addPaymentMethod({
        type: cachedPm.type,
        iban: cachedPm.iban,
        phone: cachedPm.phone,
        label: cachedPm.label,
      });
    }
    // Refresco desde BD por si hubiera una versión más reciente guardada
    void loadDefaultPaymentMethodFromDB().then((dbPm) => {
      if (!dbPm) return;
      const sameAsCache = cachedPm && cachedPm.type === dbPm.type && cachedPm.iban === dbPm.iban && cachedPm.phone === dbPm.phone;
      if (sameAsCache) return;
      // Si no había ninguno añadido, lo añadimos; si había (desde cache), no duplicamos.
      if (!cachedPm) {
        editorController.addPaymentMethod({
          type: dbPm.type,
          iban: dbPm.iban,
          phone: dbPm.phone,
          label: dbPm.label,
        });
      }
    });
    setActiveInvoiceId(null);
    setActiveInvoiceStatus("draft");
    setError(null);
  };

  const openInvoice = async (invoiceId: string) => {
    setLoading(true);
    const editorResult = await invoicesAdapter.loadInvoiceEditor(invoiceId);
    setLoading(false);
    if (!editorResult.success) {
      setError(editorResult.error.message);
      return;
    }

    editorController.reset(editorResult.data.editor);
    setActiveInvoiceId(invoiceId);
    setActiveInvoiceStatus(editorResult.data.status);
    setError(null);
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const initialSearch = params.get("search");
    const draft = params.get("draft");
    const invoice = params.get("invoice");
    const highlight = params.get("highlight");
    const target = draft || invoice || highlight;

    setSearch(initialSearch?.trim() ?? "");
    if (target) {
      void openInvoice(target);
    }
  }, [location.search]);

  useEffect(() => {
    const loadIssuerPrefill = async () => {
      const result = await businessInfoService.getMine();
      if (!result.success || !result.data) return;

      const addressParts = [result.data.direccionFacturacion, result.data.ciudad, result.data.provincia].filter(Boolean);
      const prefill: IssuerPrefill = {
        name: result.data.nombreFiscal || "",
        nif: result.data.nifCif || "",
        address: addressParts.join(", "),
        postalCode: result.data.codigoPostal || "",
        email: "",
        brandColor: result.data.brandColor || "#ec8228",
        invoiceImageUrl: result.data.invoiceImageUrl || null,
      };

      const authResult = await getSupabaseClient().auth.getUser();
      prefill.email = authResult.data.user?.email ?? "";

      setIssuerPrefill(prefill);
      setPdfBrandColor(prefill.brandColor);
      setPdfLogoUrl(prefill.invoiceImageUrl);

      if (!activeInvoiceId) {
        editorController.setIssuerField("name", prefill.name);
        editorController.setIssuerField("nif", prefill.nif);
        editorController.setIssuerField("address", prefill.address);
        editorController.setIssuerField("postalCode", prefill.postalCode);
        editorController.setIssuerField("email", prefill.email);
      }
    };

    void loadIssuerPrefill();
  }, [activeInvoiceId]);

  const saveDraft = async (): Promise<{ ok: boolean; error?: string; id?: string }> => {
    setSaving(true);
    const result = activeInvoiceId
      ? await invoicesAdapter.updateDraft(activeInvoiceId, editorController.editor)
      : await invoicesAdapter.createDraft(editorController.editor);
    setSaving(false);

    if (!result.success) {
      const msg = result.error.message;
      setError(msg);
      return { ok: false, error: msg };
    }

    const savedId = result.data.id;
    setActiveInvoiceId(savedId);
    setActiveInvoiceStatus(result.data.status);
    const loadedEditor = await invoicesAdapter.loadInvoiceEditor(savedId);
    if (loadedEditor.success) {
      editorController.reset(loadedEditor.data.editor);
      setActiveInvoiceStatus(loadedEditor.data.status);
    }
    await refresh();
    return { ok: true, id: savedId };
  };

  const emitActive = async (): Promise<boolean> => {
    if (editorController.editor.paymentMethods.length === 0) {
      setError("Debes añadir al menos un método de pago antes de emitir.");
      return false;
    }

    let targetId = activeInvoiceId;
    if (!targetId) {
      setSaving(true);
      const created = await invoicesAdapter.createDraft(editorController.editor);
      setSaving(false);
      if (!created.success) {
        setError(created.error.message);
        return false;
      }
      targetId = created.data.id;
      setActiveInvoiceId(created.data.id);
      setActiveInvoiceStatus(created.data.status);
    }

    setSaving(true);
    const emitted = await invoicesAdapter.emitInvoice(targetId);
    setSaving(false);
    if (!emitted.success) {
      setError(emitted.error.message);
      return false;
    }

    setActiveInvoiceStatus(emitted.data.status);
    await refresh();
    return true;
  };

  const togglePaid = async (invoiceId: string, isPaid: boolean): Promise<boolean> => {
    setSaving(true);
    const result = await invoicesAdapter.togglePaid(invoiceId, isPaid);
    setSaving(false);
    if (!result.success) {
      setError(result.error.message);
      return false;
    }

    if (invoiceId === activeInvoiceId) {
      setActiveInvoiceStatus(result.data.status);
    }
    await refresh();
    return true;
  };

  const cancelInvoice = async (invoiceId: string): Promise<boolean> => {
    setSaving(true);
    const result = await invoicesAdapter.cancelInvoice(invoiceId);
    setSaving(false);
    if (!result.success) {
      setError(result.error.message);
      return false;
    }

    if (invoiceId === activeInvoiceId) {
      setActiveInvoiceStatus("cancelled");
    }
    await refresh();
    return true;
  };

  const togglePaidSelected = async (isPaid: boolean): Promise<{ ok: number; failed: number } | null> => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return null;
    setSaving(true);
    const summary = await invoicesAdapter.togglePaidMany(ids, isPaid);
    setSaving(false);
    setSelectedIds(new Set());
    await refresh();
    return summary;
  };

  const cancelSelected = async (): Promise<{ ok: number; failed: number } | null> => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return null;
    setSaving(true);
    const summary = await invoicesAdapter.cancelMany(ids);
    setSaving(false);
    setSelectedIds(new Set());
    await refresh();
    return summary;
  };

  const markEmailedSelected = async (): Promise<{ ok: number; failed: number } | null> => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return null;
    setSaving(true);
    const summary = await invoicesAdapter.markEmailedMany(ids);
    setSaving(false);
    setSelectedIds(new Set());
    await refresh();
    return summary;
  };

  const resolveLogoDataUrl = async (logoUrl: string | null): Promise<string | undefined> => {
    if (!logoUrl) return undefined;
    if (logoUrl.startsWith("data:image/")) return logoUrl;
    try {
      const response = await fetch(logoUrl);
      if (!response.ok) return undefined;
      const blob = await response.blob();
      return await new Promise<string | undefined>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : undefined);
        reader.onerror = () => resolve(undefined);
        reader.readAsDataURL(blob);
      });
    } catch {
      return undefined;
    }
  };

  const markInvoiceEmailed = async (invoiceId: string): Promise<boolean> => {
    setSaving(true);
    const summary = await invoicesAdapter.markEmailedMany([invoiceId]);
    setSaving(false);
    await refresh();
    return summary.failed === 0;
  };

  const downloadInvoicePdf = async (invoiceId: string): Promise<boolean> => {
    setSaving(true);
    const result = await invoicesAdapter.loadInvoicePdfPayload(invoiceId);
    if (!result.success) {
      setSaving(false);
      return false;
    }
    const logoDataUrl = await resolveLogoDataUrl(pdfLogoUrl);
    try {
      const blob = getPdfBlob({
        editor: result.data.editor,
        totals: result.data.totals,
        documentNumber: result.data.documentNumber,
        brandColor: pdfBrandColor,
        logoDataUrl,
      });
      const safeName = result.data.documentNumber.replace(/[\\/:*?"<>|]+/g, "_") || `factura-${invoiceId.slice(0, 8)}`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${safeName}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setSaving(false);
      return true;
    } catch {
      setSaving(false);
      return false;
    }
  };

  const downloadSelectedAsZip = async (): Promise<{ ok: number; failed: number } | null> => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return null;

    setSaving(true);
    const logoDataUrl = await resolveLogoDataUrl(pdfLogoUrl);
    const zip = new JSZip();
    let okCount = 0;
    let failedCount = 0;
    const usedNames = new Map<string, number>();

    for (const id of ids) {
      const result = await invoicesAdapter.loadInvoicePdfPayload(id);
      if (!result.success) {
        failedCount++;
        continue;
      }
      try {
        const blob = getPdfBlob({
          editor: result.data.editor,
          totals: result.data.totals,
          documentNumber: result.data.documentNumber,
          brandColor: pdfBrandColor,
          logoDataUrl,
        });
        // Evitar colisiones de nombre si dos facturas comparten número.
        const baseName = result.data.documentNumber.replace(/[\\/:*?"<>|]+/g, "_") || `factura-${id.slice(0, 8)}`;
        const used = usedNames.get(baseName) ?? 0;
        usedNames.set(baseName, used + 1);
        const filename = used === 0 ? `${baseName}.pdf` : `${baseName}-${used + 1}.pdf`;
        zip.file(filename, blob);
        okCount++;
      } catch {
        failedCount++;
      }
    }

    if (okCount === 0) {
      setSaving(false);
      return { ok: 0, failed: failedCount };
    }

    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const link = document.createElement("a");
    link.href = url;
    link.download = `facturas_${new Date().toISOString().slice(0, 10)}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setSaving(false);
    return { ok: okCount, failed: failedCount };
  };

  return {
    invoices: filteredInvoices,
    pageInvoices,
    availableYears,
    loading,
    saving,
    error,
    statusFilter,
    setStatusFilter,
    search,
    setSearch,
    yearFilter,
    setYearFilter,
    paymentFilter,
    setPaymentFilter,
    emailFilter,
    setEmailFilter,
    hasActiveFilters,
    resetFilters,
    sortMode,
    setSortMode,
    toggleSort,
    page,
    totalPages,
    totalItems: filteredInvoices.length,
    pageSize,
    setPageSize,
    setPage,
    selectedIds,
    selectedCount: selectedIds.size,
    toggleSelected,
    togglePageSelection,
    clearSelection,
    activeInvoiceId,
    activeInvoiceStatus,
    readOnlyEditor,
    editorController,
    refresh,
    startNew,
    openInvoice,
    saveDraft,
    emitActive,
    togglePaid,
    cancelInvoice,
    togglePaidSelected,
    cancelSelected,
    markEmailedSelected,
    downloadSelectedAsZip,
    markInvoiceEmailed,
    downloadInvoicePdf,
    pdfBrandColor,
    pdfLogoUrl,
  };
}
