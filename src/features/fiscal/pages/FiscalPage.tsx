import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useFiscalData } from "../hooks/use-fiscal-data";
import { extractInvoiceFiscalData } from "../domain/fiscal-calc";

const QUARTERS = [
  { id: 0, label: "Año Natural" },
  { id: 1, label: "1er Trimestre" },
  { id: 2, label: "2º Trimestre" },
  { id: 3, label: "3er Trimestre" },
  { id: 4, label: "4º Trimestre" },
] as const;

function quarterSubtitle(q: number, year: number): string {
  if (q === 0) return `Año Natural ${year}`;
  const labels = ["", "1er Trimestre (Ene-Mar)", "2º Trimestre (Abr-Jun)", "3er Trimestre (Jul-Sep)", "4º Trimestre (Oct-Dic)"];
  return `${labels[q]} ${year}`;
}

function tableTitleForQuarter(q: number): string {
  if (q === 0) return "Facturas del Año Natural";
  const labels = ["", "Facturas del 1er Trimestre (Ene-Mar)", "Facturas del 2º Trimestre (Abr-Jun)", "Facturas del 3er Trimestre (Jul-Sep)", "Facturas del 4º Trimestre (Oct-Dic)"];
  return labels[q];
}

function fmt(n: number): string {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function formatDate(iso: string): string {
  if (!iso) return "-";
  const d = new Date(`${iso}T00:00:00`);
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}

function escapeCsv(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function downloadCsvFile(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function FiscalPage(): import("react").JSX.Element {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [quarter, setQuarter] = useState(1);
  const [showYearDrop, setShowYearDrop] = useState(false);
  const [showQuarterDrop, setShowQuarterDrop] = useState(false);

  const fiscal = useFiscalData(year, quarter);

  const handleExportFiscal = (): void => {
    if (fiscal.invoices.length === 0) return;
    const headers = ["Número", "Cliente", "Fecha", "Base", "IVA", "IRPF", "Total"];
    const rows = fiscal.invoices.map((inv) => {
      const d = extractInvoiceFiscalData(inv);
      return [
        inv.invoiceNumber ?? "",
        inv.clientName ?? "",
        inv.issueDate ?? "",
        d.taxBase.toFixed(2),
        d.taxAmount.toFixed(2),
        d.retentionAmount.toFixed(2),
        d.totalAmount.toFixed(2),
      ];
    });
    const csv = `\uFEFF${headers.map(escapeCsv).join(",")}\n${rows.map((row) => row.map((cell) => escapeCsv(String(cell))).join(",")).join("\n")}`;
    const suffix = quarter === 0 ? `anual-${year}` : `${year}-Q${quarter}`;
    downloadCsvFile(`facturas-${suffix}.csv`, csv);
  };

  const years = useMemo(() => {
    const list: number[] = [];
    for (let y = currentYear; y >= currentYear - 4; y--) list.push(y);
    return list;
  }, [currentYear]);

  return (
    <div className="fiscal-page">
      {/* Header */}
      <div className="fiscal-header">
        <div>
          <h2>Resumen Fiscal</h2>
          <p>{quarterSubtitle(quarter, year)}</p>
        </div>
        <div className="fiscal-selectors">
          <div style={{ position: "relative" }}>
            <button type="button" className="fiscal-selector-btn" onClick={() => { setShowYearDrop(!showYearDrop); setShowQuarterDrop(false); }}>
              <span>{year}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            {showYearDrop ? (
              <div style={{ position: "absolute", right: 0, top: 48, zIndex: 20, minWidth: 112, overflow: "hidden", borderRadius: 12, border: "1px solid #EDF2F7", background: "#ffffff", boxShadow: "0 12px 32px rgba(0,0,0,.12)" }}>
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {years.map((y) => (
                    <li key={y} style={{ padding: "8px 16px", fontSize: 14, fontWeight: 500, color: "#1A202C", cursor: "pointer" }}
                      onClick={() => { setYear(y); setShowYearDrop(false); }}
                      onMouseEnter={(e) => { (e.target as HTMLElement).style.background = "#F7FAFC"; }}
                      onMouseLeave={(e) => { (e.target as HTMLElement).style.background = ""; }}
                    >{y}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
          <div style={{ position: "relative" }}>
            <button type="button" className="fiscal-selector-btn" onClick={() => { setShowQuarterDrop(!showQuarterDrop); setShowYearDrop(false); }}>
              <span>{QUARTERS.find((q) => q.id === quarter)?.label}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            {showQuarterDrop ? (
              <div style={{ position: "absolute", right: 0, top: 48, zIndex: 20, minWidth: 176, overflow: "hidden", borderRadius: 12, border: "1px solid #EDF2F7", background: "#ffffff", boxShadow: "0 12px 32px rgba(0,0,0,.12)" }}>
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {QUARTERS.map((q) => (
                    <li key={q.id} style={{ padding: "8px 16px", fontSize: 14, fontWeight: 500, color: "#1A202C", cursor: "pointer" }}
                      onClick={() => { setQuarter(q.id); setShowQuarterDrop(false); }}
                      onMouseEnter={(e) => { (e.target as HTMLElement).style.background = "#F7FAFC"; }}
                      onMouseLeave={(e) => { (e.target as HTMLElement).style.background = ""; }}
                    >{q.label}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {fiscal.loading ? (
        <p style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>Cargando datos fiscales...</p>
      ) : fiscal.error ? (
        <p style={{ padding: 40, textAlign: "center", color: "#ef4444" }}>{fiscal.error}</p>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="fiscal-kpis">
            <div className="fiscal-kpi fiscal-kpi--blue" title="Suma de la base imponible (sin IVA) de todas las facturas emitidas en el periodo seleccionado">
              <div className="fiscal-kpi__header">
                <div className="fiscal-kpi__icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M15 9.354a4 4 0 10 0 5.292M12 7v10M9 15h6M9 9h4" /></svg>
                </div>
                <span className="fiscal-kpi__label">Total Facturado</span>
              </div>
              <p className="fiscal-kpi__value">{fmt(fiscal.totalFacturado)}</p>
              <p className="fiscal-kpi__sublabel">Base imponible</p>
            </div>

            <div className="fiscal-kpi fiscal-kpi--green" title="IVA cobrado a tus clientes en las facturas emitidas">
              <div className="fiscal-kpi__header">
                <div className="fiscal-kpi__icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
                </div>
                <span className="fiscal-kpi__label">IVA Repercutido</span>
              </div>
              <p className="fiscal-kpi__value">{fmt(fiscal.ivaRepercutido)}</p>
              <p className="fiscal-kpi__sublabel">IVA cobrado en facturas</p>
            </div>

            <div className="fiscal-kpi fiscal-kpi--orange" title="IRPF que tus clientes retienen e ingresan a Hacienda en tu nombre">
              <div className="fiscal-kpi__header">
                <div className="fiscal-kpi__icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></svg>
                </div>
                <span className="fiscal-kpi__label">IRPF Retenido</span>
              </div>
              <p className="fiscal-kpi__value">{fmt(fiscal.irpfRetenido)}</p>
              <p className="fiscal-kpi__sublabel">Retenciones en facturas</p>
            </div>

            <div className="fiscal-kpi fiscal-kpi--purple" title="Número total de facturas emitidas en el periodo seleccionado">
              <div className="fiscal-kpi__header">
                <div className="fiscal-kpi__icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7Z" /><path d="M14 2v4a2 2 0 002 2h4" /><path d="M10 18v-4" /><path d="M14 18v-6" /></svg>
                </div>
                <span className="fiscal-kpi__label">Facturas Emitidas</span>
              </div>
              <p className="fiscal-kpi__value">{fiscal.facturasEmitidas}</p>
              <p className="fiscal-kpi__sublabel">En este periodo</p>
            </div>
          </div>

          {/* Middle: Pagos + Obligaciones */}
          <div className="fiscal-middle">
            <div className="fiscal-panel">
              <h3>Resumen de Pagos</h3>
              <div className="fiscal-payment-rows">
                <div className="fiscal-payment-row fiscal-payment-row--green">
                  <div className="fiscal-payment-row__left">
                    <div className="fiscal-payment-row__icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><path d="M22 4L12 14.01l-3-3" /></svg>
                    </div>
                    <div>
                      <p className="fiscal-payment-row__sublabel">Facturas Pagadas</p>
                      <p className="fiscal-payment-row__count">{fiscal.pagos.pagadasCount}</p>
                    </div>
                  </div>
                  <p className="fiscal-payment-row__amount">{fmt(fiscal.pagos.pagadasImporte)}</p>
                </div>

                <div className="fiscal-payment-row fiscal-payment-row--orange">
                  <div className="fiscal-payment-row__left">
                    <div className="fiscal-payment-row__icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                    </div>
                    <div>
                      <p className="fiscal-payment-row__sublabel">Facturas Pendientes</p>
                      <p className="fiscal-payment-row__count">{fiscal.pagos.pendientesCount}</p>
                    </div>
                  </div>
                  <p className="fiscal-payment-row__amount">{fmt(fiscal.pagos.pendientesImporte)}</p>
                </div>

                <div className="fiscal-payment-row fiscal-payment-row--blue">
                  <div className="fiscal-payment-row__left">
                    <div className="fiscal-payment-row__icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></svg>
                    </div>
                    <p>Total Bruto</p>
                  </div>
                  <p className="fiscal-payment-row__amount">{fmt(fiscal.pagos.totalBruto)}</p>
                </div>
              </div>
            </div>

            <div className="fiscal-panel">
              <h3>Obligaciones Tributarias</h3>
              <div className="fiscal-tax-section">
                <h4>
                  <span className="fiscal-h4-icon fiscal-h4-icon--blue">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><path d="M4 22v-7" /></svg>
                  </span>
                  Modelo 303 - IVA
                </h4>
                <div className="fiscal-tax-rows">
                  <div className="fiscal-tax-row">
                    <span title="IVA cobrado a tus clientes en las facturas emitidas del periodo">IVA Repercutido:</span>
                    <span>{fmt(fiscal.modelo303.repercutido)}</span>
                  </div>
                  <div className="fiscal-tax-row">
                    <span title="IVA pagado en tus gastos del periodo">IVA Soportado:</span>
                    <span>{fmt(fiscal.modelo303.soportado)}</span>
                  </div>
                  <div className="fiscal-tax-result">
                    <span>{fiscal.modelo303.label}</span>
                    <span>{fmt(fiscal.modelo303.resultado)}</span>
                  </div>
                </div>
              </div>

              <hr className="fiscal-tax-divider" />

              <div className="fiscal-tax-section">
                <h4>
                  <span className="fiscal-h4-icon fiscal-h4-icon--orange">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4-4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>
                  </span>
                  Modelo 130 - IRPF
                </h4>
                <div className="fiscal-tax-rows">
                  <div className="fiscal-tax-row">
                    <span title="Base imponible total de tus facturas emitidas en el periodo">Ingresos:</span>
                    <span>{fmt(fiscal.modelo130.ingresos)}</span>
                  </div>
                  <div className="fiscal-tax-row">
                    <span title="Base imponible de los gastos registrados">Gastos:</span>
                    <span>{fmt(fiscal.modelo130.gastos)}</span>
                  </div>
                  <div className="fiscal-tax-row">
                    <span title="IRPF que tus clientes ya han retenido e ingresado a Hacienda por ti">Retenciones:</span>
                    <span>{fmt(fiscal.modelo130.retenciones)}</span>
                  </div>
                  <div className="fiscal-tax-result">
                    <span>Beneficio neto:</span>
                    <span>{fmt(fiscal.modelo130.beneficioNeto)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabla de Facturas */}
          <div className="fiscal-invoices-panel">
            <div className="fiscal-invoices-header">
              <h3>{tableTitleForQuarter(quarter)}</h3>
              <button
                type="button"
                className="fiscal-export-btn"
                onClick={handleExportFiscal}
                disabled={fiscal.invoices.length === 0}
                title={fiscal.invoices.length === 0 ? "No hay facturas para exportar en este periodo" : "Descargar CSV"}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Exportar
              </button>
            </div>
            <div style={{ width: "100%", overflowX: "auto" }}>
              <table className="fiscal-invoices-table">
                <thead>
                  <tr>
                    <th>Número</th>
                    <th>Cliente</th>
                    <th>Fecha</th>
                    <th>Base</th>
                    <th>IVA</th>
                    <th>IRPF</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {fiscal.invoices.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: "40px 0", textAlign: "center", fontSize: 14, color: "#A0AEC0" }}>
                        No hay facturas en este periodo
                      </td>
                    </tr>
                  ) : (
                    fiscal.invoices.map((inv) => {
                      const d = extractInvoiceFiscalData(inv);
                      return (
                        <tr key={inv.id}>
                          <td>{inv.invoiceNumber ?? "-"}</td>
                          <td>{inv.clientName}</td>
                          <td>{formatDate(inv.issueDate)}</td>
                          <td>{fmt(d.taxBase)}</td>
                          <td>{fmt(d.taxAmount)}</td>
                          <td>{fmt(d.retentionAmount)}</td>
                          <td>{fmt(d.totalAmount)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Actions */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        <Link className="pilot-btn" to="/facturas/emitidas">Ver facturas emitidas</Link>
        <Link className="pilot-btn" to="/transacciones">Revisar transacciones</Link>
        <Link className="pilot-btn pilot-btn--primary" to="/ajustes">Ajustes fiscales</Link>
      </div>
    </div>
  );
}
