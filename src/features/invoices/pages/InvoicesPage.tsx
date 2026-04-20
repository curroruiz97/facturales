import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { EmptyState } from "../../../app/components/states/EmptyState";
import { ErrorState } from "../../../app/components/states/ErrorState";
import { LoadingSkeleton } from "../../../app/components/states/LoadingSkeleton";
import { DocumentEditorForm } from "../../documents/components/DocumentEditorForm";
import { DocumentActionBar } from "../../documents/components/DocumentActionBar";
import type { ClientPickerOption } from "../../documents/components/ClientPicker";
import { useInvoicesWorkspace } from "../hooks/use-invoices-workspace";

export type InvoicePageMode = "emision" | "borradores" | "emitidas";

interface InvoicesPageProps {
  mode: InvoicePageMode;
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

function modeMeta(mode: InvoicePageMode): { title: string; subtitle: string; statusFilter: "all" | "draft" | "issued" | "cancelled" } {
  if (mode === "borradores") {
    return {
      title: "Borradores de facturas",
      subtitle: "Gestiona tus facturas guardadas como borrador para continuar más tarde.",
      statusFilter: "draft",
    };
  }

  if (mode === "emitidas") {
    return {
      title: "Facturas emitidas",
      subtitle: "Visualiza y gestiona todas tus facturas emitidas en un solo lugar.",
      statusFilter: "issued",
    };
  }

  return {
    title: "Emitir factura",
    subtitle: "Completa los datos y emite una factura profesional.",
    statusFilter: "all",
  };
}

function statusBadge(status: "draft" | "issued" | "cancelled"): { label: string; className: string } {
  if (status === "issued") return { label: "Emitida", className: "doc-badge--orange" };
  if (status === "cancelled") return { label: "Anulada", className: "pilot-status--warn" };
  return { label: "Borrador", className: "pilot-status--warn" };
}

export function InvoicesPage({ mode }: InvoicesPageProps): import("react").JSX.Element {
  const workspace = useInvoicesWorkspace();
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
    setFlash(result.ok ? "Factura guardada como borrador." : (result.error || "No se pudo guardar el borrador."));
    return result.ok ? (result.id ?? null) : null;
  };

  const emitActive = async (): Promise<boolean> => {
    const success = await workspace.emitActive();
    if (!success) setFlash(workspace.error || "No se pudo emitir la factura.");
    return success;
  };

  const togglePaid = async (invoiceId: string, isPaid: boolean) => {
    const success = await workspace.togglePaid(invoiceId, isPaid);
    setFlash(success ? "Estado de pago actualizado." : "No se pudo actualizar el pago.");
  };

  const cancelInvoice = async (invoiceId: string) => {
    const success = await workspace.cancelInvoice(invoiceId);
    setFlash(success ? "Factura anulada." : "No se pudo anular la factura.");
  };

  const openEditor = async (invoiceId: string) => {
    if (mode === "emision") {
      await workspace.openInvoice(invoiceId);
      return;
    }
    if (mode === "emitidas") {
      navigate(`/facturas/vista-previa?invoice=${encodeURIComponent(invoiceId)}`);
      return;
    }

    navigate(`/facturas/emision?highlight=${encodeURIComponent(invoiceId)}`);
  };

  const breadcrumbLabel = mode === "emision" ? "Emisión" : mode === "borradores" ? "Borradores" : "Emitidas";

