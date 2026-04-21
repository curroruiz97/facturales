import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useDocumentEditor } from "../../documents/hooks/use-document-editor";
import { invoicesAdapter, type InvoiceWorkspaceItem } from "../adapters/invoices.adapter";
import { businessInfoService } from "../../../services/business/business-info.service";
import { getSupabaseClient } from "../../../services/supabase/client";
import { loadDefaultPaymentMethod, loadDefaultPaymentMethodFromDB } from "../../../services/payment/default-payment-method";

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
  loading: boolean;
  saving: boolean;
  error: string | null;
  statusFilter: "all" | "draft" | "issued" | "cancelled";
  setStatusFilter: (value: "all" | "draft" | "issued" | "cancelled") => void;
  search: string;
  setSearch: (value: string) => void;
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

  const readOnlyEditor = useMemo(() => isReadOnlyStatus(activeInvoiceStatus), [activeInvoiceStatus]);

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

  return {
    invoices,
    loading,
    saving,
    error,
    statusFilter,
    setStatusFilter,
    search,
    setSearch,
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
    pdfBrandColor,
    pdfLogoUrl,
  };
}
