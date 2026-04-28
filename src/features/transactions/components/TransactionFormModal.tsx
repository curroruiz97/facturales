import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { TransactionCategory, TransactionType } from "../../../shared/types/domain";
import type { TransactionClientOption } from "../adapters/transactions.adapter";
import { TRANSACTION_CATEGORY_LABELS, suggestCategoryFromRol } from "../domain/transactions-domain";
import { calculateExpenseBreakdown } from "../domain/transaction-amounts";

const formatEur = (value: number): string =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(value);

const MANUAL_TRANSACTION_CATEGORIES: Array<Exclude<TransactionCategory, "factura">> = [
  "material_oficina",
  "servicios_profesionales",
  "suministros",
  "alquiler",
  "transporte",
  "marketing",
  "salarios",
  "financieros",
  "otros",
];

export interface TransactionFormValues {
  clienteId: string;
  concepto: string;
  categoria: Exclude<TransactionCategory, "factura">;
  tipo: TransactionType;
  importe: string;
  ivaPorcentaje: string;
  irpfPorcentaje: string;
  fecha: string;
  observaciones: string;
  /** Default true. Si false, el gasto se EXCLUYE del Modelo 130 y 303. */
  deducible: boolean;
}

interface TransactionFormModalProps {
  open: boolean;
  mode: "create" | "edit";
  initialValues: TransactionFormValues;
  clients: TransactionClientOption[];
  clientsLoading: boolean;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (values: TransactionFormValues) => Promise<void>;
}

function resolveTitle(mode: "create" | "edit"): string {
  return mode === "create" ? "Nueva transaccion" : "Editar transaccion";
}

function resolveSubmitLabel(mode: "create" | "edit", saving: boolean): string {
  if (saving) return mode === "create" ? "Guardando..." : "Actualizando...";
  return mode === "create" ? "Guardar transaccion" : "Actualizar transaccion";
}

