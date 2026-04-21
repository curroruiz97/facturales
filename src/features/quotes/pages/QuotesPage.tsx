import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { EmptyState } from "../../../app/components/states/EmptyState";
import { ErrorState } from "../../../app/components/states/ErrorState";
import { LoadingSkeleton } from "../../../app/components/states/LoadingSkeleton";
import { DocumentEditorForm } from "../../documents/components/DocumentEditorForm";
import { DocumentActionBar } from "../../documents/components/DocumentActionBar";
import type { ClientPickerOption } from "../../documents/components/ClientPicker";
import { useQuotesWorkspace } from "../hooks/use-quotes-workspace";

export type QuotePageMode = "emision" | "borradores" | "emitidos";

interface QuotesPageProps {
  mode: QuotePageMode;
}

function formatCurrency(amount: number, currency: string): string {
  const normalizedCurrency = /^[A-Z]{3}$/.test((currency || "").toUpperCase()) ? currency.toUpperCase() : "EUR";
  try {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: normalizedCurrency,
    }).format(amount || 0);
  } catch {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(amount || 0);
  }
}

function modeMeta(mode: QuotePageMode): { title: string; subtitle: string; statusFilter: "all" | "draft" | "issued" | "cancelled" } {
  if (mode === "borradores") {
    return {
      title: "Borradores de presupuestos",
      subtitle: "Gestiona tus presupuestos guardados como borrador para continuar más tarde.",
      statusFilter: "draft",
    };
  }

  if (mode === "emitidos") {
    return {
      title: "Presupuestos emitidos",
      subtitle: "Visualiza y gestiona tus presupuestos emitidos.",
      statusFilter: "issued",
    };
  }

  return {
    title: "Emitir presupuesto",
    subtitle: "Completa los datos y emite un presupuesto profesional.",
    statusFilter: "all",
  };
}

function statusBadge(status: "draft" | "issued" | "cancelled"): { label: string; className: string } {
  if (status === "issued") return { label: "Emitido", className: "pilot-status--ok" };
  if (status === "cancelled") return { label: "Anulado", className: "pilot-status--warn" };
  return { label: "Borrador", className: "pilot-status--warn" };
}

