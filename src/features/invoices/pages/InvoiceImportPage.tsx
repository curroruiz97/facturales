import { useCallback, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ErrorState } from "../../../app/components/states/ErrorState";
import {
  importParsedInvoices,
  parseInvoiceFile,
  type ImportRow,
  type ImportRowStatus,
  type InvoiceImportSummary,
  type ParsedInvoice,
} from "../../../services/invoice-import/invoice-import.service";

const ACCEPTED_TYPES = ".pdf,.xlsx,.xls";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB por archivo

const fmt = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);

const fmtDate = (iso: string) => {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
};

const STATUS_LABEL: Record<ImportRowStatus, string> = {
  pending: "Pendiente",
  parsing: "Analizando…",
  parsed: "Listo para importar",
  duplicate: "Duplicada",
  importing: "Importando…",
  imported: "Importada ✓",
  error: "Error",
};

function IconUpload() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ec8228" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function IconFile() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
    </svg>
  );
}

export function InvoiceImportPage(): import("react").JSX.Element {
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [dragging, setDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState<InvoiceImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const addFiles = useCallback(async (files: File[]) => {
    setError(null);
    setSummary(null);

    // Validar tamaños y formatos
    const valid: File[] = [];
    const rejected: ImportRow[] = [];
    for (const file of files) {
      const lower = file.name.toLowerCase();
      const isPdf = lower.endsWith(".pdf");
      const isXlsx = lower.endsWith(".xlsx") || lower.endsWith(".xls");
      if (!isPdf && !isXlsx) {
        rejected.push({
          fileName: file.name,
          fileSize: file.size,
          status: "error",
          parsed: null,
          errorMessage: "Formato no soportado. Usa PDF o XLSX.",
        });
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        rejected.push({
          fileName: file.name,
          fileSize: file.size,
          status: "error",
          parsed: null,
          errorMessage: "Archivo demasiado grande (máx. 5 MB).",
        });
        continue;
      }
      valid.push(file);
    }

    // Inicializar las filas en estado "parsing" y añadir las rechazadas
    const initialRows: ImportRow[] = valid.map((f) => ({
      fileName: f.name,
      fileSize: f.size,
      status: "parsing",
      parsed: null,
      errorMessage: null,
    }));

    setRows((prev) => [...prev, ...initialRows, ...rejected]);

    // Parsear en paralelo (máx 4 concurrentes para no saturar el navegador)
    const concurrency = 4;
    let cursor = 0;
    const startedAt = rows.length;
    const parseQueue = async () => {
      while (cursor < valid.length) {
        const idx = cursor++;
        const file = valid[idx];
        try {
          const parsed = await parseInvoiceFile(file);
          const newStatus: ImportRowStatus = parsed.warnings.length > 0 ? "parsed" : "parsed";
          setRows((prev) => {
            const next = [...prev];
            const target = startedAt + idx;
            if (target < next.length) {
              next[target] = {
                ...next[target],
                status: newStatus,
                parsed,
                errorMessage: null,
              };
            }
            return next;
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Error al analizar el archivo";
          setRows((prev) => {
            const next = [...prev];
            const target = startedAt + idx;
            if (target < next.length) {
              next[target] = {
                ...next[target],
                status: "error",
                errorMessage: message,
              };
            }
            return next;
          });
        }
      }
    };

    await Promise.all(Array.from({ length: concurrency }, () => parseQueue()));
  }, [rows.length]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files ?? []);
    if (files.length > 0) void addFiles(files);
  };

  const handleSelectFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) void addFiles(files);
    if (inputRef.current) inputRef.current.value = "";
  };

  const removeRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    setRows([]);
    setSummary(null);
    setError(null);
  };

  const updateRowField = (index: number, mutator: (parsed: ParsedInvoice) => ParsedInvoice) => {
    setRows((prev) => {
      const next = [...prev];
      const row = next[index];
      if (!row.parsed) return prev;
      next[index] = { ...row, parsed: mutator(row.parsed) };
      return next;
    });
  };

  const importAll = async () => {
    const ready = rows
      .map((r, idx) => ({ row: r, idx }))
      .filter((r) => r.row.status === "parsed" && r.row.parsed !== null);
    if (ready.length === 0) {
      setError("No hay facturas válidas para importar.");
      return;
    }

    setImporting(true);
    setError(null);

    // Marcar todas como "importing"
    setRows((prev) => {
      const next = [...prev];
      for (const item of ready) {
        next[item.idx] = { ...next[item.idx], status: "importing" };
      }
      return next;
    });

    const parsedList = ready.map((r) => r.row.parsed!);
    const indexMap = ready.map((r) => r.idx);

    const result = await importParsedInvoices(parsedList, (parsedIndex, _total, _parsed, success, message) => {
      const targetIdx = indexMap[parsedIndex];
      setRows((prev) => {
        const next = [...prev];
        if (success) {
          next[targetIdx] = { ...next[targetIdx], status: "imported", errorMessage: null };
        } else if (message === "Duplicado") {
          next[targetIdx] = { ...next[targetIdx], status: "duplicate", errorMessage: "Ya existe una factura con ese número" };
        } else {
          next[targetIdx] = { ...next[targetIdx], status: "error", errorMessage: message ?? "Error" };
        }
        return next;
      });
    });

    setSummary(result);
    setImporting(false);
  };

  const stats = {
    total: rows.length,
    ready: rows.filter((r) => r.status === "parsed").length,
    imported: rows.filter((r) => r.status === "imported").length,
    duplicates: rows.filter((r) => r.status === "duplicate").length,
    errors: rows.filter((r) => r.status === "error").length,
  };

  return (
    <div className="invoice-import-page">
      <header className="invoice-import__header">
        <div>
          <h2 className="invoice-import__title">Importar facturas existentes</h2>
          <p className="invoice-import__subtitle">
            Sube tus PDFs o Excels de facturas ya emitidas. El sistema reconocerá la serie, el número, el cliente
            y los importes automáticamente, y las creará como facturas emitidas.
          </p>
        </div>
        <div className="invoice-import__header-actions">
          <Link to="/facturas/emitidas" className="pilot-btn">Ver emitidas</Link>
        </div>
      </header>

      <section
        className={`invoice-import__dropzone ${dragging ? "invoice-import__dropzone--active" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
      >
        <IconUpload />
        <p className="invoice-import__dropzone-text">Arrastra aquí tus PDFs o Excels</p>
        <p className="invoice-import__dropzone-subtext">o haz clic para seleccionar</p>
        <span className="invoice-import__dropzone-formats">PDF, XLSX · Múltiples archivos · Máx. 5 MB cada uno</span>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_TYPES}
          className="invoice-import__file-input"
          onChange={handleSelectFiles}
        />
      </section>

      {error ? <ErrorState title="Error" description={error} /> : null}

      {rows.length > 0 ? (
        <section className="invoice-import__preview">
          <div className="invoice-import__preview-header">
            <div className="invoice-import__stats">
              <span><strong>{stats.total}</strong> archivos</span>
              {stats.ready > 0 ? <span className="invoice-import__stat--ok">{stats.ready} listos</span> : null}
              {stats.imported > 0 ? <span className="invoice-import__stat--imported">{stats.imported} importadas</span> : null}
              {stats.duplicates > 0 ? <span className="invoice-import__stat--warn">{stats.duplicates} duplicadas</span> : null}
              {stats.errors > 0 ? <span className="invoice-import__stat--err">{stats.errors} errores</span> : null}
            </div>
            <div className="invoice-import__preview-actions">
              <button type="button" className="pilot-btn" onClick={clearAll} disabled={importing}>
                Limpiar
              </button>
              <button
                type="button"
                className="pilot-btn pilot-btn--primary"
                onClick={() => void importAll()}
                disabled={importing || stats.ready === 0}
              >
                {importing ? "Importando…" : `Importar ${stats.ready > 0 ? stats.ready : ""}`}
              </button>
            </div>
          </div>

          <div className="invoice-import__rows">
            {rows.map((row, index) => (
              <ImportRowCard
                key={`${row.fileName}-${index}`}
                row={row}
                index={index}
                onRemove={() => removeRow(index)}
                onEdit={(mutator) => updateRowField(index, mutator)}
                disabled={importing || row.status === "imported"}
              />
            ))}
          </div>

          {summary ? (
            <div className="invoice-import__summary">
              <p>
                <strong>Resultado:</strong> {summary.imported} importadas
                {summary.skipped > 0 ? `, ${summary.skipped} duplicadas omitidas` : ""}
                {summary.failed > 0 ? `, ${summary.failed} con error` : ""}.
              </p>
              {summary.imported > 0 ? (
                <Link to="/facturas/emitidas" className="pilot-btn pilot-btn--primary">
                  Ver facturas emitidas
                </Link>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

interface ImportRowCardProps {
  row: ImportRow;
  index: number;
  onRemove: () => void;
  onEdit: (mutator: (parsed: ParsedInvoice) => ParsedInvoice) => void;
  disabled: boolean;
}

function ImportRowCard({ row, onRemove, onEdit, disabled }: ImportRowCardProps): import("react").JSX.Element {
  const statusClass = `invoice-import__status invoice-import__status--${row.status}`;
  const parsed = row.parsed;

  return (
    <article className="invoice-import__row">
      <header className="invoice-import__row-header">
        <span className="invoice-import__row-icon"><IconFile /></span>
        <div className="invoice-import__row-meta">
          <strong className="invoice-import__row-filename">{row.fileName}</strong>
          <span className="invoice-import__row-size">{(row.fileSize / 1024).toFixed(0)} KB</span>
        </div>
        <span className={statusClass}>{STATUS_LABEL[row.status]}</span>
        {row.status !== "imported" ? (
          <button
            type="button"
            className="invoice-import__remove"
            onClick={onRemove}
            disabled={disabled}
            aria-label="Eliminar archivo"
          >
            <IconTrash />
          </button>
        ) : null}
      </header>

      {row.errorMessage ? (
        <p className="invoice-import__error-msg">{row.errorMessage}</p>
      ) : null}

      {parsed ? (
        <div className="invoice-import__details">
          <div className="invoice-import__field-grid">
            <label className="invoice-import__field">
              <span>Número</span>
              <input
                type="text"
                value={parsed.invoiceNumber}
                disabled={disabled}
                onChange={(e) => onEdit((p) => ({ ...p, invoiceNumber: e.target.value }))}
              />
            </label>
            <label className="invoice-import__field">
              <span>Fecha</span>
              <input
                type="date"
                value={parsed.issueDate}
                disabled={disabled}
                onChange={(e) => onEdit((p) => ({ ...p, issueDate: e.target.value }))}
              />
            </label>
            <label className="invoice-import__field">
              <span>Cliente</span>
              <input
                type="text"
                value={parsed.client.name}
                disabled={disabled}
                onChange={(e) => onEdit((p) => ({ ...p, client: { ...p.client, name: e.target.value } }))}
              />
            </label>
            <label className="invoice-import__field">
              <span>NIF/CIF</span>
              <input
                type="text"
                value={parsed.client.identifier}
                disabled={disabled}
                onChange={(e) => onEdit((p) => ({ ...p, client: { ...p.client, identifier: e.target.value.toUpperCase() } }))}
              />
            </label>
            <label className="invoice-import__field invoice-import__field--full">
              <span>Concepto</span>
              <input
                type="text"
                value={parsed.concept}
                disabled={disabled}
                onChange={(e) => onEdit((p) => ({ ...p, concept: e.target.value }))}
              />
            </label>
          </div>
          <div className="invoice-import__amounts">
            <span>Base: <strong>{fmt(parsed.base)}</strong></span>
            <span>IVA {parsed.ivaRate}%: <strong>{fmt(parsed.ivaAmount)}</strong></span>
            {parsed.irpfRate !== null ? (
              <span>IRPF {parsed.irpfRate}%: <strong>−{fmt(parsed.irpfAmount ?? 0)}</strong></span>
            ) : null}
            <span className="invoice-import__amount-total">Total: <strong>{fmt(parsed.total)}</strong></span>
            <span className="invoice-import__amount-date">{fmtDate(parsed.issueDate)}</span>
          </div>
          {parsed.warnings.length > 0 ? (
            <ul className="invoice-import__warnings">
              {parsed.warnings.map((w, i) => (
                <li key={i}>⚠ {w}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
