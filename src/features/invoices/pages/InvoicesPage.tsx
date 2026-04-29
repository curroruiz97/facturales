import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, Download, Eye, Send, Trash2 } from "lucide-react";
import { EmptyState } from "../../../app/components/states/EmptyState";
import { ErrorState } from "../../../app/components/states/ErrorState";
import { LoadingSkeleton } from "../../../app/components/states/LoadingSkeleton";
import { DocumentEditorForm } from "../../documents/components/DocumentEditorForm";
import { DocumentActionBar } from "../../documents/components/DocumentActionBar";
import type { ClientPickerOption } from "../../documents/components/ClientPicker";
import { INVOICE_PAGE_SIZE_OPTIONS, type InvoicePageSize, type InvoiceSortField, useInvoicesWorkspace } from "../hooks/use-invoices-workspace";
import { buildPageList } from "../../../app/components/pagination/build-page-list";

export type InvoicePageMode = "emision" | "borradores" | "emitidas";

interface InvoicesPageProps {
  mode: InvoicePageMode;
}

function resolveInitials(name: string | null | undefined): string {
  if (!name?.trim()) return "SC";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  const initials = parts.map((part) => part.charAt(0).toUpperCase()).join("");
  return initials || "SC";
}

function formatDateEs(dateISO: string | null | undefined): string {
  if (!dateISO) return "-";
  const date = new Date(`${dateISO}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateISO;
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

const IconSearchSvg = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
);
const IconFilterSvg = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
);
const IconSortNone = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="7 11 12 6 17 11"/><polyline points="7 13 12 18 17 13"/></svg>
);
const IconSortAsc = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="6 15 12 9 18 15"/></svg>
);
const IconSortDesc = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
);

interface SortableHeaderProps {
  label: string;
  field: InvoiceSortField;
  current: { field: InvoiceSortField; dir: "asc" | "desc" };
  onToggle: (field: InvoiceSortField) => void;
  className?: string;
}

function SortableHeader({ label, field, current, onToggle, className }: SortableHeaderProps): import("react").JSX.Element {
  const direction = current.field === field ? current.dir : null;
  const ariaSort = direction === "asc" ? "ascending" : direction === "desc" ? "descending" : "none";
  return (
    <th className={className} aria-sort={ariaSort}>
      <button
        type="button"
        className={`tx-table__sort ${direction ? "tx-table__sort--active" : ""}`}
        onClick={() => onToggle(field)}
        title={`Ordenar por ${label}`}
      >
        <span>{label}</span>
        <span className="tx-table__sort-icon" aria-hidden="true">
          {direction === "asc" ? <IconSortAsc /> : direction === "desc" ? <IconSortDesc /> : <IconSortNone />}
        </span>
      </button>
    </th>
  );
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
  const [filtersOpen, setFiltersOpen] = useState(false);
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
            </div>

            {mode === "emitidas" ? (
              <>
                <div className="tx-search-bar">
                  <div className="tx-search-bar__input-wrap">
                    <span className="tx-search-bar__icon"><IconSearchSvg /></span>
                    <input
                      className="tx-search-bar__input"
                      type="search"
                      value={workspace.search}
                      onChange={(event) => workspace.setSearch(event.target.value)}
                      placeholder="Buscar factura..."
                    />
                  </div>
                  <button
                    type="button"
                    className={`tx-search-bar__filter-btn ${workspace.hasActiveFilters ? "tx-search-bar__filter-btn--active" : ""}`}
                    onClick={() => setFiltersOpen((open) => !open)}
                  >
                    <IconFilterSvg />
                    Filtros
                  </button>
                </div>
                {filtersOpen ? (
                  <div className="tx-filters">
                    <div className="tx-filters__row">
                      <label className="tx-filters__field">
                        <span className="tx-filters__label">Año</span>
                        <select
                          className="tx-filters__select"
                          value={String(workspace.yearFilter)}
                          onChange={(event) => {
                            const value = event.target.value;
                            workspace.setYearFilter(value === "all" ? "all" : Number.parseInt(value, 10));
                          }}
                        >
                          <option value="all">Todos</option>
                          {workspace.availableYears.map((year) => (
                            <option key={year} value={String(year)}>{year}</option>
                          ))}
                        </select>
                      </label>
                      <label className="tx-filters__field">
                        <span className="tx-filters__label">Estado de pago</span>
                        <select
                          className="tx-filters__select"
                          value={workspace.paymentFilter}
                          onChange={(event) => workspace.setPaymentFilter(event.target.value as typeof workspace.paymentFilter)}
                        >
                          <option value="all">Todas</option>
                          <option value="paid">Pagadas</option>
                          <option value="unpaid">No pagadas</option>
                        </select>
                      </label>
                    </div>
                    <div className="tx-filters__row">
                      <label className="tx-filters__field">
                        <span className="tx-filters__label">Estado de envío</span>
                        <select
                          className="tx-filters__select"
                          value={workspace.emailFilter}
                          onChange={(event) => workspace.setEmailFilter(event.target.value as typeof workspace.emailFilter)}
                        >
                          <option value="all">Todas</option>
                          <option value="sent">Enviadas</option>
                          <option value="unsent">No enviadas</option>
                        </select>
                      </label>
                      <span />
                    </div>
                    {workspace.hasActiveFilters ? (
                      <button type="button" className="tx-filters__clear" onClick={workspace.resetFilters}>
                        Limpiar filtros
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </>
            ) : (
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
            )}

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

                  <div className={isEmitidas ? "overflow-auto" : "doc-table-wrap"}>
                    <table className={isEmitidas ? "pilot-table tx-table" : "doc-table"}>
                      <thead>
                        <tr>
                          {isEmitidas ? (
                            <th className="w-10">
                              <input
                                type="checkbox"
                                checked={pageAllChecked}
                                onChange={(event) => workspace.togglePageSelection(event.target.checked, rows.map((invoice) => invoice.id))}
                              />
                            </th>
                          ) : null}
                          {isEmitidas ? (
                            <SortableHeader label="Factura" field="invoiceNumber" current={workspace.sortMode} onToggle={workspace.toggleSort} />
                          ) : (
                            <td><span>Factura</span></td>
                          )}
                          {isEmitidas ? (
                            <SortableHeader label="Cliente" field="clientName" current={workspace.sortMode} onToggle={workspace.toggleSort} />
                          ) : (
                            <td><span>Cliente</span></td>
                          )}
                          {isEmitidas ? (
                            <SortableHeader label="Fechas" field="issueDate" current={workspace.sortMode} onToggle={workspace.toggleSort} />
                          ) : (
                            <td><span>Fechas</span></td>
                          )}
                          {isEmitidas ? (
                            <SortableHeader label="Importe" field="totalAmount" current={workspace.sortMode} onToggle={workspace.toggleSort} />
                          ) : (
                            <td><span>Importe</span></td>
                          )}
                          {isEmitidas ? <th>Estado</th> : null}
                          {isEmitidas ? (
                            <th className="text-right">Acciones</th>
                          ) : (
                            <td className="doc-table__actions-col"><span>Acciones</span></td>
                          )}
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
                                <p className={isEmitidas ? "text-xs opacity-70" : "doc-table__sub"}>Actualizada: {isEmitidas ? formatDateEs(invoice.updatedAt.slice(0, 10)) : invoice.updatedAt.slice(0, 10)}</p>
                              </td>
                              <td>
                                {isEmitidas ? (
                                  <div className="flex items-center gap-2">
                                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-success-100 text-xs font-bold text-success-700">
                                      {resolveInitials(invoice.clientName)}
                                    </span>
                                    <div>
                                      <strong>{invoice.clientName}</strong>
                                      <p className="text-xs opacity-70">{invoice.currency}</p>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <strong>{invoice.clientName}</strong>
                                    <p className="doc-table__sub">{invoice.currency}</p>
                                  </>
                                )}
                              </td>
                              <td>
                                <p>{isEmitidas ? formatDateEs(invoice.issueDate) : invoice.issueDate}</p>
                                <p className={isEmitidas ? "text-xs opacity-70" : "doc-table__sub"}>Vence: {isEmitidas ? formatDateEs(invoice.dueDate) : (invoice.dueDate || "-")}</p>
                              </td>
                              <td>
                                <strong className={isEmitidas ? "pilot-text-ok" : undefined}>{formatCurrency(invoice.totalAmount, invoice.currency)}</strong>
                              </td>
                              {isEmitidas ? (
                                <td>
                                  <div className="flex flex-col gap-1 items-start">
                                    <span className={`pilot-status ${invoice.isPaid ? "pilot-status--ok" : "pilot-status--warn"}`}>
                                      {invoice.isPaid ? "Pagada" : "No pagada"}
                                    </span>
                                    <span className={`pilot-status ${invoice.emailSent ? "pilot-status--ok" : "pilot-status--warn"}`}>
                                      {invoice.emailSent ? "Enviada" : "No enviada"}
                                    </span>
                                  </div>
                                </td>
                              ) : null}
                              <td className={isEmitidas ? "text-right" : "doc-table__actions-col"}>
                                {isEmitidas ? (
                                  <div className="tx-actions-cell">
                                    <button type="button" className="tx-action-icon tx-action-icon--link" data-tooltip="Abrir" aria-label="Abrir" onClick={() => void openEditor(invoice.id)}>
                                      <Eye size={16} />
                                    </button>
                                    <button
                                      type="button"
                                      className={`tx-action-icon ${invoice.isPaid ? "tx-action-icon--ok" : ""}`}
                                      data-tooltip={invoice.isPaid ? "Desmarcar pago" : "Marcar pagada"}
                                      aria-label={invoice.isPaid ? "Desmarcar pago" : "Marcar pagada"}
                                      disabled={workspace.saving || invoice.status === "cancelled"}
                                      onClick={() => void togglePaid(invoice.id, !invoice.isPaid)}
                                    >
                                      <Check size={16} />
                                    </button>
                                    <button
                                      type="button"
                                      className="tx-action-icon tx-action-icon--edit"
                                      data-tooltip={invoice.emailSent ? "Ya marcada como enviada" : "Marcar como enviada"}
                                      aria-label={invoice.emailSent ? "Ya marcada como enviada" : "Marcar como enviada"}
                                      disabled={workspace.saving || invoice.emailSent}
                                      onClick={() => void markEmailed(invoice.id)}
                                    >
                                      <Send size={16} />
                                    </button>
                                    <button
                                      type="button"
                                      className="tx-action-icon"
                                      data-tooltip="Descargar PDF"
                                      aria-label="Descargar PDF"
                                      disabled={workspace.saving}
                                      onClick={() => void downloadPdf(invoice.id)}
                                    >
                                      <Download size={16} />
                                    </button>
                                    <button
                                      type="button"
                                      className="tx-action-icon tx-action-icon--delete"
                                      data-tooltip="Anular"
                                      aria-label="Anular"
                                      disabled={workspace.saving || invoice.status === "cancelled"}
                                      onClick={() => void cancelInvoice(invoice.id)}
                                    >
                                      <Trash2 size={16} />
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

                  {isEmitidas ? (() => {
                    const startIdx = (workspace.page - 1) * workspace.pageSize + 1;
                    const endIdx = Math.min(workspace.page * workspace.pageSize, workspace.totalItems);
                    return (
                      <div className="tx-pagination">
                        <div className="tx-pagination__left">
                          <span className="tx-pagination__info">
                            Mostrando {startIdx}–{endIdx} de {workspace.totalItems}
                          </span>
                          <label className="tx-pagination__page-size">
                            <span>Por página:</span>
                            <select
                              value={workspace.pageSize}
                              onChange={(event) => workspace.setPageSize(Number(event.target.value) as InvoicePageSize)}
                            >
                              {INVOICE_PAGE_SIZE_OPTIONS.map((size) => (
                                <option key={size} value={size}>{size}</option>
                              ))}
                            </select>
                          </label>
                        </div>
                        <div className="tx-pagination__controls">
                          <button type="button" className="tx-pagination__btn" disabled={workspace.page <= 1} onClick={() => workspace.setPage(workspace.page - 1)} aria-label="Página anterior">
                            ‹
                          </button>
                          {buildPageList(workspace.page, workspace.totalPages).map((entry, index) =>
                            entry === "..." ? (
                              <span key={`ellipsis-${index}`} className="tx-pagination__ellipsis" aria-hidden="true">…</span>
                            ) : (
                              <button
                                key={entry}
                                type="button"
                                className={`tx-pagination__btn ${entry === workspace.page ? "tx-pagination__btn--active" : ""}`}
                                onClick={() => workspace.setPage(entry)}
                                aria-current={entry === workspace.page ? "page" : undefined}
                                aria-label={`Página ${entry}`}
                              >
                                {entry}
                              </button>
                            ),
                          )}
                          <button type="button" className="tx-pagination__btn" disabled={workspace.page >= workspace.totalPages} onClick={() => workspace.setPage(workspace.page + 1)} aria-label="Página siguiente">
                            ›
                          </button>
                        </div>
                        <label className="tx-pagination__select-all">
                          <input
                            type="checkbox"
                            checked={pageAllChecked}
                            onChange={(event) => workspace.togglePageSelection(event.target.checked, rows.map((invoice) => invoice.id))}
                          />
                          <span>Seleccionar página</span>
                        </label>
                      </div>
                    );
                  })() : null}
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
