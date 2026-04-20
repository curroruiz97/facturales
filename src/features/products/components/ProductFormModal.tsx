import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  PRODUCT_TAX_OPTIONS,
  calculateProductMargin,
  calculateProductPvp,
  formatProductCurrency,
  normalizeProductNumber,
} from "../domain/product-pricing";

export interface ProductFormValues {
  nombre: string;
  referencia: string;
  descripcion: string;
  precioCompra: string;
  precioVenta: string;
  impuesto: string;
  descuento: string;
}

interface ProductFormModalProps {
  open: boolean;
  mode: "create" | "edit";
  initialValues: ProductFormValues;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (values: ProductFormValues) => Promise<void>;
}

function resolveTitle(mode: "create" | "edit"): string {
  return mode === "create" ? "Nuevo producto" : "Editar producto";
}

function resolveSubmitLabel(mode: "create" | "edit", saving: boolean): string {
  if (saving) return mode === "create" ? "Guardando..." : "Actualizando...";
  return mode === "create" ? "Guardar producto" : "Actualizar producto";
}

export function ProductFormModal({
  open,
  mode,
  initialValues,
  saving,
  error,
  onClose,
  onSubmit,
}: ProductFormModalProps): import("react").JSX.Element | null {
  const [values, setValues] = useState<ProductFormValues>(initialValues);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setValues(initialValues);
    setLocalError(null);
  }, [initialValues, open]);

  const parsedSalePrice = useMemo(() => normalizeProductNumber(values.precioVenta, 0), [values.precioVenta]);
  const parsedPurchasePrice = useMemo(() => normalizeProductNumber(values.precioCompra, 0), [values.precioCompra]);
  const parsedDiscount = useMemo(() => normalizeProductNumber(values.descuento, 0), [values.descuento]);
  const margin = useMemo(() => calculateProductMargin(parsedPurchasePrice, parsedSalePrice), [parsedPurchasePrice, parsedSalePrice]);
  const pvp = useMemo(() => calculateProductPvp(parsedSalePrice, values.impuesto), [parsedSalePrice, values.impuesto]);

  if (!open) {
    return null;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!values.nombre.trim()) {
      setLocalError("El nombre del producto es obligatorio.");
      return;
    }
    if (!Number.isFinite(parsedSalePrice) || parsedSalePrice < 0) {
      setLocalError("El precio de venta debe ser valido.");
      return;
    }
    if (!Number.isFinite(parsedPurchasePrice) || parsedPurchasePrice < 0) {
      setLocalError("El precio de compra debe ser valido.");
      return;
    }
    if (!Number.isFinite(parsedDiscount) || parsedDiscount < 0 || parsedDiscount > 100) {
      setLocalError("El descuento debe estar entre 0 y 100.");
      return;
    }

    setLocalError(null);
    await onSubmit(values);
  };

  return (
    <div className="pilot-modal" role="dialog" aria-modal="true" aria-labelledby="product-modal-title">
      <div className="pilot-modal__overlay" onClick={onClose} />
      <div className="pilot-modal__content">
        <header className="pilot-modal__header">
          <h3 id="product-modal-title" className="text-lg font-bold">
            {resolveTitle(mode)}
          </h3>
          <button type="button" className="pilot-btn" onClick={onClose} disabled={saving}>
            Cerrar
          </button>
        </header>

        <form className="pilot-grid" onSubmit={handleSubmit}>
          <div className="pilot-grid pilot-grid--two">
            <label className="pilot-field">
              <span>Nombre *</span>
              <input
                className="pilot-input"
                value={values.nombre}
                onChange={(event) => setValues((prev) => ({ ...prev, nombre: event.target.value }))}
                placeholder="Servicio de consultoria"
              />
            </label>
            <label className="pilot-field">
              <span>Referencia</span>
              <input
                className="pilot-input"
                value={values.referencia}
                onChange={(event) => setValues((prev) => ({ ...prev, referencia: event.target.value }))}
                placeholder="REF-001"
              />
            </label>
          </div>

          <label className="pilot-field">
            <span>Descripcion</span>
            <textarea
              className="pilot-input pilot-textarea"
              value={values.descripcion}
              onChange={(event) => setValues((prev) => ({ ...prev, descripcion: event.target.value }))}
              placeholder="Descripcion del producto o servicio"
            />
          </label>

          <div className="pilot-grid pilot-grid--two">
            <label className="pilot-field">
              <span>Impuesto</span>
              <select
                className="pilot-input"
                value={values.impuesto}
                onChange={(event) => setValues((prev) => ({ ...prev, impuesto: event.target.value }))}
              >
                {PRODUCT_TAX_OPTIONS.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="pilot-field">
              <span>Descuento (%)</span>
              <input
                className="pilot-input"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={values.descuento}
                onChange={(event) => setValues((prev) => ({ ...prev, descuento: event.target.value }))}
              />
            </label>
          </div>

          <div className="pilot-grid pilot-grid--two">
            <label className="pilot-field">
              <span>Precio compra</span>
              <input
                className="pilot-input"
                type="number"
                min="0"
                step="0.01"
                value={values.precioCompra}
                onChange={(event) => setValues((prev) => ({ ...prev, precioCompra: event.target.value }))}
              />
            </label>
            <label className="pilot-field">
              <span>Precio venta</span>
              <input
                className="pilot-input"
                type="number"
                min="0"
                step="0.01"
                value={values.precioVenta}
                onChange={(event) => setValues((prev) => ({ ...prev, precioVenta: event.target.value }))}
              />
            </label>
          </div>

          <div className="pilot-grid pilot-grid--two">
            <div className="pilot-kpi">
              <span className="pilot-kpi__label">PVP</span>
              <span className="pilot-kpi__value">{formatProductCurrency(pvp)}</span>
            </div>
            <div className="pilot-kpi">
              <span className="pilot-kpi__label">Margen</span>
              <span className="pilot-kpi__value">{margin === null ? "N/A" : `${margin.toFixed(1)}%`}</span>
            </div>
          </div>

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