function parsePercent(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export function TransactionFormModal({
  open,
  mode,
  initialValues,
  clients,
  clientsLoading,
  saving,
  error,
  onClose,
  onSubmit,
}: TransactionFormModalProps): import("react").JSX.Element | null {
  const [values, setValues] = useState<TransactionFormValues>(initialValues);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setValues(initialValues);
    setLocalError(null);
  }, [initialValues, open]);

  const amount = useMemo(() => Number.parseFloat(values.importe), [values.importe]);
  const iva = useMemo(() => parsePercent(values.ivaPorcentaje), [values.ivaPorcentaje]);
  const irpf = useMemo(() => parsePercent(values.irpfPorcentaje), [values.irpfPorcentaje]);

  const breakdown = useMemo(() => {
    const safeAmount = Number.isFinite(amount) ? amount : 0;
    const safeIva = iva !== null && Number.isFinite(iva) ? iva : null;
    const safeIrpf = irpf !== null && Number.isFinite(irpf) ? irpf : null;
    return calculateExpenseBreakdown(safeAmount, safeIva, safeIrpf);
  }, [amount, iva, irpf]);

  const showBreakdown = breakdown.total > 0 && (breakdown.cuotaIva > 0 || breakdown.cuotaIrpf > 0);

  if (!open) return null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!values.concepto.trim()) {
      setLocalError("El concepto es obligatorio.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setLocalError("El importe debe ser mayor que 0.");
      return;
    }
    if (!values.fecha.trim()) {
      setLocalError("La fecha es obligatoria.");
      return;
    }
    if (values.observaciones.length > 150) {
      setLocalError("Las observaciones no pueden superar 150 caracteres.");
      return;
    }
    if (iva !== null && (!Number.isFinite(iva) || iva < 0 || iva > 100)) {
      setLocalError("El IVA debe estar entre 0 y 100.");
      return;
    }
    if (irpf !== null && (!Number.isFinite(irpf) || irpf < 0 || irpf > 100)) {
      setLocalError("El IRPF debe estar entre 0 y 100.");
      return;
    }

    setLocalError(null);
    await onSubmit(values);
  };

  return (
    <div className="pilot-modal" role="dialog" aria-modal="true" aria-labelledby="transaction-modal-title">
      <div className="pilot-modal__overlay" onClick={onClose} />
      <div className="pilot-modal__content">
        <header className="pilot-modal__header">
          <h3 id="transaction-modal-title" className="text-lg font-bold">
            {resolveTitle(mode)}
          </h3>
          <button type="button" className="pilot-btn" onClick={onClose} disabled={saving}>
            Cerrar
          </button>
        </header>

        <form className="pilot-grid" onSubmit={handleSubmit}>
          <div className="pilot-grid pilot-grid--two">
            <label className="pilot-field">
              Contacto
              <select
                className="pilot-input"
                value={values.clienteId}
                onChange={(event) => {
                  const newClienteId = event.target.value;
                  // Auto-sugerir categoría según el rol del contacto seleccionado
                  // (solo si la categoría actual es la default — no pisar elecciones del usuario).
                  const matched = clients.find((c) => c.id === newClienteId);
                  const suggested = matched ? suggestCategoryFromRol(matched.rol) : null;
                  setValues((prev) => ({
                    ...prev,
                    clienteId: newClienteId,
                    categoria:
                      suggested && (prev.categoria === "material_oficina" || prev.categoria === "otros")
                        ? suggested
                        : prev.categoria,
                  }));
                }}
                disabled={clientsLoading}
              >
                <option value="">Sin contacto</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name} ({client.identifier})
                  </option>
                ))}
              </select>
            </label>
            <label className="pilot-field">
              Fecha *
              <input
                className="pilot-input"
                type="date"
                value={values.fecha}
                onChange={(event) => setValues((prev) => ({ ...prev, fecha: event.target.value }))}
              />
            </label>
          </div>

          <label className="pilot-field">
            Concepto *
            <input
              className="pilot-input"
              value={values.concepto}
              onChange={(event) => setValues((prev) => ({ ...prev, concepto: event.target.value }))}
              placeholder="Ej: Compra de material de oficina"
            />
          </label>

          <div className="pilot-grid pilot-grid--two">
            <label className="pilot-field">
              Categoria *
              <select
                className="pilot-input"
                value={values.categoria}
                onChange={(event) =>
                  setValues((prev) => ({ ...prev, categoria: event.target.value as Exclude<TransactionCategory, "factura"> }))
                }
              >
                {MANUAL_TRANSACTION_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {TRANSACTION_CATEGORY_LABELS[category]}
                  </option>
                ))}
              </select>
            </label>
            <label className="pilot-field">
              Tipo *
              <select
                className="pilot-input"
                value={values.tipo}
                onChange={(event) => setValues((prev) => ({ ...prev, tipo: event.target.value as TransactionType }))}
              >
                <option value="gasto">Gasto</option>
                <option value="ingreso">Ingreso</option>
              </select>
            </label>
          </div>

          <div className="pilot-grid pilot-grid--two">
            <label className="pilot-field">
              Importe total *
              <input
                className="pilot-input"
                type="number"
                min="0"
                step="0.01"
                value={values.importe}
                onChange={(event) => setValues((prev) => ({ ...prev, importe: event.target.value }))}
                placeholder="0.00"
              />
              <span className="pilot-field__hint">
                Total que pagas al proveedor (con IVA sumado e IRPF restado si aplica).
              </span>
            </label>
            <label className="pilot-field">
              IVA (%)
              <input
                className="pilot-input"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={values.ivaPorcentaje}
                onChange={(event) => setValues((prev) => ({ ...prev, ivaPorcentaje: event.target.value }))}
                placeholder="21"
              />
            </label>
          </div>

          <div className="pilot-grid pilot-grid--two">
            <label className="pilot-field">
              IRPF (%)
              <input
                className="pilot-input"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={values.irpfPorcentaje}
                onChange={(event) => setValues((prev) => ({ ...prev, irpfPorcentaje: event.target.value }))}
                placeholder="15"
              />
            </label>
            <label className="pilot-field">
              Observaciones
              <textarea
                className="pilot-input pilot-textarea"
                maxLength={150}
                value={values.observaciones}
                onChange={(event) => setValues((prev) => ({ ...prev, observaciones: event.target.value }))}
                placeholder="Notas opcionales (max. 150 caracteres)"
              />
            </label>
          </div>

          {values.tipo === "gasto" ? (
            <label className="pilot-checkbox-field">
              <input
                type="checkbox"
                checked={values.deducible}
                onChange={(event) => setValues((prev) => ({ ...prev, deducible: event.target.checked }))}
              />
              <span>
                <strong>Gasto deducible fiscalmente</strong>
                <span className="pilot-field__hint">
                  Si lo desmarcas, este gasto NO se incluirá en el cálculo del Modelo 130 ni 303 (ej: multas, gastos personales, sanciones).
                </span>
              </span>
            </label>
          ) : null}

          {showBreakdown ? (
            <div className="pilot-amount-breakdown" aria-live="polite">
              <header className="pilot-amount-breakdown__header">Desglose calculado</header>
              <dl className="pilot-amount-breakdown__list">
                <div className="pilot-amount-breakdown__row">
                  <dt>Base imponible</dt>
                  <dd>{formatEur(breakdown.base)}</dd>
                </div>
                {breakdown.cuotaIva > 0 ? (
                  <div className="pilot-amount-breakdown__row">
                    <dt>Cuota IVA ({iva}%)</dt>
                    <dd>+ {formatEur(breakdown.cuotaIva)}</dd>
                  </div>
                ) : null}
                {breakdown.cuotaIrpf > 0 ? (
                  <div className="pilot-amount-breakdown__row">
                    <dt>Retención IRPF ({irpf}%)</dt>
                    <dd>− {formatEur(breakdown.cuotaIrpf)}</dd>
                  </div>
                ) : null}
                <div className="pilot-amount-breakdown__row pilot-amount-breakdown__row--total">
                  <dt>Total a pagar</dt>
                  <dd>{formatEur(breakdown.total)}</dd>
                </div>
              </dl>
            </div>
          ) : null}

          {localError ? <p className="pilot-error-text">{localError}</p> : null}
          {error ? <p className="pilot-error-text">{error}</p> : null}

          <div className="pilot-modal__footer">
            <button type="button" className="pilot-btn" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="pilot-btn pilot-btn--primary" disabled={saving}>
              {resolveSubmitLabel(mode, saving)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
