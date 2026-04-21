import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useDocumentEditor } from "../../documents/hooks/use-document-editor";
import { quotesAdapter, type QuoteWorkspaceItem } from "../adapters/quotes.adapter";
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

export interface UseQuotesWorkspaceResult {
  quotes: QuoteWorkspaceItem[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  statusFilter: "all" | "draft" | "issued" | "cancelled";
  setStatusFilter: (value: "all" | "draft" | "issued" | "cancelled") => void;
  search: string;
  setSearch: (value: string) => void;
  activeQuoteId: string | null;
  activeQuoteStatus: QuoteWorkspaceItem["status"] | null;
  readOnlyEditor: boolean;
  editorController: ReturnType<typeof useDocumentEditor>;
  refresh: () => Promise<void>;
  startNew: () => void;
  openQuote: (quoteId: string) => Promise<void>;
  saveDraft: () => Promise<{ ok: boolean; error?: string; id?: string }>;
  emitActive: () => Promise<boolean>;
  togglePaid: (quoteId: string, isPaid: boolean) => Promise<boolean>;
  cancelQuote: (quoteId: string) => Promise<boolean>;
  pdfBrandColor: string;
  pdfLogoUrl: string | null;
}

function isReadOnlyStatus(status: QuoteWorkspaceItem["status"] | null): boolean {
  if (!status) return false;
  return status !== "draft";
}

export function useQuotesWorkspace(): UseQuotesWorkspaceResult {
  const location = useLocation();
  const editorController = useDocumentEditor(quotesAdapter.createEmpty());
  const [quotes, setQuotes] = useState<QuoteWorkspaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "issued" | "cancelled">("all");
  const [search, setSearch] = useState("");
  const [activeQuoteId, setActiveQuoteId] = useState<string | null>(null);
  const [activeQuoteStatus, setActiveQuoteStatus] = useState<QuoteWorkspaceItem["status"] | null>(null);
  const [issuerPrefill, setIssuerPrefill] = useState<IssuerPrefill | null>(null);
  const [pdfBrandColor, setPdfBrandColor] = useState("#ec8228");
  const [pdfLogoUrl, setPdfLogoUrl] = useState<string | null>(null);

  const readOnlyEditor = useMemo(() => isReadOnlyStatus(activeQuoteStatus), [activeQuoteStatus]);

  const refresh = async () => {
    setLoading(true);
    const result = await quotesAdapter.loadQuotes(statusFilter, search);
    if (!result.success) {
      setQuotes([]);
      setError(result.error.message);
      setLoading(false);
      return;
    }

    setQuotes(result.data);
    setError(null);
    setLoading(false);
  };

  useEffect(() => {
    void refresh();
  }, [statusFilter, search]);

  const startNew = () => {
    editorController.reset(quotesAdapter.createEmpty());
    if (issuerPrefill) {
      editorController.setIssuerField("name", issuerPrefill.name);
      editorController.setIssuerField("nif", issuerPrefill.nif);
      editorController.setIssuerField("address", issuerPrefill.address);
      editorController.setIssuerField("postalCode", issuerPrefill.postalCode);
      editorController.setIssuerField("email", issuerPrefill.email);
    }
    const cachedPm = loadDefaultPaymentMethod();
    if (cachedPm) {
      editorController.addPaymentMethod({
        type: cachedPm.type,
        iban: cachedPm.iban,
        phone: cachedPm.phone,
        label: cachedPm.label,
      });
    }
    void loadDefaultPaymentMethodFromDB().then((dbPm) => {
      if (!dbPm) return;
      if (cachedPm && cachedPm.type === dbPm.type && cachedPm.iban === dbPm.iban && cachedPm.phone === dbPm.phone) return;
      if (!cachedPm) {
        editorController.addPaymentMethod({
          type: dbPm.type,
          iban: dbPm.iban,
          phone: dbPm.phone,
          label: dbPm.label,
        });
      }
    });
    setActiveQuoteId(null);
    setActiveQuoteStatus("draft");
    setError(null);
  };

  const openQuote = async (quoteId: string) => {
    setLoading(true);
    const editorResult = await quotesAdapter.loadQuoteEditor(quoteId);
    setLoading(false);
    if (!editorResult.success) {
      setError(editorResult.error.message);
      return;
    }

    editorController.reset(editorResult.data.editor);
    setActiveQuoteId(quoteId);
    setActiveQuoteStatus(editorResult.data.status);
    setError(null);
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const initialSearch = params.get("search");
    const draft = params.get("draft");
    const quote = params.get("quote");
    const highlight = params.get("highlight");
    const target = draft || quote || highlight;

    setSearch(initialSearch?.trim() ?? "");
    if (target) {
      void openQuote(target);
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

      if (!activeQuoteId) {
        editorController.setIssuerField("name", prefill.name);
        editorController.setIssuerField("nif", prefill.nif);
        editorController.setIssuerField("address", prefill.address);
        editorController.setIssuerField("postalCode", prefill.postalCode);
        editorController.setIssuerField("email", prefill.email);
      }
    };

    void loadIssuerPrefill();
  }, [activeQuoteId]);

