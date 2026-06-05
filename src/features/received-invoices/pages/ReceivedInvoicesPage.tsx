import { useEffect, useRef, useState } from "react";
import { ErrorState } from "../../../app/components/states/ErrorState";
import { LoadingSkeleton } from "../../../app/components/states/LoadingSkeleton";
import {
  receivedInvoicesService,
  type ReceivedInvoiceRecord,
  type ReceivedInvoiceStatus,
} from "../../../services/received-invoices/received-invoices.service";

function formatCurrency(amount: number, currency: string): string {
  const cur = /^[A-Z]{3}$/.test((currency || "").toUpperCase()) ? currency.toUpperCase() : "EUR";
  try {
    return new Intl.NumberFormat("es-ES", { style: "currency", currency: cur }).format(amount || 0);
  } catch {
    return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount || 0);
  }
}

function statusBadge(status: ReceivedInvoiceStatus): { label: string; cls: string } {
  if (status === "accepted") return { label: "Aceptada", cls: "settings-badge--ok" };
  if (status === "rejected") return { label: "Rechazada", cls: "settings-badge--warn" };
  return { label: "Recibida", cls: "settings-badge--warn" };
}

export function ReceivedInvoicesPage(): import("react").JSX.Element {
  const [items, setItems] = useState<ReceivedInvoiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async (): Promise<void> => {
    setLoading(true);
    const result = await receivedInvoicesService.listMine();
    setLoading(false);
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    setError(null);
    setItems(result.data);
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 4000);
    return () => clearTimeout(t);
  }, [flash]);

  const onPickFile = (): void => fileRef.current?.click();

  const onFileChange = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    event.target.value = ""; // permite re-subir el mismo archivo
    if (!file) return;
    setUploading(true);
    const result = await receivedInvoicesService.upload(file);
    setUploading(false);
    if (!result.success) {
      setFlash(result.error.message);
      return;
    }
    setFlash(
      result.data.fileFormat === "xml"
        ? `Factura de ${result.data.supplierName || "proveedor"} importada (Facturae).`
        : "PDF subido. Revisa los datos del proveedor.",
    );
    await load();
  };

  const onSetStatus = async (id: string, status: ReceivedInvoiceStatus): Promise<void> => {
    const result = await receivedInvoicesService.setStatus(id, status);
    if (!result.success) {
      setFlash(result.error.message);
      return;
    }
    await load();
  };

  const onDownload = async (filePath: string | null): Promise<void> => {
    if (!filePath) return;
    const result = await receivedInvoicesService.getDownloadUrl(filePath);
    if (!result.success) {
      setFlash(result.error.message);
      return;
    }
    window.open(result.data, "_blank", "noopener,noreferrer");
  };

  const onRemove = async (id: string): Promise<void> => {
    if (!window.confirm("¿Eliminar esta factura recibida?")) return;
    const result = await receivedInvoicesService.remove(id);
    if (!result.success) {
      setFlash(result.error.message);
      return;
    }
    await load();
  };

  return (
    <div className="doc-page">
      <div className="doc-page__header">
        <div>
          <h1 className="doc-page__title">Facturas recibidas</h1>
          <p className="doc-page__subtitle">
            Sube las facturas que recibes de tus proveedores (XML Facturae o PDF). El XML se lee
            automáticamente; el PDF se guarda para tu revisión. La recepción por email llegará próximamente.
          </p>
        </div>
        <div>
          <input
            ref={fileRef}
            type="file"
            accept=".xml,.pdf,application/xml,text/xml,application/pdf"
            style={{ display: "none" }}
            onChange={onFileChange}
          />
          <button type="button" className="settings-btn settings-btn--primary" onClick={onPickFile} disabled={uploading}>
            {uploading ? "Subiendo…" : "+ Subir factura (XML o PDF)"}
          </button>
        </div>
      </div>

      {flash ? <div className="settings-notice">{flash}</div> : null}

      {loading ? (
        <LoadingSkeleton message="Cargando facturas recibidas..." />
      ) : error ? (
        <ErrorState title="No se pudieron cargar las facturas recibidas" description={error} onRetry={() => void load()} />
      ) : (
        <div className="settings-table-wrap">
          <table className="settings-table">
            <thead>
              <tr>
                <th>Proveedor</th>
                <th>NIF</th>
                <th>Nº factura</th>
                <th>Fecha</th>
                <th>Total</th>
                <th>Formato</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="settings-table__empty">
                    Aún no has recibido facturas. Pulsa "Subir factura" para añadir la primera.
                  </td>
                </tr>
              ) : null}
              {items.map((row) => {
                const badge = statusBadge(row.status);
                return (
                  <tr key={row.id}>
                    <td>{row.supplierName || "—"}</td>
                    <td>{row.supplierNif || "—"}</td>
                    <td>{row.invoiceNumber || "—"}</td>
                    <td>{row.issueDate || "—"}</td>
                    <td>{formatCurrency(row.totalAmount, row.currency)}</td>
                    <td>{(row.fileFormat || "").toUpperCase() || "—"}</td>
                    <td>
                      <span className={`settings-badge ${badge.cls}`}>{badge.label}</span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                        <button type="button" className="settings-btn" onClick={() => void onDownload(row.filePath)}>
                          Descargar
                        </button>
                        {row.status !== "accepted" ? (
                          <button type="button" className="settings-btn" onClick={() => void onSetStatus(row.id, "accepted")}>
                            Aceptar
                          </button>
                        ) : null}
                        {row.status !== "rejected" ? (
                          <button type="button" className="settings-btn" onClick={() => void onSetStatus(row.id, "rejected")}>
                            Rechazar
                          </button>
                        ) : null}
                        <button type="button" className="settings-btn settings-btn--danger-ghost" onClick={() => void onRemove(row.id)}>
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
