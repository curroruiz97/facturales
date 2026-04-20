import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { EmptyState } from "../../../app/components/states/EmptyState";
import { ErrorState } from "../../../app/components/states/ErrorState";
import { LoadingSkeleton } from "../../../app/components/states/LoadingSkeleton";
import { TRANSACTION_CATEGORY_LABELS, type TransactionLedgerItem } from "../domain/transactions-domain";
import { TransactionDeleteModal } from "../components/TransactionDeleteModal";
import { TransactionFormModal, type TransactionFormValues } from "../components/TransactionFormModal";
import { TransactionsTable } from "../components/TransactionsTable";
import { useTransactionsLedger } from "../hooks/use-transactions-ledger";

const DEFAULT_FORM_VALUES: TransactionFormValues = {
  clienteId: "",
  concepto: "",
  categoria: "material_oficina",
  tipo: "gasto",
  importe: "",
  ivaPorcentaje: "",
  irpfPorcentaje: "",
  fecha: new Date().toISOString().slice(0, 10),
  observaciones: "",
};

type FormMode = "create" | "edit";
type DeleteMode = "single" | "bulk";

function toFormValues(transaction: TransactionLedgerItem): TransactionFormValues {
  return {
    clienteId: transaction.clienteId ?? "",
    concepto: transaction.concepto,
    categoria: transaction.categoria === "factura" ? "otros" : transaction.categoria,
    tipo: transaction.tipo,
    importe: String(transaction.importe),
    ivaPorcentaje: transaction.ivaPorcentaje !== null ? String(transaction.ivaPorcentaje) : "",
    irpfPorcentaje: transaction.irpfPorcentaje !== null ? String(transaction.irpfPorcentaje) : "",
    fecha: transaction.fecha,
    observaciones: transaction.observaciones ?? "",
  };
}

function parseNumberOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

const IconSearch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
);

const IconFilter = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
);

const IconPlus = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
);

const IconCreditCard = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
);

const IconUserPlus = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
);

const IconUser = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
);

const IconFilePlus = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
);

const IconFileText = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
);

const IconClipboardList = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><line x1="10" y1="12" x2="16" y2="12"/><line x1="10" y1="16" x2="16" y2="16"/><circle cx="7" cy="12" r="0.5" fill="currentColor"/><circle cx="7" cy="16" r="0.5" fill="currentColor"/></svg>
);

const IconClipboard = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
);

const IconChevronRight = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
);