  const saveDraft = async (): Promise<{ ok: boolean; error?: string; id?: string }> => {
    setSaving(true);
    const result = activeQuoteId
      ? await quotesAdapter.updateDraft(activeQuoteId, editorController.editor)
      : await quotesAdapter.createDraft(editorController.editor);
    setSaving(false);

    if (!result.success) {
      const msg = result.error.message;
      setError(msg);
      return { ok: false, error: msg };
    }

    const savedId = result.data.id;
    setActiveQuoteId(savedId);
    setActiveQuoteStatus(result.data.status);
    const loadedEditor = await quotesAdapter.loadQuoteEditor(savedId);
    if (loadedEditor.success) {
      editorController.reset(loadedEditor.data.editor);
      setActiveQuoteStatus(loadedEditor.data.status);
    }
    await refresh();
    return { ok: true, id: savedId };
  };

  const emitActive = async (): Promise<boolean> => {
    if (editorController.editor.paymentMethods.length === 0) {
      setError("Debes añadir al menos un método de pago antes de emitir.");
      return false;
    }

    let targetId = activeQuoteId;
    if (!targetId) {
      setSaving(true);
      const created = await quotesAdapter.createDraft(editorController.editor);
      setSaving(false);
      if (!created.success) {
        setError(created.error.message);
        return false;
      }
      targetId = created.data.id;
      setActiveQuoteId(created.data.id);
      setActiveQuoteStatus(created.data.status);
    }

    setSaving(true);
    const emitted = await quotesAdapter.emitQuote(targetId);
    setSaving(false);
    if (!emitted.success) {
      setError(emitted.error.message);
      return false;
    }

    setActiveQuoteStatus(emitted.data.status);
    await refresh();
    return true;
  };

  const togglePaid = async (quoteId: string, isPaid: boolean): Promise<boolean> => {
    setSaving(true);
    const result = await quotesAdapter.togglePaid(quoteId, isPaid);
    setSaving(false);
    if (!result.success) {
      setError(result.error.message);
      return false;
    }

    if (quoteId === activeQuoteId) {
      setActiveQuoteStatus(result.data.status);
    }
    await refresh();
    return true;
  };

  const cancelQuote = async (quoteId: string): Promise<boolean> => {
    setSaving(true);
    const result = await quotesAdapter.cancelQuote(quoteId);
    setSaving(false);
    if (!result.success) {
      setError(result.error.message);
      return false;
    }

    if (quoteId === activeQuoteId) {
      setActiveQuoteStatus("cancelled");
    }
    await refresh();
    return true;
  };

  return {
    quotes,
    loading,
    saving,
    error,
    statusFilter,
    setStatusFilter,
    search,
    setSearch,
    activeQuoteId,
    activeQuoteStatus,
    readOnlyEditor,
    editorController,
    refresh,
    startNew,
    openQuote,
    saveDraft,
    emitActive,
    togglePaid,
    cancelQuote,
    pdfBrandColor,
    pdfLogoUrl,
  };
}
