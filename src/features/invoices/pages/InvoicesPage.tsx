import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, Download, Eye, Send, Trash2 } from "lucide-react";
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

  const markEmailed = async (invoiceId: string) => {
    const success = await workspace.markInvoiceEmailed(invoiceId);
    setFlash(success ? "Factura marcada como enviada." : "No se pudo marcar como enviada.");
  };

  const downloadPdf = async (invoiceId: string) => {
    const success = await workspace.downloadInvoicePdf(invoiceId);
    if (!success) setFlash("No se pudo generar el PDF.");
  };

  const summarizeBulk = (verb: string, summary: { ok: number; failed: number } | null) => {
    if (!summary) return;
    if (summary.failed === 0) setFlash(`${summary.ok} ${verb}.`);
    else setFlash(`${summary.ok} ${verb} (${summary.failed} fallaron).`);
  };

  const bulkTogglePaid = async (isPaid: boolean) => {
    const summary = await workspace.togglePaidSelected(isPaid);
    summarizeBulk(isPaid ? "facturas marcadas como pagadas" : "facturas desmarcadas como pagadas", summary);
  };

  const bulkMarkEmailed = async () => {
    if (!window.confirm("Marcar las facturas seleccionadas como enviadas? Esta acción no se puede deshacer.")) return;
    const summary = await workspace.markEmailedSelected();
    summarizeBulk("facturas marcadas como enviadas", summary);
  };

  const bulkCancel = async () => {
    if (!window.confirm("Anular las facturas seleccionadas? Esta acción no se puede deshacer.")) return;
    const summary = await workspace.cancelSelected();
    summarizeBulk("facturas anuladas", summary);
  };

  const bulkDownloadZip = async () => {
    setFlash(`Generando ZIP de ${workspace.selectedCount} facturas...`);
    const summary = await workspace.downloadSelectedAsZip();
    summarizeBulk("PDFs incluidos en el ZIP", summary);
  };

  const openEditor = async (invoiceId: string) => {
    if (mode === "emision") {
      await workspace.openInvoice(invoiceId);
      return;
    }
    if (mode === "emitidas") {
      navigate(`/facturas/vista-previa?draft=${encodeURIComponent(invoiceId)}`);
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
                <span className="doc-card__count">
                  {workspace.invoices.length} {mode === "borradores" ? "borradores guardados" : "facturas emitidas"}
                  {mode === "emitidas" && workspace.yearFilter !== "all" ? ` en ${workspace.yearFilter}` : ""}
                </span>
              </div>
              <div className="doc-card__actions">
                {mode === "emitidas" ? (
                  <select
                    className="pilot-input doc-year-select"
                    value={String(workspace.yearFilter)}
                    onChange={(event) => {
                      const value = event.target.value;
                      workspace.setYearFilter(value === "all" ? "all" : Number.parseInt(value, 10));
                    }}
                  >
                    <option value="all">Todos los años</option>
                    {workspace.availableYears.map((year) => (
                      <option key={year} value={String(year)}>{year}</option>
                    ))}
                  </select>
                ) : null}
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

            {!workspace.loading && workspace.invoices.length > 0 ? (() => {
              const isEmitidas = mode === "emitidas";
              const rows = isEmitidas ? workspace.pageInvoices : workspace.invoices;
              const pageAllChecked = isEmitidas && rows.length > 0 && rows.every((invoice) => workspace.selectedIds.has(invoice.id));
              const sortIndicator = (field: typeof workspace.sortMode.field): string => {
                if (workspace.sortMode.field !== field) return "";
                return workspace.sortMode.dir === "asc" ? " ↑" : " ↓";
              };
              const headerClass = (field: typeof workspace.sortMode.field): string =>
                `doc-table__sortable${workspace.sortMode.field === field ? " doc-table__sortable--active" : ""}`;
              return (
                <>
                  {isEmitidas && workspace.selectedCount > 0 ? (
                    <div className="pilot-bulk-bar">
                      <span>{workspace.selectedCount} seleccionadas</span>
                      <div className="pilot-inline-actions">
                        <button type="button" className="pilot-btn" disabled={workspace.saving} onClick={() => void bulkTogglePaid(true)}>
                          Marcar pagadas
                        </button>
                        <button type="button" className="pilot-btn" disabled={workspace.saving} onClick={() => void bulkTogglePaid(false)}>
                          Desmarcar pagadas
                        </button>
                        <button type="button" className="pilot-btn" disabled={workspace.saving} onClick={() => void bulkMarkEmailed()}>
                          Marcar enviadas
                        </button>
                        <button type="button" className="pilot-btn" disabled={workspace.saving} onClick={() => void bulkDownloadZip()}>
                          Descargar PDFs (ZIP)
                        </button>
                        <button type="button" className="pilot-btn pilot-btn--danger" disabled={workspace.saving} onClick={() => void bulkCancel()}>
                          Anular
                        </button>
                        <button type="button" className="pilot-btn" onClick={workspace.clearSelection}>
                          Limpiar selección
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <div className="doc-table-wrap">
                    <table className="doc-table">
                      <thead>
                        <tr>
                          {isEmitidas ? (
                            <td className="w-10">
                              <input type="checkbox" checked={pageAllChecked} onChange={(event) => workspace.togglePageSelection(event.target.checked)} />
                            </td>
                          ) : null}
                          {isEmitidas ? (
                            <td>
                              <button type="button" className={headerClass("invoiceNumber")} onClick={() => workspace.toggleSort("invoiceNumber")}>
                                Factura{sortIndicator("invoiceNumber")}
                              </button>
                            </td>
                          ) : (
                            <td><span>Factura</span></td>
                          )}
                          {isEmitidas ? (
                            <td>
                              <button type="button" className={headerClass("clientName")} onClick={() => workspace.toggleSort("clientName")}>
                                Cliente{sortIndicator("clientName")}
                              </button>
                            </td>
                          ) : (
                            <td><span>Cliente</span></td>
                          )}
                          {isEmitidas ? (
                            <td>
                              <button type="button" className={headerClass("issueDate")} onClick={() => workspace.toggleSort("issueDate")}>
                                Fechas{sortIndicator("issueDate")}
                              </button>
                            </td>
                          ) : (
                            <td><span>Fechas</span></td>
                          )}
                          {isEmitidas ? (
                            <td>
                              <button type="button" className={headerClass("totalAmount")} onClick={() => workspace.toggleSort("totalAmount")}>
                                Importe{sortIndicator("totalAmount")}
                              </button>
                            </td>
                          ) : (
                            <td><span>Importe</span></td>
                          )}
                          {isEmitidas ? <td><span>Estado</span></td> : null}
                          <td className="doc-table__actions-col"><span>Acciones</span></td>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((invoice) => {
                          const rawNumber = invoice.invoiceNumber || "";
                          const seriesCode = invoice.invoiceSeries || "";
                          const displayNumber = rawNumber
                            ? (seriesCode && !rawNumber.toUpperCase().includes(seriesCode.toUpperCase())
                                ? `${seriesCode}-${rawNumber}`
                                : rawNumber)
                            : "Sin número";
                          const selected = workspace.selectedIds.has(invoice.id);
                          return (
                            <tr key={invoice.id}>
                              {isEmitidas ? (
                                <td className="w-10">
                                  <input type="checkbox" checked={selected} onChange={(event) => workspace.toggleSelected(invoice.id, event.target.checked)} />
                                </td>
                              ) : null}
                              <td>
                                <strong>{displayNumber}</strong>
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
                              {isEmitidas ? (
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
                                {isEmitidas ? (
                                  <div className="tx-actions-cell">
                                    <button type="button" className="tx-action-icon" data-tooltip="Abrir" aria-label="Abrir" onClick={() => void openEditor(invoice.id)}>
                                      <Eye size={18} />
                                    </button>
                                    <button
                                      type="button"
                                      className={`tx-action-icon ${invoice.isPaid ? "tx-action-icon--ok" : ""}`}
                                      data-tooltip={invoice.isPaid ? "Desmarcar pago" : "Marcar pagada"}
                                      aria-label={invoice.isPaid ? "Desmarcar pago" : "Marcar pagada"}
                                      disabled={workspace.saving || invoice.status === "cancelled"}
                                      onClick={() => void togglePaid(invoice.id, !invoice.isPaid)}
                                    >
                                      <Check size={18} />
                                    </button>
                                    <button
                                      type="button"
                                      className="tx-action-icon"
                                      data-tooltip={invoice.emailSent ? "Ya marcada como enviada" : "Marcar como enviada"}
                                      aria-label={invoice.emailSent ? "Ya marcada como enviada" : "Marcar como enviada"}
                                      disabled={workspace.saving || invoice.emailSent}
                                      onClick={() => void markEmailed(invoice.id)}
                                    >
                                      <Send size={18} />
                                    </button>
                                    <button
                                      type="button"
                                      className="tx-action-icon"
                                      data-tooltip="Descargar PDF"
                                      aria-label="Descargar PDF"
                                      disabled={workspace.saving}
                                      onClick={() => void downloadPdf(invoice.id)}
                                    >
                                      <Download size={18} />
                                    </button>
                                    <button
                                      type="button"
                                      className="tx-action-icon tx-action-icon--delete"
                                      data-tooltip="Anular"
                                      aria-label="Anular"
                                      disabled={workspace.saving || invoice.status === "cancelled"}
                                      onClick={() => void cancelInvoice(invoice.id)}
                                    >
                                      <Trash2 size={18} />
                                    </button>
                                  </div>
                                ) : (
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
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {isEmitidas ? (
                    <div className="pilot-pagination">
                      <button type="button" className="pilot-btn" disabled={workspace.page <= 1} onClick={() => workspace.setPage(workspace.page - 1)}>
                        Anterior
                      </button>
                      <span className="text-sm">
                        Página {workspace.page} de {workspace.totalPages} · {workspace.invoices.length} facturas
                      </span>
                      <button type="button" className="pilot-btn" disabled={workspace.page >= workspace.totalPages} onClick={() => workspace.setPage(workspace.page + 1)}>
                        Siguiente
                      </button>
                    </div>
                  ) : null}
                </>
              );
            })() : null}
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
            emitErrorMessage={workspace.error}
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
