import { Link } from "react-router-dom";
import type { TransactionLedgerItem } from "../domain/transactions-domain";
import { formatTransactionCategory, formatTransactionType } from "../domain/transactions-domain";

interface TransactionsTableProps {
  transactions: TransactionLedgerItem[];
  selectedIds: Set<string>;
  highlightedId: string | null;
  onToggleSelection: (transactionId: string, checked: boolean) => void;
  onTogglePageSelection: (checked: boolean) => void;
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

function formatDate(dateISO: string): string {
  if (!dateISO) return "-";
  const date = new Date(`${dateISO}T00:00:00`);
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
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

export function TransactionsTable({
  transactions,
  selectedIds,
  highlightedId,
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
                onChange={(event) => onTogglePageSelection(event.target.checked)}
              />
            </th>
            <th>Contacto</th>
            <th>Concepto</th>
            <th>Categoría</th>
            <th>Importe</th>
            <th>IVA / IRPF</th>
            <th>Fecha</th>
            <th>Tipo</th>
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
                </td>
                <td>{formatTransactionCategory(transaction.categoria)}</td>
                <td>
                  <span className={amountClass}>{formatAmount(transaction.importe)}</span>
                </td>
                <td>
                  {transaction.ivaPorcentaje !== null || transaction.irpfPorcentaje !== null ? (
                    <div className="flex flex-col gap-0.5">
                      {transaction.ivaPorcentaje !== null ? <span className="text-xs">IVA: {transaction.ivaPorcentaje}%</span> : null}
                      {transaction.irpfPorcentaje !== null ? <span className="text-xs">IRPF: {transaction.irpfPorcentaje}%</span> : null}
                    </div>
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