export function TransactionsPage(): import("react").JSX.Element {
  const ledger = useTransactionsLedger();
  const location = useLocation();
  const navigate = useNavigate();
  const [flash, setFlash] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [editTransactionId, setEditTransactionId] = useState<string | null>(null);
  const [formInitialValues, setFormInitialValues] = useState<TransactionFormValues>(DEFAULT_FORM_VALUES);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteMode, setDeleteMode] = useState<DeleteMode>("single");
  const [deleteTarget, setDeleteTarget] = useState<TransactionLedgerItem | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const openCreateModal = () => {
    setFlash(null);
    setFormMode("create");
    setEditTransactionId(null);
    setFormInitialValues(DEFAULT_FORM_VALUES);
    setFormOpen(true);
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("action") !== "create") return;

    openCreateModal();
    params.delete("action");
    navigate(
      {
        pathname: location.pathname,
        search: params.toString() ? `?${params.toString()}` : "",
      },
      { replace: true },
    );
  }, [location.pathname, location.search, navigate]);

  const openEditModal = (transaction: TransactionLedgerItem) => {
    setFlash(null);
    setFormMode("edit");
    setEditTransactionId(transaction.id);
    setFormInitialValues(toFormValues(transaction));
    setFormOpen(true);
  };

  const closeFormModal = () => {
    setFormOpen(false);
    setEditTransactionId(null);
  };

  const openSingleDelete = (transaction: TransactionLedgerItem) => {
    setDeleteMode("single");
    setDeleteTarget(transaction);
    setDeleteOpen(true);
  };

  const openBulkDelete = () => {
    setDeleteMode("bulk");
    setDeleteTarget(null);
    setDeleteOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteOpen(false);
    setDeleteTarget(null);
  };

  const submitForm = async (values: TransactionFormValues) => {
    const payload = {
      clienteId: values.clienteId || null,
      concepto: values.concepto.trim(),
      categoria: values.categoria,
      tipo: values.tipo,
      importe: Number.parseFloat(values.importe),
      ivaPorcentaje: parseNumberOrNull(values.ivaPorcentaje),
      irpfPorcentaje: parseNumberOrNull(values.irpfPorcentaje),
      fecha: values.fecha,
      observaciones: values.observaciones.trim() || null,
    };

    const success =
      formMode === "create"
        ? await ledger.createTransaction(payload)
        : editTransactionId
          ? await ledger.updateTransaction(editTransactionId, payload)
          : false;

    if (!success) {
      setFlash("No se pudo guardar la transacción.");
      return;
    }

    setFlash(formMode === "create" ? "Transacción creada correctamente." : "Transacción actualizada correctamente.");
    closeFormModal();
  };

  const confirmDelete = async () => {
    if (deleteMode === "single" && deleteTarget) {
      const success = await ledger.deleteTransaction(deleteTarget.id);
      setFlash(success ? "Transacción eliminada correctamente." : "No se pudo eliminar la transacción.");
      closeDeleteModal();
      return;
    }

    const summary = await ledger.deleteSelectedTransactions();
    if (!summary) {
      setFlash("No se pudo completar el borrado masivo.");
      closeDeleteModal();
      return;
    }

    if (summary.locked > 0) {
      setFlash(`Se eliminaron ${summary.deleted}. ${summary.locked} transacciones bloqueadas por factura y ${summary.failed - summary.locked} con error.`);
    } else if (summary.failed > 0) {
      setFlash(`Se eliminaron ${summary.deleted} transacciones y ${summary.failed} fallaron.`);
    } else {
      setFlash(`Se eliminaron ${summary.deleted} transacciones.`);
    }
    closeDeleteModal();
  };

  const pageSelectAllChecked =
    ledger.pageTransactions.filter((transaction) => !transaction.lockedByInvoice).length > 0 &&
    ledger.pageTransactions.filter((transaction) => !transaction.lockedByInvoice).every((transaction) => ledger.selectedIds.has(transaction.id));

  const hasActiveFilters = ledger.typeFilter !== "all" || ledger.categoryFilter !== "all" || !!ledger.startDate || !!ledger.endDate || !!ledger.minAmount || !!ledger.maxAmount;

  return (
    <>
      <div className="pilot-dashboard-layout">
        <section className="pilot-grid">
          {/* Header */}
          <section className="pilot-panel">
            <h2 className="tx-page__title">Gastos</h2>

            {/* Search bar + filter button */}
            <div className="tx-search-bar">
              <div className="tx-search-bar__input-wrap">
                <span className="tx-search-bar__icon"><IconSearch /></span>
                <input
                  className="tx-search-bar__input"
                  type="search"
                  value={ledger.searchTerm}
                  onChange={(event) => ledger.setSearchTerm(event.target.value)}
                  placeholder="Buscar..."
                />
              </div>
              <button
                type="button"
                className={`tx-search-bar__filter-btn ${hasActiveFilters ? "tx-search-bar__filter-btn--active" : ""}`}
                onClick={() => setFiltersOpen(!filtersOpen)}
              >
                <IconFilter />
                Filtros
              </button>
            </div>

            {/* Filter panel (collapsible) */}
            {filtersOpen ? (
              <div className="tx-filters">
                <div className="tx-filters__row">
                  <label className="tx-filters__field">
                    <span className="tx-filters__label">Categoría</span>
                    <select className="tx-filters__select" value={ledger.categoryFilter} onChange={(event) => ledger.setCategoryFilter(event.target.value as typeof ledger.categoryFilter)}>
                      <option value="all">Todas</option>
                      {Object.entries(TRANSACTION_CATEGORY_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="tx-filters__field">
                    <span className="tx-filters__label">Tipo</span>
                    <select className="tx-filters__select" value={ledger.typeFilter} onChange={(event) => ledger.setTypeFilter(event.target.value as typeof ledger.typeFilter)}>
                      <option value="all">Todos</option>
                      <option value="gasto">Gasto</option>
                      <option value="ingreso">Ingreso</option>
                    </select>
                  </label>
                </div>
                <div className="tx-filters__row">
                  <label className="tx-filters__field">
                    <span className="tx-filters__label">Fecha desde</span>
                    <input className="tx-filters__input" type="date" value={ledger.startDate} onChange={(e) => ledger.setStartDate(e.target.value)} />
                  </label>
                  <label className="tx-filters__field">
                    <span className="tx-filters__label">Fecha hasta</span>
                    <input className="tx-filters__input" type="date" value={ledger.endDate} onChange={(e) => ledger.setEndDate(e.target.value)} />
                  </label>
                </div>
                <div className="tx-filters__row">
                  <label className="tx-filters__field">
                    <span className="tx-filters__label">Importe mín.</span>
                    <input className="tx-filters__input" type="number" step="0.01" value={ledger.minAmount} onChange={(e) => ledger.setMinAmount(e.target.value)} placeholder="0.00" />
                  </label>
                  <label className="tx-filters__field">
                    <span className="tx-filters__label">Importe máx.</span>
                    <input className="tx-filters__input" type="number" step="0.01" value={ledger.maxAmount} onChange={(e) => ledger.setMaxAmount(e.target.value)} placeholder="0.00" />
                  </label>
                </div>
                {hasActiveFilters ? (
                  <button
                    type="button"
                    className="tx-filters__clear"
                    onClick={() => {
                      ledger.setTypeFilter("all");
                      ledger.setCategoryFilter("all");
                      ledger.setStartDate("");
                      ledger.setEndDate("");
                      ledger.setMinAmount("");
                      ledger.setMaxAmount("");
                    }}
                  >
                    Limpiar filtros
                  </button>
                ) : null}
              </div>
            ) : null}
          </section>

          {/* Transaction list */}
          <section className="pilot-panel">
            {flash ? <p className="pilot-info-text">{flash}</p> : null}
            {ledger.highlightedId ? (
              <p className="pilot-info-text">
                Resultado resaltado desde búsqueda global.
                <button type="button" className="pilot-btn ml-2" onClick={ledger.clearHighlight}>
                  Limpiar resaltado
                </button>
              </p>
            ) : null}

            {ledger.selectedCount > 0 ? (
              <div className="pilot-bulk-bar">
                <span>{ledger.selectedCount} seleccionadas</span>
                <div className="pilot-inline-actions">
                  <button type="button" className="pilot-btn" onClick={ledger.clearSelection}>
                    Limpiar selección
                  </button>
                  <button type="button" className="pilot-btn pilot-btn--danger" onClick={openBulkDelete} disabled={ledger.deleting}>
                    Eliminar seleccionadas
                  </button>
                </div>
              </div>
            ) : null}

            {ledger.error ? <ErrorState title="No se pudo completar la operación" description={ledger.error} onRetry={() => void ledger.refresh()} /> : null}
            {ledger.loading ? <LoadingSkeleton message="Cargando transacciones..." /> : null}
            {!ledger.loading && !ledger.error && ledger.pageTransactions.length === 0 ? (
              <EmptyState title="No hay transacciones en esta vista" description="Ajusta filtros o crea una nueva transacción." />
            ) : null}

            {!ledger.loading && !ledger.error && ledger.pageTransactions.length > 0 ? (
              <>
                <TransactionsTable
                  transactions={ledger.pageTransactions}
                  selectedIds={ledger.selectedIds}
                  highlightedId={ledger.highlightedId}
                  onToggleSelection={ledger.toggleSelected}
                  onTogglePageSelection={ledger.togglePageSelection}
                  onEdit={openEditModal}
                  onDelete={openSingleDelete}
                />
                <div className="tx-pagination">
                  <span className="tx-pagination__info">Mostrando resultados {((ledger.page - 1) * 10) + 1}–{Math.min(ledger.page * 10, ledger.transactions.length)}</span>
                  <div className="tx-pagination__controls">
                    <button type="button" className="tx-pagination__btn" disabled={ledger.page <= 1} onClick={() => ledger.setPage(ledger.page - 1)}>
                      ‹
                    </button>
                    <span className="tx-pagination__page">{ledger.page}</span>
                    <button type="button" className="tx-pagination__btn" disabled={ledger.page >= ledger.totalPages} onClick={() => ledger.setPage(ledger.page + 1)}>
                      ›
                    </button>
                  </div>
                  <label className="tx-pagination__select-all">
                    <input type="checkbox" checked={pageSelectAllChecked} onChange={(event) => ledger.togglePageSelection(event.target.checked)} />
                    <span>Seleccionar página</span>
                  </label>
                </div>
              </>
            ) : null}
          </section>
        </section>

        {/* Sidebar */}
        <aside className="pilot-dashboard-side">
          <section className="pilot-panel tx-sidebar-card">
            <h3 className="tx-sidebar-card__title">¿QUÉ DESEAS HACER?</h3>
            <button type="button" className="tx-sidebar-card__primary" onClick={openCreateModal}>
              <span className="tx-sidebar-card__primary-icon"><IconCreditCard /></span>
              <span className="tx-sidebar-card__primary-text">
                <strong>Añadir gasto</strong>
                <small>Registrar nueva transacción</small>
              </span>
              <span className="tx-sidebar-card__primary-arrow"><IconChevronRight /></span>
            </button>
            <div className="tx-sidebar-card__quick">
              <Link to="/contactos" className="tx-sidebar-card__quick-link tx-sidebar-card__quick-link--contact">
                <span className="tx-sidebar-card__quick-icon tx-sidebar-card__quick-icon--contact"><IconUserPlus /></span>
                Añadir contacto
              </Link>
              <Link to="/facturas/emision" className="tx-sidebar-card__quick-link tx-sidebar-card__quick-link--invoice">
                <span className="tx-sidebar-card__quick-icon tx-sidebar-card__quick-icon--invoice"><IconFilePlus /></span>
                Crear factura
              </Link>
              <Link to="/presupuestos/emision" className="tx-sidebar-card__quick-link tx-sidebar-card__quick-link--quote">
                <span className="tx-sidebar-card__quick-icon tx-sidebar-card__quick-icon--quote"><IconClipboardList /></span>
                Crear presupuesto
              </Link>
            </div>
          </section>
        </aside>
      </div>

      <TransactionFormModal
        open={formOpen}
        mode={formMode}
        initialValues={formInitialValues}
        clients={ledger.clients}
        clientsLoading={ledger.clientsLoading}
        saving={ledger.saving}
        error={ledger.error}
        onClose={closeFormModal}
        onSubmit={submitForm}
      />

      <TransactionDeleteModal
        open={deleteOpen}
        title={deleteMode === "single" ? "Eliminar transacción" : "Eliminar transacciones seleccionadas"}
        description={
          deleteMode === "single"
            ? "Esta acción no se puede deshacer."
            : "Se intentará eliminar todas las transacciones seleccionadas (excepto las bloqueadas por factura)."
        }
        confirmLabel={deleteMode === "single" ? "Eliminar" : "Eliminar seleccionadas"}
        loading={ledger.deleting}
        onCancel={closeDeleteModal}
        onConfirm={() => void confirmDelete()}
      />
    </>
  );
}
