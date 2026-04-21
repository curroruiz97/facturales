import type { ProductsImportPreview } from "../domain/products-import";

interface ProductsImportModalProps {
  open: boolean;
  fileName: string | null;
  preview: ProductsImportPreview | null;
  parseError: string | null;
  importing: boolean;
  onClose: () => void;
  onPickFile: (file: File) => Promise<void>;
  onConfirmImport: () => Promise<void>;
}

export function ProductsImportModal(props: ProductsImportModalProps): import("react").JSX.Element | null {
  const { open, fileName, preview, parseError, importing, onClose, onPickFile, onConfirmImport } = props;
  if (!open) return null;

  return (
    <div className="pilot-modal" role="dialog" aria-modal="true" aria-label="Importar productos">
      <button type="button" className="pilot-modal__overlay" onClick={onClose} aria-label="Cerrar modal" />
      <div className="pilot-modal__content">
        <div className="pilot-modal__header">
          <h3 className="text-lg font-bold">Importar productos (CSV/XLSX)</h3>
          <button type="button" className="pilot-btn" onClick={onClose} disabled={importing}>
            Cerrar
          </button>
        </div>

        <div className="pilot-panel">
          <p className="text-sm opacity-80">
            Selecciona un archivo con columnas de nombre y precio de venta. Opcionales: referencia, descripción,
            precio de compra, impuesto y descuento.
          </p>
          <label className="pilot-field mt-3">
            Archivo
            <input
              className="pilot-input"
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                void onPickFile(file);
              }}
            />
          </label>
          {fileName ? <p className="mt-2 text-xs opacity-75">Archivo: {fileName}</p> : null}
          {parseError ? <p className="pilot-error-text mt-2">{parseError}</p> : null}
        </div>

        {preview ? (
          <div className="pilot-grid mt-4">
            <div className="pilot-grid pilot-grid--two">
              <div className="pilot-kpi">
                <span className="pilot-kpi__label">Filas validas</span>
                <span className="pilot-kpi__value">{preview.validRows.length}</span>
              </div>
              <div className="pilot-kpi">
                <span className="pilot-kpi__label">Filas con error</span>
                <span className="pilot-kpi__value">{preview.invalidRows.length}</span>
              </div>
            </div>

            {preview.invalidRows.length > 0 ? (
              <div className="pilot-panel">
                <h4 className="text-sm font-bold">Errores detectados</h4>
                <div className="mt-2 max-h-36 overflow-auto">
                  <ul className="space-y-1 text-xs">
                    {preview.invalidRows.slice(0, 12).map((row) => (
                      <li key={`product-import-error-${row.rowIndex}`} className="rounded border border-red-200 px-2 py-1 text-red-700">
                        Fila {row.rowIndex}: {row.errors.join("; ")}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="pilot-modal__footer mt-5">
          <button type="button" className="pilot-btn" onClick={onClose} disabled={importing}>
            Cancelar
          </button>
          <button
            type="button"
            className="pilot-btn pilot-btn--primary"
            onClick={() => void onConfirmImport()}
            disabled={importing || !preview || preview.validRows.length === 0}
          >
            {importing ? "Importando..." : `Importar ${preview?.validRows.length ?? 0}`}
          </button>
        </div>
      </div>
    </div>
  );
}
