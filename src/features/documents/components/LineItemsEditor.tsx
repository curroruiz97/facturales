import { useEffect, useMemo, useState } from "react";
import { DOCUMENT_TAX_OPTIONS, type DocumentLineDraft } from "../core/document-types";
import { productsRepository } from "../../../services/repositories";

interface LineItemsEditorProps {
  lines: DocumentLineDraft[];
  readOnly?: boolean;
  onAddLine: () => void;
  onUpdateLine: (lineId: string, patch: Partial<DocumentLineDraft>) => void;
  onRemoveLine: (lineId: string) => void;
}

function toNumber(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatEUR(value: number): string {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(value || 0);
}

function mapProductTaxToLineTaxCode(productTax: string): string {
  const normalized = (productTax || "").trim().toUpperCase();
  if (!normalized) return "IVA_21";
  const exists = DOCUMENT_TAX_OPTIONS.some((option) => option.value === normalized);
  return exists ? normalized : "IVA_21";
}

export function LineItemsEditor({
  lines,
  readOnly = false,
  onAddLine,
  onUpdateLine,
  onRemoveLine,
}: LineItemsEditorProps): import("react").JSX.Element {
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [productQuery, setProductQuery] = useState("");
  const [productLoading, setProductLoading] = useState(false);
  const [productTargetLineId, setProductTargetLineId] = useState<string | null>(null);
  const [products, setProducts] = useState<Array<{ id: string; nombre: string; referencia: string | null; precioVenta: number; impuesto: string; descuento: number }>>([]);
  const [createProductOpen, setCreateProductOpen] = useState(false);
  const [productError, setProductError] = useState<string | null>(null);
  const [productSaving, setProductSaving] = useState(false);
  const [newProduct, setNewProduct] = useState({
    nombre: "",
    referencia: "",
    precioVenta: "",
    impuesto: "IVA_21",
    descuento: "0",
  });

  useEffect(() => {
    if (!productModalOpen) return;
    const handle = window.setTimeout(async () => {
      setProductLoading(true);
      const result = await productsRepository.list(productQuery);
      if (result.success) {
        setProducts(
          result.data.map((product) => ({
            id: product.id,
            nombre: product.nombre,
            referencia: product.referencia,
            precioVenta: product.precioVenta,
            impuesto: product.impuesto,
            descuento: product.descuento,
          })),
        );
      } else {
        setProducts([]);
      }
      setProductLoading(false);
    }, 220);
    return () => window.clearTimeout(handle);
  }, [productModalOpen, productQuery]);

  const productTaxOptions = useMemo(() => DOCUMENT_TAX_OPTIONS.map((option) => option.value), []);

  const openProductModal = (lineId: string) => {
    setProductTargetLineId(lineId);
    setProductQuery("");
    setProductError(null);
    setProductModalOpen(true);
  };

  const applyProductToLine = (product: { nombre: string; precioVenta: number; impuesto: string; descuento: number }) => {
    if (!productTargetLineId) return;
    onUpdateLine(productTargetLineId, {
      description: product.nombre,
      unitPrice: product.precioVenta,
      discount: product.descuento,
      taxCode: mapProductTaxToLineTaxCode(product.impuesto),
    });
    setProductModalOpen(false);
  };

  const createProductInline = async () => {
    setProductError(null);
    if (!newProduct.nombre.trim()) {
      setProductError("El nombre del producto es obligatorio.");
      return;
    }
    const price = toNumber(newProduct.precioVenta);
    if (price < 0) {
      setProductError("El precio no puede ser negativo.");
      return;
    }

    setProductSaving(true);
    const result = await productsRepository.create({
      nombre: newProduct.nombre.trim(),
      referencia: newProduct.referencia.trim() || null,
      precioVenta: price,
      impuesto: newProduct.impuesto,
      descuento: toNumber(newProduct.descuento),
    });
    setProductSaving(false);

    if (!result.success) {
      setProductError(result.error.message);
      return;
    }

    applyProductToLine({
      nombre: result.data.nombre,
      precioVenta: result.data.precioVenta,
      impuesto: result.data.impuesto,
      descuento: result.data.descuento,
    });
    setCreateProductOpen(false);
    setNewProduct({
      nombre: "",
      referencia: "",
      precioVenta: "",
      impuesto: "IVA_21",
      descuento: "0",
    });
  };

  const renderQuantityStepper = (line: DocumentLineDraft) => (
    !readOnly && (
      <div className="inv-number-stepper">
        <button type="button" tabIndex={-1} onClick={() => onUpdateLine(line.id, { quantity: Math.round((line.quantity + 1) * 100) / 100 })} aria-label="Incrementar">
          <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 7L5 3L8 7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <button type="button" tabIndex={-1} onClick={() => onUpdateLine(line.id, { quantity: Math.max(0, Math.round((line.quantity - 1) * 100) / 100) })} aria-label="Decrementar">
          <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 3L5 7L8 3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>
    )
  );

  const renderPriceStepper = (line: DocumentLineDraft) => (
    !readOnly && (
      <div className="inv-number-stepper">
        <button type="button" tabIndex={-1} onClick={() => onUpdateLine(line.id, { unitPrice: Math.round((line.unitPrice + 1) * 100) / 100 })} aria-label="Incrementar">
          <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 7L5 3L8 7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <button type="button" tabIndex={-1} onClick={() => onUpdateLine(line.id, { unitPrice: Math.max(0, Math.round((line.unitPrice - 1) * 100) / 100) })} aria-label="Decrementar">
          <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 3L5 7L8 3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>
    )
  );

  const renderDiscountStepper = (line: DocumentLineDraft) => (
    !readOnly && (
      <div className="inv-number-stepper">
        <button type="button" tabIndex={-1} onClick={() => onUpdateLine(line.id, { discount: Math.min(100, Math.round((line.discount + 1) * 100) / 100) })} aria-label="Incrementar">
          <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 7L5 3L8 7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <button type="button" tabIndex={-1} onClick={() => onUpdateLine(line.id, { discount: Math.max(0, Math.round((line.discount - 1) * 100) / 100) })} aria-label="Decrementar">
          <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 3L5 7L8 3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>
    )
  );

  return (
    <section>
      {/* Desktop: tabla clásica */}
      <div className="inv-line-table-wrap">
        <table className="inv-line-table">
          <thead>
            <tr>
              <th>Concepto</th>
              <th>Cant.</th>
              <th>Precio</th>
              <th>Impuestos</th>
              <th>Dto. %</th>
              <th>Importe</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.id}>
                <td>
                  <div className="inv-concept-input">
                    <input
                      className="inv-input"
                      type="text"
                      value={line.description}
                      onChange={(event) => onUpdateLine(line.id, { description: event.target.value })}
                      disabled={readOnly}
                      placeholder="Añadir concepto"
                    />
                    <button type="button" className="inv-icon-btn" onClick={() => openProductModal(line.id)} disabled={readOnly} title="Buscar producto">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
                        <path d="M16 16L21 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                </td>
                <td>
                  <div className="inv-number-wrap">
                    <input
                      className="inv-input"
                      type="number"
                      min="0"
                      step="1"
                      value={line.quantity}
                      onChange={(event) => onUpdateLine(line.id, { quantity: toNumber(event.target.value) })}
                      disabled={readOnly}
                    />
                    {renderQuantityStepper(line)}
                  </div>
                </td>
                <td>
                  <div className="inv-number-wrap">
                    <input
                      className="inv-input"
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.unitPrice}
                      onChange={(event) => onUpdateLine(line.id, { unitPrice: toNumber(event.target.value) })}
                      disabled={readOnly}
                    />
                    {renderPriceStepper(line)}
                  </div>
                </td>
                <td>
                  <select
                    className="inv-select"
                    value={line.taxCode}
                    onChange={(event) => onUpdateLine(line.id, { taxCode: event.target.value })}
                    disabled={readOnly}
                  >
                    {DOCUMENT_TAX_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <div className="inv-number-wrap">
                    <input
                      className="inv-input"
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={line.discount}
                      onChange={(event) => onUpdateLine(line.id, { discount: toNumber(event.target.value) })}
                      disabled={readOnly}
                    />
                    {renderDiscountStepper(line)}
                  </div>
                </td>
                <td>
                  <strong>{formatEUR(line.quantity * line.unitPrice)}</strong>
                </td>
                <td>
                  <button type="button" className="inv-icon-btn" onClick={() => onRemoveLine(line.id)} disabled={readOnly} title="Eliminar línea">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M4 7h16M9 7V5h6v2M9 11v7M15 11v7M7 7l1 12h8l1-12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Móvil: tarjetas apiladas (cada línea como card) */}
      <div className="inv-line-cards">
        {lines.map((line, idx) => (
          <article key={line.id} className="inv-line-card">
            <header className="inv-line-card__head">
              <span className="inv-line-card__index">Línea {idx + 1}</span>
              {!readOnly ? (
                <button type="button" className="inv-line-card__remove" onClick={() => onRemoveLine(line.id)} aria-label="Eliminar línea">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M4 7h16M9 7V5h6v2M9 11v7M15 11v7M7 7l1 12h8l1-12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              ) : null}
            </header>

            <label className="inv-line-card__field inv-line-card__field--full">
              <span className="inv-line-card__label">Concepto</span>
              <div className="inv-concept-input">
                <input
                  className="inv-input"
                  type="text"
                  value={line.description}
                  onChange={(event) => onUpdateLine(line.id, { description: event.target.value })}
                  disabled={readOnly}
                  placeholder="Añadir concepto"
                />
                <button type="button" className="inv-icon-btn" onClick={() => openProductModal(line.id)} disabled={readOnly} title="Buscar producto" aria-label="Buscar producto">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M16 16L21 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </label>

            <div className="inv-line-card__grid">
              <label className="inv-line-card__field">
                <span className="inv-line-card__label">Cantidad</span>
                <div className="inv-number-wrap">
                  <input
                    className="inv-input"
                    type="number"
                    min="0"
                    step="1"
                    value={line.quantity}
                    onChange={(event) => onUpdateLine(line.id, { quantity: toNumber(event.target.value) })}
                    disabled={readOnly}
                    inputMode="decimal"
                  />
                  {renderQuantityStepper(line)}
                </div>
              </label>

              <label className="inv-line-card__field">
                <span className="inv-line-card__label">Precio (€)</span>
                <div className="inv-number-wrap">
                  <input
                    className="inv-input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={line.unitPrice}
                    onChange={(event) => onUpdateLine(line.id, { unitPrice: toNumber(event.target.value) })}
                    disabled={readOnly}
                    inputMode="decimal"
                  />
                  {renderPriceStepper(line)}
                </div>
              </label>

              <label className="inv-line-card__field">
                <span className="inv-line-card__label">Impuesto</span>
                <select
                  className="inv-select"
                  value={line.taxCode}
                  onChange={(event) => onUpdateLine(line.id, { taxCode: event.target.value })}
                  disabled={readOnly}
                >
                  {DOCUMENT_TAX_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="inv-line-card__field">
                <span className="inv-line-card__label">Dto. %</span>
                <div className="inv-number-wrap">
                  <input
                    className="inv-input"
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={line.discount}
                    onChange={(event) => onUpdateLine(line.id, { discount: toNumber(event.target.value) })}
                    disabled={readOnly}
                    inputMode="decimal"
                  />
                  {renderDiscountStepper(line)}
                </div>
              </label>
            </div>

            <footer className="inv-line-card__footer">
              <span className="inv-line-card__total-label">Importe</span>
              <strong className="inv-line-card__total-value">{formatEUR(line.quantity * line.unitPrice)}</strong>
            </footer>
          </article>
        ))}

        {lines.length === 0 ? (
          <p className="inv-line-cards__empty">Sin líneas. Añade la primera pulsando "Añadir línea".</p>
        ) : null}
      </div>

      {productModalOpen ? (
        <div className="inv-modal" role="dialog" aria-modal="true">
          <button type="button" className="inv-modal__overlay" onClick={() => setProductModalOpen(false)} />
          <div className="inv-modal__content">
            <header className="inv-modal__header">
              <h3>Buscar producto</h3>
              <button type="button" className="inv-modal__close" onClick={() => setProductModalOpen(false)}>×</button>
            </header>
            <div className="inv-modal__body">
              <label className="inv-label">Nombre del producto o referencia</label>
              <input
                className="inv-input"
                type="search"
                value={productQuery}
                onChange={(event) => setProductQuery(event.target.value)}
                placeholder="Buscar..."
              />
              <div className="inv-product-table-wrap">
                <table className="inv-product-table">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Referencia</th>
                      <th>PVP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productLoading ? (
                      <tr><td colSpan={3}>Buscando productos...</td></tr>
                    ) : products.length === 0 ? (
                      <tr><td colSpan={3}>No se encontraron productos</td></tr>
                    ) : (
                      products.map((product) => (
                        <tr key={product.id} onClick={() => applyProductToLine(product)} className="inv-product-row">
                          <td>{product.nombre}</td>
                          <td>{product.referencia || "-"}</td>
                          <td>{formatEUR(product.precioVenta)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <button type="button" className="inv-link-btn" onClick={() => setCreateProductOpen(true)}>
                + Crear producto
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {createProductOpen ? (
        <div className="inv-modal" role="dialog" aria-modal="true">
          <button type="button" className="inv-modal__overlay" onClick={() => setCreateProductOpen(false)} />
          <div className="inv-modal__content">
            <header className="inv-modal__header">
              <h3>Nuevo producto</h3>
              <button type="button" className="inv-modal__close" onClick={() => setCreateProductOpen(false)}>×</button>
            </header>
            <div className="inv-modal__body">
              <div className="inv-fields">
                <div>
                  <label className="inv-label">Nombre</label>
                  <input className="inv-input" value={newProduct.nombre} onChange={(e) => setNewProduct((p) => ({ ...p, nombre: e.target.value }))} />
                </div>
                <div className="inv-fields-2">
                  <div>
                    <label className="inv-label">Referencia</label>
                    <input className="inv-input" value={newProduct.referencia} onChange={(e) => setNewProduct((p) => ({ ...p, referencia: e.target.value }))} />
                  </div>
                  <div>
                    <label className="inv-label">Precio venta</label>
                    <input className="inv-input" type="number" value={newProduct.precioVenta} onChange={(e) => setNewProduct((p) => ({ ...p, precioVenta: e.target.value }))} />
                  </div>
                </div>
                <div className="inv-fields-2">
                  <div>
                    <label className="inv-label">Impuesto</label>
                    <select className="inv-select" value={newProduct.impuesto} onChange={(e) => setNewProduct((p) => ({ ...p, impuesto: e.target.value }))}>
                      {productTaxOptions.map((taxCode) => (
                        <option key={taxCode} value={taxCode}>{taxCode}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="inv-label">Descuento %</label>
                    <input className="inv-input" type="number" value={newProduct.descuento} onChange={(e) => setNewProduct((p) => ({ ...p, descuento: e.target.value }))} />
                  </div>
                </div>
              </div>
              {productError ? <p className="pilot-error-text">{productError}</p> : null}
            </div>
            <footer className="inv-modal__footer">
              <button type="button" className="inv-btn" onClick={() => setCreateProductOpen(false)} disabled={productSaving}>Cancelar</button>
              <button type="button" className="inv-btn inv-btn--primary" onClick={() => void createProductInline()} disabled={productSaving}>
                {productSaving ? "Guardando..." : "Guardar producto"}
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </section>
  );
}