export function QuotesPage({ mode }: QuotesPageProps): import("react").JSX.Element {
  const workspace = useQuotesWorkspace();
  const navigate = useNavigate();
  const [flash, setFlash] = useState<string | null>(null);
  const meta = useMemo(() => modeMeta(mode), [mode]);

  useEffect(() => {
    workspace.setStatusFilter(meta.statusFilter);
  }, [meta.statusFilter]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 4000);
    return () => clearTimeout(t);
  }, [flash]);

  const handleClientSelect = (client: ClientPickerOption | null) => {
    if (!client) {
      workspace.editorController.setClientField("clientId", null);
      workspace.editorController.setClientField("name", "");
      workspace.editorController.setClientField("nif", "");
      workspace.editorController.setClientField("email", "");
      workspace.editorController.setClientField("address", "");
      workspace.editorController.setClientField("postalCode", "");
      return;
    }

    workspace.editorController.setClientField("clientId", client.id);
    workspace.editorController.setClientField("name", client.nombreRazonSocial);
    workspace.editorController.setClientField("nif", client.identificador);
    workspace.editorController.setClientField("email", client.email ?? "");
    workspace.editorController.setClientField("address", client.direccion ?? "");
    workspace.editorController.setClientField("postalCode", client.codigoPostal ?? "");
  };

  const saveDraft = async (): Promise<string | null> => {
    const result = await workspace.saveDraft();
    setFlash(result.ok ? "Presupuesto guardado como borrador." : (result.error || "No se pudo guardar el borrador."));
    return result.ok ? (result.id ?? null) : null;
  };

  const emitActive = async (): Promise<boolean> => {
    const success = await workspace.emitActive();
    if (!success) setFlash("No se pudo emitir el presupuesto.");
    return success;
  };

  const togglePaid = async (quoteId: string, isPaid: boolean) => {
    const success = await workspace.togglePaid(quoteId, isPaid);
    setFlash(success ? "Estado de cobro actualizado." : "No se pudo actualizar el estado de cobro.");
  };

  const cancelQuote = async (quoteId: string) => {
    const success = await workspace.cancelQuote(quoteId);
    setFlash(success ? "Presupuesto anulado." : "No se pudo anular el presupuesto.");
  };

  const openEditor = async (quoteId: string) => {
    if (mode === "emision") {
      await workspace.openQuote(quoteId);
      return;
    }
    if (mode === "emitidos") {
      navigate(`/presupuestos/vista-previa?quote=${encodeURIComponent(quoteId)}`);
      return;
    }

    navigate(`/presupuestos/emision?highlight=${encodeURIComponent(quoteId)}`);
  };

  const breadcrumbLabel = mode === "emision" ? "Emisión" : mode === "borradores" ? "Borradores" : "Emitidos";

  return (
    <div className="doc-page">
      <div className="doc-page__header">
        <div>
          <nav className="doc-breadcrumb">
            <Link to="/">Inicio</Link>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <Link to="/presupuestos/borradores">Presupuestos</Link>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span>{breadcrumbLabel}</span>
          </nav>
          <h1 className="doc-page__title">{meta.title}</h1>
          <p className="doc-page__subtitle">{meta.subtitle}</p>
        </div>
      </div>

      {mode !== "emision" ? (
        <div className="doc-card">
          <div className="doc-card__inner">
            <div className="doc-card__header">
              <div>
                <h3 className="doc-card__heading">
                  {mode === "borradores" ? "Presupuestos en Borrador" : "Presupuestos Emitidos"}
                </h3>
                <span className="doc-card__count">{workspace.quotes.length} {mode === "borradores" ? "borradores guardados" : "presupuestos emitidos"}</span>
              </div>
              <div className="doc-card__actions">
                <div className="doc-search">
                  <span className="doc-search__icon">
                    <svg width="21" height="22" viewBox="0 0 21 22" fill="none"><circle cx="9.8" cy="10.7" r="9" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" /><path d="M16 17.4l3.5 3.5" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </span>
                  <input
                    type="search"
                    value={workspace.search}
                    onChange={(event) => workspace.setSearch(event.target.value)}
                    placeholder="Buscar presupuesto..."
                  />
                </div>
              </div>
            </div>

            {flash ? <p className="doc-flash">{flash}</p> : null}
            {workspace.error ? <ErrorState title="No se pudo completar la operación" description={workspace.error} onRetry={() => void workspace.refresh()} /> : null}

            {workspace.loading ? <LoadingSkeleton message="Cargando presupuestos..." /> : null}

            {!workspace.loading && workspace.quotes.length === 0 ? (
              <EmptyState title="No hay presupuestos" description="Guarda un presupuesto como borrador para verlo aquí." />
            ) : null}

            {!workspace.loading && workspace.quotes.length > 0 ? (
              <div className="doc-table-wrap">
                <table className="doc-table">
                  <thead>
                    <tr>
                      <td><span>Presupuesto</span></td>
                      <td><span>Cliente</span></td>
                      <td><span>Fechas</span></td>
                      <td><span>Importe</span></td>
                      {mode === "emitidos" ? <td><span>Estado</span></td> : null}
                      <td className="doc-table__actions-col"><span>Acciones</span></td>
                    </tr>
                  </thead>
                  <tbody>
                    {workspace.quotes.map((quote) => {
                      const badge = statusBadge(quote.status);
                      return (
                        <tr key={quote.id}>
                          <td>
                            <strong>{quote.quoteNumber || "Sin número"}</strong>
                            <p className="doc-table__sub">Actualizado: {quote.updatedAt.slice(0, 10)}</p>
                          </td>
                          <td>
                            <strong>{quote.clientName}</strong>
                            <p className="doc-table__sub">{quote.currency}</p>
                          </td>
                          <td>
                            <p>{quote.issueDate}</p>
                            <p className="doc-table__sub">Vence: {quote.dueDate || "-"}</p>
                          </td>
                          <td>
                            <strong>{formatCurrency(quote.totalAmount, quote.currency)}</strong>
                          </td>
                          {mode === "emitidos" ? (
                            <td>
                              <span className={`doc-badge ${badge.className}`}>{badge.label}</span>
                              <span className={`doc-badge ${quote.isPaid ? "doc-badge--ok" : "doc-badge--warn"}`}>
                                {quote.isPaid ? "Pagado" : "Pendiente"}
                              </span>
                            </td>
                          ) : null}
                          <td className="doc-table__actions-col">
                            <div className="doc-row-actions">
                              <button type="button" className="doc-action-btn doc-action-btn--sm" onClick={() => void openEditor(quote.id)}>
                                Abrir
                              </button>
                              <button type="button" className="doc-action-btn doc-action-btn--sm" onClick={() => void togglePaid(quote.id, !quote.isPaid)} disabled={workspace.saving}>
                                {quote.isPaid ? "Desmarcar" : "Marcar pagado"}
                              </button>
                              <button
                                type="button"
                                className="doc-action-btn doc-action-btn--sm doc-action-btn--danger"
                                onClick={() => void cancelQuote(quote.id)}
                                disabled={workspace.saving || quote.status === "cancelled"}
                              >
                                Anular
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {mode === "emision" ? (
        <>
          <DocumentEditorForm
            kindLabel="presupuesto"
            editorController={workspace.editorController}
            readOnly={workspace.readOnlyEditor}
            onSelectClient={handleClientSelect}
          />
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
            previewPath="/presupuestos/vista-previa"
            previewQueryParam="draft"
            pdfBrandColor={workspace.pdfBrandColor}
            pdfLogoUrl={workspace.pdfLogoUrl}
          />
        </>
      ) : null}
    </div>
  );
}
