import { Link } from "react-router-dom";
import type { TransactionLedgerItem } from "../domain/transactions-domain";
import { formatTransactionCategory, formatTransactionType } from "../domain/transactions-domain";
import { calculateExpenseBreakdown } from "../domain/transaction-amounts";
import type { TransactionsSortMode } from "../hooks/use-transactions-ledger";

type SortKey = "client" | "concept" | "category" | "amount" | "date" | "type";

interface TransactionsTableProps {
  transactions: TransactionLedgerItem[];
  selectedIds: Set<string>;
  highlightedId: string | null;
  sortMode: TransactionsSortMode;
  onSortChange: (mode: TransactionsSortMode) => void;
  onToggleSelection: (transactionId: string, checked: boolean) => void;
  onTogglePageSelection: (checked: boolean, transactionIds?: string[]) => void;
  onEdit: (transaction: TransactionLedgerItem) => void;
  onDelete: (transaction: TransactionLedgerItem) => void;
}

function formatAmount(value: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(dateISO: string | null | undefined): string {
  if (!dateISO) return "-";
  const date = new Date(`${dateISO}T00:00:00`);
  // Guarda contra fechas inválidas (string mal formado, mes fuera de rango, etc.):
  // sin esto Intl.DateTimeFormat.format(InvalidDate) lanza RangeError y rompe el render
  // de toda la tabla → ErrorBoundary "Algo ha salido mal".
  if (Number.isNaN(date.getTime())) return String(dateISO);
  try {
    return new Intl.DateTimeFormat("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  } catch {
    return String(dateISO);
  }
}

function resolveInitials(name: string | null): string {
  if (!name?.trim()) return "SC";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  const initials = parts.map((part) => part.charAt(0).toUpperCase()).join("");
  return initials || "SC";
}

const IconEdit = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const IconTrash = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
  </svg>
);

const IconSortNone = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="7 11 12 6 17 11"/>
    <polyline points="7 13 12 18 17 13"/>
  </svg>
);

const IconSortAsc = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="6 15 12 9 18 15"/>
  </svg>
);

const IconSortDesc = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

function sortDirectionForKey(key: SortKey, sortMode: TransactionsSortMode): "asc" | "desc" | null {
  if (sortMode === `${key}-asc`) return "asc";
  if (sortMode === `${key}-desc`) return "desc";
  return null;
}

function nextSortMode(key: SortKey, sortMode: TransactionsSortMode): TransactionsSortMode {
  const current = sortDirectionForKey(key, sortMode);
  // Estado por defecto al hacer clic en una columna nueva: descendente para fecha/importe (más reciente/grande primero), ascendente para texto.
  const defaultDir: "asc" | "desc" = key === "date" || key === "amount" ? "desc" : "asc";
  if (current === null) return `${key}-${defaultDir}` as TransactionsSortMode;
  if (current === "asc") return `${key}-desc` as TransactionsSortMode;
  return `${key}-asc` as TransactionsSortMode;
}

interface SortableHeaderProps {
  label: string;
  sortKey: SortKey;
  sortMode: TransactionsSortMode;
  onSortChange: (mode: TransactionsSortMode) => void;
  className?: string;
}

