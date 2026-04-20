import type { DocumentSummary } from "../../../shared/types/domain";

interface DocumentSummaryPanelProps {
  summary: DocumentSummary;
  currency?: string;
}

function formatCurrency(value: number, currency = "EUR"): string {
  const normalizedCurrency = /^[A-Z]{3}$/.test(currency.toUpperCase()) ? currency.toUpperCase() : "EUR";
  try {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: normalizedCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value || 0);
  } catch {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value || 0);
  }
}

function formatPercent(value: number): string {
  return `${(value || 0).toFixed(2)}%`;
}

export function DocumentSummaryPanel({ summary, currency = "EUR" }: DocumentSummaryPanelProps): import("react").JSX.Element {
  return (
    <section className="pilot-panel">
      <h3 className="mb-3 text-base font-bold">Resumen fiscal</h3>
      <div className="pilot-grid">
        <div className="flex items-center justify-between text-sm">
          <span>Subtotal bruto</span>
          <strong>{formatCurrency(summary.subtotal, currency)}</strong>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span>Descuentos</span>
          <strong>- {formatCurrency(summary.discount, currency)}</strong>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span>Base imponible</span>
          <strong>{formatCurrency(summary.taxBase, currency)}</strong>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span>Impuestos ({formatPercent(summary.taxRate)})</span>
          <strong>{formatCurrency(summary.taxAmount, currency)}</strong>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span>Recargo ({formatPercent(summary.reRate)})</span>
          <strong>{formatCurrency(summary.reAmount, currency)}</strong>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span>Retencion ({formatPercent(summary.retentionRate)})</span>
          <strong>- {formatCurrency(summary.retentionAmount, currency)}</strong>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span>Gastos suplidos</span>
          <strong>{formatCurrency(summary.expenses, currency)}</strong>
        </div>
        <hr className="border-bgray-200 dark:border-darkblack-500" />
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">Total documento</span>
          <strong className="text-lg">{formatCurrency(summary.total, currency)}</strong>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span>Cobrado / pagado</span>
          <strong>{formatCurrency(summary.paid, currency)}</strong>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span>Total pendiente</span>
          <strong className={summary.totalToPay >= 0 ? "pilot-text-danger" : "pilot-text-ok"}>{formatCurrency(summary.totalToPay, currency)}</strong>
        </div>
      </div>
    </section>
  );
}
