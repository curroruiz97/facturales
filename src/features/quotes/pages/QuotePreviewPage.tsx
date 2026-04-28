import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ErrorState } from "../../../app/components/states/ErrorState";
import { LoadingSkeleton } from "../../../app/components/states/LoadingSkeleton";
import { DocumentActionBar } from "../../documents/components/DocumentActionBar";
import { getPdfBlob, downloadPdf } from "../../documents/pdf/document-pdf-generator";
import { useQuotesWorkspace } from "../hooks/use-quotes-workspace";

function formatCurrency(amount: number, currency: string): string {
  const normalizedCurrency = /^[A-Z]{3}$/.test((currency || "").toUpperCase()) ? currency.toUpperCase() : "EUR";
  try {
    return new Intl.NumberFormat("es-ES", { style: "currency", currency: normalizedCurrency }).format(amount || 0);
  } catch {
    return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount || 0);
  }
}

export function QuotePreviewPage(): import("react").JSX.Element {
  const workspace = useQuotesWorkspace();
  const [flash, setFlash] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [resolvedLogoDataUrl, setResolvedLogoDataUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 4000);
    return () => clearTimeout(t);
  }, [flash]);

  useEffect(() => {
    const source = workspace.pdfLogoUrl;
    if (!source) {
      setResolvedLogoDataUrl(undefined);
      return;
    }
    if (source.startsWith("data:image/")) {
      setResolvedLogoDataUrl(source);
      return;
    }
    let cancelled = false;
    const toDataUrl = async () => {
      try {
        const response = await fetch(source);
        if (!response.ok) return;
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          if (cancelled) return;
          const result = typeof reader.result === "string" ? reader.result : undefined;
          setResolvedLogoDataUrl(result);
        };
        reader.readAsDataURL(blob);
      } catch {
        if (!cancelled) {
          setResolvedLogoDataUrl(undefined);
        }
      }
    };
    void toDataUrl();
    return () => {
      cancelled = true;
    };
  }, [workspace.pdfLogoUrl]);

  const saveDraft = async (): Promise<string | null> => {
    const result = await workspace.saveDraft();
    setFlash(result.ok ? "Presupuesto guardado como borrador." : (result.error || "No se pudo guardar el borrador."));
    return result.ok ? (result.id ?? null) : null;
  };

  const emitActive = async (): Promise<boolean> => {
    const success = await workspace.emitActive();
    if (!success) setFlash(workspace.error || "No se pudo emitir el presupuesto.");
    return success;
  };

  const editor = workspace.editorController.editor;
  const summary = workspace.editorController.totals.summary;
  const cur = editor.meta.currency || "EUR";
  const docNumber = editor.meta.number || "";
  const displayDocNumber = docNumber || "Se asignará al emitir";
  const issueDate = editor.meta.issueDate || "-";
  const dueDate = editor.meta.dueDate || "-";
  const paymentTerms = (() => {
    const raw = (editor.meta.paymentTerms ?? "").trim().toLowerCase();
    if (!raw || raw === "immediate" || raw === "inmediato") return "Pago inmediato";
    if (raw === "15" || raw === "30" || raw === "60" || raw === "90") return `${raw} días`;
    return editor.meta.paymentTerms;
  })();
  const taxesTotal = summary.taxAmount + summary.reAmount;
  const paymentMethodLabels: Record<string, string> = {
    transferencia: "Transferencia bancaria",
    domiciliacion: "Domiciliación",
    efectivo: "Efectivo",
    contrareembolso: "Contrareembolso",
    bizum: "Bizum",
    otro: "Otro",
  };
  const issuedReadOnly = workspace.activeQuoteStatus === "issued";
  const backPath = issuedReadOnly
    ? "/presupuestos/emitidos"
    : `/presupuestos/emision?draft=${encodeURIComponent(workspace.activeQuoteId ?? "")}`;
  const backLabel = issuedReadOnly ? "Volver a emitidos" : "Volver a editar";

  const previewBlob = useMemo(() => {
    return getPdfBlob({
      editor,
      totals: summary,
      documentNumber: docNumber,
      brandColor: workspace.pdfBrandColor,
      logoDataUrl: resolvedLogoDataUrl,
    });
  }, [editor, summary, docNumber, workspace.pdfBrandColor, resolvedLogoDataUrl, refreshTick]);

  const [previewUrl, setPreviewUrl] = useState<string>("");
  useEffect(() => {
    const url = URL.createObjectURL(previewBlob);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [previewBlob]);

  if (workspace.loading) {
    return <LoadingSkeleton message="Cargando vista previa de presupuesto..." />;
  }

  if (!workspace.activeQuoteId) {
    return <Navigate to="/presupuestos/emision" replace />;
  }

  return (
    <div className="doc-page doc-preview-page">
      <div className="doc-page__header">
        <div>
          <nav className="doc-breadcrumb">
            <Link to="/">Inicio</Link>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <Link to="/presupuestos/emision">Emitir presupuesto</Link>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span>Vista previa</span>
          </nav>
          <h1 className="doc-page__title">Vista previa</h1>
          <p className="doc-page__subtitle">Revisa el presupuesto antes de emitirlo.</p>
        </div>
      </div>

      {workspace.error ? (
        <ErrorState title="No se pudo cargar la vista previa" description={workspace.error} onRetry={() => void workspace.refresh()} />
      ) : null}

      <div className="doc-preview-grid">
        <section className="doc-preview-viewer">
          <div className="doc-preview-viewer__toolbar">
            <h3>Vista previa PDF</h3>
            <div className="doc-preview-viewer__actions">
              <button type="button" className="doc-action-bar__btn" onClick={() => setRefreshTick((v) => v + 1)}>
                Regenerar
              </button>
              <a
                className="doc-action-bar__btn"
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Abrir en pestaña
              </a>
              <button
                type="button"
                className="doc-action-bar__btn"
                onClick={() =>
                  downloadPdf(
                    {
                      editor,
                      totals: summary,
                      documentNumber: docNumber,
                      brandColor: workspace.pdfBrandColor,
                      logoDataUrl: resolvedLogoDataUrl,
                    },
                    `presupuesto-${docNumber || "borrador"}.pdf`,
                  )
                }
              >
                Descargar PDF
              </button>
            </div>
          </div>
          <iframe src={`${previewUrl}#navpanes=0&toolbar=1`} title="Vista previa presupuesto PDF" />
        </section>
        <aside className="doc-preview-summary">
          <h3>Datos del presupuesto</h3>
          <div className="doc-preview-summary__row"><span>Nº presupuesto</span><strong>{displayDocNumber}</strong></div>
          <div className="doc-preview-summary__row"><span>Serie</span><strong>{editor.meta.series || "-"}</strong></div>
          <div className="doc-preview-summary__row"><span>Fecha emisión</span><strong>{issueDate}</strong></div>
          <div className="doc-preview-summary__row"><span>Validez</span><strong>{dueDate}</strong></div>
          <hr />
          <h3>Cliente</h3>
          <div className="doc-preview-summary__row"><span>Nombre</span><strong>{editor.client.name || "-"}</strong></div>
          <div className="doc-preview-summary__row"><span>NIF</span><strong>{editor.client.nif || "-"}</strong></div>
          <div className="doc-preview-summary__row"><span>Email</span><strong>{editor.client.email || "-"}</strong></div>
          <div className="doc-preview-summary__row"><span>Dirección</span><strong>{editor.client.address || "-"}</strong></div>
          <div className="doc-preview-summary__row"><span>Código postal</span><strong>{editor.client.postalCode || "-"}</strong></div>
          <hr />
          <h3>Resumen</h3>
          <div className="doc-preview-summary__row"><span>Subtotal</span><strong>{formatCurrency(summary.subtotal, cur)}</strong></div>
          {summary.discount > 0 ? (
            <div className="doc-preview-summary__row"><span>Descuento</span><strong>-{formatCurrency(summary.discount, cur)}</strong></div>
          ) : null}
          <div className="doc-preview-summary__row"><span>Base imponible</span><strong>{formatCurrency(summary.taxBase, cur)}</strong></div>
          <div className="doc-preview-summary__row">
            <span>{summary.taxRate > 0 ? `IVA (${summary.taxRate}%)` : "IVA"}</span>
            <strong>+{formatCurrency(summary.taxAmount, cur)}</strong>
          </div>
          {summary.reAmount > 0 ? (
            <div className="doc-preview-summary__row">
              <span>Recargo equivalencia ({summary.reRate}%)</span>
              <strong>+{formatCurrency(summary.reAmount, cur)}</strong>
            </div>
          ) : null}
          {summary.retentionRate > 0 ? (
            <div className="doc-preview-summary__row">
              <span>Retención IRPF ({summary.retentionRate}%)</span>
              <strong>−{formatCurrency(summary.retentionAmount, cur)}</strong>
            </div>
          ) : null}
          {summary.expenses > 0 ? (
            <div className="doc-preview-summary__row"><span>Gastos suplidos</span><strong>{formatCurrency(summary.expenses, cur)}</strong></div>
          ) : null}
          <div className="doc-preview-summary__row doc-preview-summary__row--total"><span>Total</span><strong>{formatCurrency(summary.total, cur)}</strong></div>
          {editor.paidAmount > 0 ? (
            <div className="doc-preview-summary__row"><span>Cantidad pagada</span><strong>−{formatCurrency(editor.paidAmount, cur)}</strong></div>
          ) : null}
          <div className="doc-preview-summary__row doc-preview-summary__row--total"><span>Total a pagar</span><strong>{formatCurrency(summary.totalToPay, cur)}</strong></div>
          <p className="doc-preview-summary__hint">Se recalcula automáticamente</p>
          {editor.paymentMethods.length > 0 ? (
            <>
              <hr />
              <h3>Métodos de pago</h3>
              {editor.paymentMethods.map((method) => (
                <div className="doc-preview-summary__row" key={method.id}>
                  <span>{paymentMethodLabels[method.type] ?? method.type}</span>
                  <strong>{method.iban || method.phone || "-"}</strong>
                </div>
              ))}
            </>
          ) : null}
          <hr />
          <h3>Condiciones de pago</h3>
          <div className="doc-preview-summary__row"><span>Plazo de pago</span><strong>{paymentTerms}</strong></div>
          {dueDate && dueDate !== "-" ? (
            <div className="doc-preview-summary__row"><span>Vencimiento</span><strong>{dueDate}</strong></div>
          ) : null}
          <hr />
          <div className="doc-preview-summary__actions">
            <button
              type="button"
              className="doc-preview-summary__btn"
              onClick={() => {
                downloadPdf({ editor, totals: summary, documentNumber: docNumber, brandColor: workspace.pdfBrandColor, logoDataUrl: resolvedLogoDataUrl }, `presupuesto-${(docNumber || "sin-numero").replace(/[^a-zA-Z0-9-_]/g, "_")}.pdf`);
                setFlash("PDF descargado.");
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Descargar PDF
            </button>
            <button
              type="button"
              className="doc-preview-summary__btn"
              onClick={() => setRefreshTick((v) => v + 1)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/></svg>
              Vista previa
            </button>
          </div>
        </aside>
      </div>

      <DocumentActionBar
        kindLabel="presupuesto"
        documentKind="quote"
        activeDocumentId={workspace.activeQuoteId}
        saving={workspace.saving}
        readOnly={workspace.readOnlyEditor}
        editorController={workspace.editorController}
        onSaveDraft={saveDraft}
        onEmit={emitActive}
        emitErrorMessage={workspace.error}
        flash={flash}
        setFlash={setFlash}
        mode="preview"
        backPath={backPath}
        backLabel={backLabel}
        allowSendOnReadOnly={issuedReadOnly}
        pdfBrandColor={workspace.pdfBrandColor}
        pdfLogoUrl={workspace.pdfLogoUrl}
      />
    </div>
  );
}