function SortableHeader({ label, sortKey, sortMode, onSortChange, className }: SortableHeaderProps): import("react").JSX.Element {
  const direction = sortDirectionForKey(sortKey, sortMode);
  const ariaSort = direction === "asc" ? "ascending" : direction === "desc" ? "descending" : "none";
  return (
    <th className={className} aria-sort={ariaSort}>
      <button
        type="button"
        className={`tx-table__sort ${direction ? "tx-table__sort--active" : ""}`}
        onClick={() => onSortChange(nextSortMode(sortKey, sortMode))}
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

export function TransactionsTable({
  transactions,
  selectedIds,
  highlightedId,
  sortMode,
  onSortChange,
  onToggleSelection,
  onTogglePageSelection,
  onEdit,
  onDelete,
}: TransactionsTableProps): import("react").JSX.Element {
  const selectableRows = transactions.filter((transaction) => !transaction.lockedByInvoice);
  const selectedCountOnPage = selectableRows.filter((transaction) => selectedIds.has(transaction.id)).length;
  const allSelectedOnPage = selectableRows.length > 0 && selectedCountOnPage === selectableRows.length;
  const someSelectedOnPage = selectedCountOnPage > 0 && selectedCountOnPage < selectableRows.length;

  return (
    <div className="overflow-auto">
      <table className="pilot-table tx-table">
        <thead>
          <tr>
            <th className="w-10">
              <input
                type="checkbox"
                checked={allSelectedOnPage}
                aria-checked={someSelectedOnPage ? "mixed" : allSelectedOnPage}
                onChange={(event) => onTogglePageSelection(event.target.checked, selectableRows.map((t) => t.id))}
              />
            </th>
            <SortableHeader label="Contacto" sortKey="client" sortMode={sortMode} onSortChange={onSortChange} />
            <SortableHeader label="Concepto" sortKey="concept" sortMode={sortMode} onSortChange={onSortChange} />
            <SortableHeader label="Categoría" sortKey="category" sortMode={sortMode} onSortChange={onSortChange} />
            <SortableHeader label="Importe" sortKey="amount" sortMode={sortMode} onSortChange={onSortChange} />
            <th>IVA / IRPF</th>
            <SortableHeader label="Fecha" sortKey="date" sortMode={sortMode} onSortChange={onSortChange} />
            <SortableHeader label="Tipo" sortKey="type" sortMode={sortMode} onSortChange={onSortChange} />
            <th className="text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => {
            const highlighted = highlightedId === transaction.id;
            const amountClass = transaction.tipo === "gasto" ? "pilot-text-danger" : "pilot-text-ok";
            const typeClass = transaction.tipo === "gasto" ? "pilot-status--warn" : "pilot-status--ok";
            const locked = transaction.lockedByInvoice;

            return (
              <tr
                key={transaction.id}
                className={highlighted ? "bg-success-50/50 dark:bg-success-900/10" : undefined}
              >
                <td>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(transaction.id)}
                    disabled={locked}
                    onChange={(event) => onToggleSelection(transaction.id, event.target.checked)}
                    aria-label={`Seleccionar transacción ${transaction.concepto}`}
                  />
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-success-100 text-xs font-bold text-success-700">
                      {resolveInitials(transaction.clientName)}
                    </span>
                    <div>
                      <strong>{transaction.clientName ?? "Sin contacto"}</strong>
                      {transaction.clientIdentifier ? <p className="text-xs opacity-70">{transaction.clientIdentifier}</p> : null}
                    </div>
                  </div>
                </td>
                <td>
                  <strong>{transaction.concepto}</strong>
                  {locked ? <p className="text-xs opacity-70">Generada desde factura</p> : null}
                  {transaction.tipo === "gasto" && transaction.deducible === false ? (
                    <span className="tx-badge tx-badge--non-deductible" title="Este gasto NO se incluye en el cálculo del Modelo 130 ni 303">
                      No deducible
                    </span>
                  ) : null}
                </td>
                <td>{formatTransactionCategory(transaction.categoria)}</td>
                <td>
                  <span className={amountClass}>{formatAmount(transaction.importe)}</span>
                </td>
                <td>
                  {transaction.ivaPorcentaje !== null || transaction.irpfPorcentaje !== null ? (
                    (() => {
                      const bd = calculateExpenseBreakdown(
                        transaction.importe,
                        transaction.ivaPorcentaje,
                        transaction.irpfPorcentaje,
                      );
                      return (
                        <div className="flex flex-col gap-0.5">
                          {transaction.ivaPorcentaje !== null ? (
                            <span className="text-xs">
                              IVA: {transaction.ivaPorcentaje}% <span className="opacity-70">({formatAmount(bd.cuotaIva)})</span>
                            </span>
                          ) : null}
                          {transaction.irpfPorcentaje !== null ? (
                            <span className="text-xs">
                              IRPF: {transaction.irpfPorcentaje}% <span className="opacity-70">(−{formatAmount(bd.cuotaIrpf)})</span>
                            </span>
                          ) : null}
                        </div>
                      );
                    })()
                  ) : (
                    <span className="text-xs opacity-70">-</span>
                  )}
                </td>
                <td>{formatDate(transaction.fecha)}</td>
                <td>
                  <span className={`pilot-status ${typeClass}`}>{formatTransactionType(transaction.tipo)}</span>
                </td>
                <td className="text-right">
                  <div className="tx-actions-cell">
                    {locked && transaction.invoiceId ? (
                      <Link to={`/facturas/vista-previa?draft=${encodeURIComponent(transaction.invoiceId)}`} className="tx-action-icon tx-action-icon--link" title="Ver factura">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      </Link>
                    ) : null}
                    {!locked ? (
                      <>
                        <button type="button" className="tx-action-icon tx-action-icon--edit" onClick={() => onEdit(transaction)} title="Editar">
                          <IconEdit />
                        </button>
                        <button type="button" className="tx-action-icon tx-action-icon--delete" onClick={() => onDelete(transaction)} title="Eliminar">
                          <IconTrash />
                        </button>
                      </>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