  return (
    <div className="doc-page">
      <div className="doc-page__header">
        <div>
          <nav className="doc-breadcrumb">
            <Link to="/">Inicio</Link>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <Link to="/facturas/borradores">Facturas</Link>
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
                  {mode === "borradores" ? "Facturas en Borrador" : "Facturas Emitidas"}
                </h3>
                <span className="doc-card__count">{workspace.invoices.length} {mode === "borradores" ? "borradores guardados" : "facturas emitidas"}</span>
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
                    placeholder="Buscar factura..."
                  />
                </div>
              </div>
            </div>

            {flash ? <p className="doc-flash">{flash}</p> : null}
            {workspace.error ? <ErrorState title="No se pudo completar la operación" description={workspace.error} onRetry={() => void workspace.refresh()} /> : null}

            {workspace.loading ? <LoadingSkeleton message="Cargando facturas..." /> : null}

            {!workspace.loading && workspace.invoices.length === 0 ? (
              <EmptyState title="No hay facturas" description="Guarda una factura como borrador para verla aquí." />
            ) : null}

            {!workspace.loading && workspace.invoices.length > 0 ? (
              <div className="doc-table-wrap">
                <table className="doc-table">
                  <thead>
                    <tr>
                      <td><span>Factura</span></td>
                      <td><span>Cliente</span></td>
                      <td><span>Fechas</span></td>
                      <td><span>Importe</span></td>
                      {mode === "emitidas" ? <td><span>Estado</span></td> : null}
                      <td className="doc-table__actions-col"><span>Acciones</span></td>
                    </tr>
                  </thead>
                  <tbody>
                    {workspace.invoices.map((invoice) => {
                      const badge = statusBadge(invoice.status);
                      return (
                        <tr key={invoice.id}>
                          <td>
                            <strong>{invoice.invoiceNumber || "Sin número"}</strong>
                            <p className="doc-table__sub">Actualizada: {invoice.updatedAt.slice(0, 10)}</p>
                          </td>
                          <td>
                            <strong>{invoice.clientName}</strong>
                            <p className="doc-table__sub">{invoice.currency}</p>
                          </td>
                          <td>
                            <p>{invoice.issueDate}</p>
                            <p className="doc-table__sub">Vence: {invoice.dueDate || "-"}</p>
                          </td>
                          <td>
                            <strong>{formatCurrency(invoice.totalAmount, invoice.currency)}</strong>
                          </td>
                          {mode === "emitidas" ? (
                            <td>
                              <span className={`doc-badge ${invoice.isPaid ? "doc-badge--ok" : "doc-badge--warn"}`}>
                                {invoice.isPaid ? "Pagada" : "No pagada"}
                              </span>
                              <span className={`doc-badge ${invoice.emailSent ? "doc-badge--sent" : "doc-badge--not-sent"}`}>
                                {invoice.emailSent ? "Enviada" : "No enviada"}
                              </span>
                            </td>
                          ) : null}
                          <td className="doc-table__actions-col">
                            <div className="doc-row-actions">
                              <button type="button" className="doc-action-btn doc-action-btn--sm" onClick={() => void openEditor(invoice.id)}>
                                Abrir
                              </button>
                              <button type="button" className="doc-action-btn doc-action-btn--sm" onClick={() => void togglePaid(invoice.id, !invoice.isPaid)} disabled={workspace.saving}>
                                {invoice.isPaid ? "Desmarcar pago" : "Marcar pagada"}
                              </button>
                              <button
                                type="button"
                                className="doc-action-btn doc-action-btn--sm doc-action-btn--danger"
                                onClick={() => void cancelInvoice(invoice.id)}
                                disabled={workspace.saving || invoice.status === "cancelled"}
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
            kindLabel="factura"
            editorController={workspace.editorController}
            readOnly={workspace.readOnlyEditor}
            onSelectClient={handleClientSelect}
          />
          <DocumentActionBar
            kindLabel="factura"
            documentKind="invoice"
            activeDocumentId={workspace.activeInvoiceId}
            saving={workspace.saving}
            readOnly={workspace.readOnlyEditor}
            editorController={workspace.editorController}
            onSaveDraft={saveDraft}
            onEmit={emitActive}
            flash={flash}
            setFlash={setFlash}
            previewPath="/facturas/vista-previa"
            previewQueryParam="draft"
            pdfBrandColor={workspace.pdfBrandColor}
            pdfLogoUrl={workspace.pdfLogoUrl}
          />
        </>
      ) : null}
    </div>
  );
}
