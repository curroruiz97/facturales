import type { Product } from "../../../shared/types/domain";
import { calculateProductMargin, calculateProductPvp, formatProductCurrency } from "../domain/product-pricing";

interface ProductsTableProps {
  products: Product[];
  selectedIds: Set<string>;
  onToggleSelection: (productId: string, checked: boolean) => void;
  onTogglePageSelection: (checked: boolean) => void;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
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

export function ProductsTable({
  products,
  selectedIds,
  onToggleSelection,
  onTogglePageSelection,
  onEdit,
  onDelete,
}: ProductsTableProps): import("react").JSX.Element {
  const selectedCountOnPage = products.filter((product) => selectedIds.has(product.id)).length;
  const allSelectedOnPage = products.length > 0 && selectedCountOnPage === products.length;
  const someSelectedOnPage = selectedCountOnPage > 0 && selectedCountOnPage < products.length;

  return (
    <div className="overflow-auto">
      <table className="pilot-table prod-table">
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
            <th>PRODUCTO / SERVICIO</th>
            <th>REFERENCIA</th>
            <th>PRECIO COMPRA</th>
            <th>PRECIO VENTA</th>
            <th>MARGEN</th>
            <th>DESCUENTO</th>
            <th>PVP</th>
            <th className="text-right">ACCIONES</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => {
            const margin = calculateProductMargin(product.precioCompra, product.precioVenta);
            const pvp = calculateProductPvp(product.precioVenta, product.impuesto);
            return (
              <tr key={product.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(product.id)}
                    onChange={(event) => onToggleSelection(product.id, event.target.checked)}
                    aria-label={`Seleccionar ${product.nombre}`}
                  />
                </td>
                <td>
                  <strong>{product.nombre}</strong>
                </td>
                <td>{product.referencia || "—"}</td>
                <td>{formatProductCurrency(product.precioCompra ?? 0)}</td>
                <td>{formatProductCurrency(product.precioVenta)}</td>
                <td>
                  {margin === null ? "—" : <span className={margin >= 0 ? "pilot-text-ok" : "pilot-text-danger"}>{margin.toFixed(0)}%</span>}
                </td>
                <td>{product.descuento > 0 ? `${product.descuento}%` : "—"}</td>
                <td>{formatProductCurrency(pvp)}</td>
                <td className="text-right">
                  <div className="tx-actions-cell">
                    <button type="button" className="tx-action-icon tx-action-icon--edit" onClick={() => onEdit(product)} title="Editar">
                      <IconEdit />
                    </button>
                    <button type="button" className="tx-action-icon tx-action-icon--delete" onClick={() => onDelete(product)} title="Eliminar">
                      <IconTrash />
                    </button>
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
