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

  const marginTone = margin === null ? "neutral" : margin >= 25 ? "ok" : margin >= 0 ? "warn" : "danger";

  return (
    <div className="pilot-modal product-modal" role="dialog" aria-modal="true" aria-labelledby="product-modal-title">
      <div className="pilot-modal__overlay" onClick={onClose} />
      <div className="pilot-modal__content product-modal__content">
        <header className="pilot-modal__header product-modal__header">
          <div>
            <h3 id="product-modal-title" className="product-modal__title">
              {resolveTitle(mode)}
            </h3>
            <p className="product-modal__subtitle">
              {mode === "create"
                ? "Añade un producto o servicio a tu catálogo."
                : "Actualiza los datos del producto."}
            </p>
          </div>
          <button type="button" className="pilot-btn" onClick={onClose} disabled={saving}>
            Cerrar
          </button>
        </header>

        <form className="product-modal__form" onSubmit={handleSubmit}>
          <section className="product-modal__section">
            <h4 className="product-modal__section-title">Información básica</h4>
            <div className="pilot-grid pilot-grid--two">
              <label className="pilot-field">
                <span>Nombre *</span>
                <input
                  className="pilot-input"
                  value={values.nombre}
                  onChange={(event) => setValues((prev) => ({ ...prev, nombre: event.target.value }))}
                  placeholder="Servicio de consultoría"
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
              <span>Descripción</span>
              <textarea
                className="pilot-input pilot-textarea"
                value={values.descripcion}
                onChange={(event) => setValues((prev) => ({ ...prev, descripcion: event.target.value }))}
                placeholder="Descripción opcional del producto o servicio"
                rows={3}
              />
            </label>
          </section>

          <section className="product-modal__section">
            <h4 className="product-modal__section-title">Fiscalidad</h4>
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
          </section>

          <section className="product-modal__section">
            <h4 className="product-modal__section-title">Precios</h4>
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
                <span>Precio venta (sin IVA)</span>
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
          </section>

          <section className="product-modal__summary">
            <div className="product-modal__summary-item">
              <span className="product-modal__summary-label">PVP con impuesto</span>
              <span className="product-modal__summary-value">{formatProductCurrency(pvp)}</span>
            </div>
            <div className={`product-modal__summary-item product-modal__summary-item--${marginTone}`}>
              <span className="product-modal__summary-label">Margen</span>
              <span className="product-modal__summary-value">
                {margin === null ? "—" : `${margin.toFixed(1)}%`}
              </span>
            </div>
          </section>

          {localError ? <p className="pilot-error-text">{localError}</p> : null}
          {error ? <p className="pilot-error-text">{error}</p> : null}

          <div className="pilot-modal__footer product-modal__footer">
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

