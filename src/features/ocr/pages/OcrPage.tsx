import { useCallback, useEffect, useRef, useState } from "react";
import { ErrorState } from "../../../app/components/states/ErrorState";
import { expenseOcrService, type OcrExpenseResult } from "../../../services/ocr/expense-ocr.service";
import { transactionsRepository } from "../../../services/repositories";
import type { Transaction } from "../../../shared/types/domain";

const fmt = (v: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(v);

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
};

const STEPS = [
  {
    number: 1,
    title: "Sube tu documento",
    description: "Arrastra o selecciona un ticket, factura de proveedor o recibo en formato PDF, JPG, PNG o WEBP.",
  },
  {
    number: 2,
    title: "Escanea automáticamente",
    description: "Nuestro sistema analiza el documento con OCR y extrae los datos del gasto de forma automática.",
  },
  {
    number: 3,
    title: "Revisa y guarda",
    description: "Comprueba los datos extraídos, ajústalos si es necesario y guarda el gasto directamente.",
  },
];

function IconUpload() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ec8228" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function IconScan() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
    </svg>
  );
}

function IconSave() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  );
}

export function OcrPage(): import("react").JSX.Element {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<OcrExpenseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [recentScans, setRecentScans] = useState<Transaction[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const loadRecent = useCallback(async () => {
    setRecentLoading(true);
    const result = await transactionsRepository.list({});
    setRecentLoading(false);
    if (result.success) {
      const ocrOnes = result.data
        .filter((t) => t.observaciones?.includes("OCR"))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10);
      setRecentScans(ocrOnes);
    }
  }, []);

  useEffect(() => {
    void loadRecent();
  }, [loadRecent]);

  const handleFile = (f: File | null) => {
    setFile(f);
    setAnalysis(null);
    setError(null);
    setFlash(null);
    if (f && f.type.startsWith("image/")) {
      const url = URL.createObjectURL(f);
      setPreview(url);
    } else {
      setPreview(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files?.[0] ?? null;
    if (dropped) handleFile(dropped);
  };

  const analyze = async () => {
    if (!file) {
      setError("Selecciona un archivo primero.");
      return;
    }
    setLoading(true);
    setError(null);
    setFlash(null);
    const result = await expenseOcrService.analyzeExpense({ file });
    setLoading(false);
    if (!result.success) {
      setError(result.error.message);
      setAnalysis(null);
      return;
    }
    setAnalysis(result.data);
    setFlash("Documento analizado correctamente.");
  };

  const createTransaction = async () => {
    if (!analysis) return;
    setSaving(true);
    const result = await expenseOcrService.createTransactionFromOcr(analysis);
    setSaving(false);
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    setFlash("Gasto guardado correctamente.");
    setAnalysis(null);
    setFile(null);
    setPreview(null);
    void loadRecent();
  };

  const removeFile = () => {
    setFile(null);
    setPreview(null);
    setAnalysis(null);
    setError(null);
    setFlash(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="ocr-page">
      {/* Steps */}
      <section className="ocr-steps">
        {STEPS.map((step) => (
          <div key={step.number} className="ocr-steps__item">
            <span className="ocr-steps__number">{step.number}</span>
            <div>
              <h4 className="ocr-steps__title">{step.title}</h4>
              <p className="ocr-steps__desc">{step.description}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Upload area + result */}
      <div className="ocr-main">
        <section className="pilot-panel ocr-upload-panel">
          <h3 className="ocr-upload-panel__heading">Subir documento</h3>

          <div
            className={`ocr-dropzone ${dragging ? "ocr-dropzone--active" : ""} ${file ? "ocr-dropzone--has-file" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => !file && inputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
          >
            {file ? (
              <div className="ocr-dropzone__file">
                {preview ? (
                  <img src={preview} alt="Vista previa" className="ocr-dropzone__preview" />
                ) : (
                  <div className="ocr-dropzone__file-icon">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ec8228" strokeWidth="1.5">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                )}
                <div className="ocr-dropzone__file-info">
                  <strong>{file.name}</strong>
                  <span>{(file.size / 1024).toFixed(0)} KB</span>
                </div>
                <button type="button" className="ocr-dropzone__remove" onClick={(e) => { e.stopPropagation(); removeFile(); }} aria-label="Eliminar archivo">
                  <IconTrash />
                </button>
              </div>
            ) : (
              <div className="ocr-dropzone__empty">
                <IconUpload />
                <p className="ocr-dropzone__text">Arrastra aquí tu documento</p>
                <p className="ocr-dropzone__subtext">o haz clic para seleccionar</p>
                <span className="ocr-dropzone__formats">PDF, JPG, PNG, WEBP · Máx. 10 MB</span>
              </div>
            )}

            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              className="ocr-dropzone__input"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="ocr-upload-panel__actions">
            <button
              type="button"
              className="pilot-btn pilot-btn--primary ocr-scan-btn"
              onClick={() => void analyze()}
              disabled={loading || saving || !file}
            >
              {loading ? (
                <>
                  <span className="ocr-scan-btn__spinner" />
                  Analizando...
                </>
              ) : (
                <>
                  <IconScan />
                  Escanear documento
                </>
              )}
            </button>
          </div>

          {flash ? <p className="ocr-flash">{flash}</p> : null}
          {error ? <ErrorState title="Error" description={error} /> : null}
        </section>

        {analysis ? (
          <section className="pilot-panel ocr-result">
            <h3 className="ocr-result__heading">Resultado del escaneo</h3>

            <div className="ocr-result__grid">
              <div className="ocr-result__field">
                <span className="ocr-result__label">Concepto</span>
                <strong className="ocr-result__value">{analysis.concept}</strong>
              </div>
              <div className="ocr-result__field">
                <span className="ocr-result__label">Proveedor</span>
                <strong className="ocr-result__value">{analysis.provider ?? "No detectado"}</strong>
              </div>
              <div className="ocr-result__field">
                <span className="ocr-result__label">Fecha</span>
                <strong className="ocr-result__value">{fmtDate(analysis.date)}</strong>
              </div>
              <div className="ocr-result__field">
                <span className="ocr-result__label">Importe</span>
                <strong className="ocr-result__value ocr-result__value--amount">{fmt(analysis.amount)}</strong>
              </div>
              <div className="ocr-result__field">
                <span className="ocr-result__label">IVA detectado</span>
                <strong className="ocr-result__value">{analysis.taxRate !== null ? `${analysis.taxRate}%` : "N/A"}</strong>
              </div>
            </div>

            <button
              type="button"
              className="pilot-btn pilot-btn--primary ocr-save-btn"
              onClick={() => void createTransaction()}
              disabled={saving}
            >
              <IconSave />
              {saving ? "Guardando..." : "Guardar como gasto"}
            </button>
          </section>
        ) : null}
      </div>

      {/* Recent scans */}
      <section className="pilot-panel ocr-recent">
        <h3 className="ocr-recent__heading">Últimos escaneos</h3>

        {recentLoading ? (
          <p className="ocr-recent__empty">Cargando...</p>
        ) : recentScans.length === 0 ? (
          <p className="ocr-recent__empty">Aún no hay escaneos registrados.</p>
        ) : (
          <div className="ocr-recent__table-wrap">
            <table className="ocr-recent__table">
              <thead>
                <tr>
                  <th>Concepto</th>
                  <th>Fecha</th>
                  <th>Importe</th>
                  <th>Categoría</th>
                </tr>
              </thead>
              <tbody>
                {recentScans.map((tx) => (
                  <tr key={tx.id}>
                    <td>{tx.concepto}</td>
                    <td>{fmtDate(tx.fecha)}</td>
                    <td className="ocr-recent__amount">{fmt(tx.importe)}</td>
                    <td>
                      <span className="ocr-recent__cat">{tx.categoria}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
