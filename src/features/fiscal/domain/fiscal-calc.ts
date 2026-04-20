import type { Invoice } from "../../../shared/types/domain";

export interface QuarterRange {
  start: string;
  end: string;
  label: string;
  short: string;
}

const QUARTER_META: Record<number, { start: string; end: string; label: string; short: string }> = {
  1: { start: "01-01", end: "03-31", label: "1er Trimestre (Ene-Mar)", short: "T1 (Ene-Mar)" },
  2: { start: "04-01", end: "06-30", label: "2º Trimestre (Abr-Jun)", short: "T2 (Abr-Jun)" },
  3: { start: "07-01", end: "09-30", label: "3er Trimestre (Jul-Sep)", short: "T3 (Jul-Sep)" },
  4: { start: "10-01", end: "12-31", label: "4º Trimestre (Oct-Dic)", short: "T4 (Oct-Dic)" },
};

export function getQuarterRange(year: number, quarter: number): QuarterRange | null {
  const q = QUARTER_META[quarter];
  if (!q) return null;
  return { start: `${year}-${q.start}`, end: `${year}-${q.end}`, label: q.label, short: q.short };
}

export function getYearRange(year: number): { start: string; end: string } {
  return { start: `${year}-01-01`, end: `${year}-12-31` };
}

export function getCurrentQuarter(): number {
  const m = new Date().getMonth();
  if (m < 3) return 1;
  if (m < 6) return 2;
  if (m < 9) return 3;
  return 4;
}

export function getDateRange(year: number, quarter: number): { start: string; end: string } {
  if (quarter === 0) return getYearRange(year);
  const qr = getQuarterRange(year, quarter);
  return qr ? { start: qr.start, end: qr.end } : getYearRange(year);
}

export interface FiscalInvoiceData {
  taxBase: number;
  taxAmount: number;
  retentionAmount: number;
  totalAmount: number;
  isPaid: boolean;
}

export function extractInvoiceFiscalData(invoice: Invoice): FiscalInvoiceData {
  const summary = invoice.invoiceData?.summary;
  return {
    taxBase: summary?.taxBase ?? invoice.subtotal ?? 0,
    taxAmount: summary?.taxAmount ?? invoice.taxAmount ?? 0,
    retentionAmount: summary?.retentionAmount ?? 0,
    totalAmount: summary?.total ?? invoice.totalAmount ?? 0,
    isPaid: invoice.isPaid,
  };
}

export function calcTotalFacturado(invoices: Invoice[]): number {
  return invoices.reduce((sum, inv) => sum + extractInvoiceFiscalData(inv).taxBase, 0);
}

export function calcIVARepercutido(invoices: Invoice[]): number {
  return invoices.reduce((sum, inv) => sum + extractInvoiceFiscalData(inv).taxAmount, 0);
}

export function calcIRPFRetenido(invoices: Invoice[]): number {
  return invoices.reduce((sum, inv) => sum + extractInvoiceFiscalData(inv).retentionAmount, 0);
}

export interface PaymentSummary {
  pagadasCount: number;
  pagadasImporte: number;
  pendientesCount: number;
  pendientesImporte: number;
  totalBruto: number;
}

export function calcResumenPagos(invoices: Invoice[]): PaymentSummary {
  let pagadasCount = 0;
  let pagadasImporte = 0;
  let pendientesCount = 0;
  let pendientesImporte = 0;
  let totalBruto = 0;

  for (const inv of invoices) {
    const data = extractInvoiceFiscalData(inv);
    totalBruto += data.totalAmount;
    if (data.isPaid) {
      pagadasCount++;
      pagadasImporte += data.totalAmount;
    } else {
      pendientesCount++;
      pendientesImporte += data.totalAmount;
    }
  }

  return { pagadasCount, pagadasImporte, pendientesCount, pendientesImporte, totalBruto };
}

export interface TransactionFiscalRow {
  importe: number;
  ivaPorcentaje: number | null;
}

export function calcIVASoportado(gastos: TransactionFiscalRow[]): number {
  let total = 0;
  for (const g of gastos) {
    const importe = g.importe || 0;
    const ivaPct = g.ivaPorcentaje || 0;
    if (ivaPct > 0 && importe > 0) {
      const base = importe / (1 + ivaPct / 100);
      total += importe - base;
    }
  }
  return total;
}

export function calcGastosBase(gastos: TransactionFiscalRow[]): number {
  let total = 0;
  for (const g of gastos) {
    const importe = g.importe || 0;
    const ivaPct = g.ivaPorcentaje || 0;
    if (ivaPct > 0 && importe > 0) {
      total += importe / (1 + ivaPct / 100);
    } else {
      total += importe;
    }
  }
  return total;
}

export interface Modelo303 {
  repercutido: number;
  soportado: number;
  resultado: number;
  label: string;
}

export function calcModelo303(ivaRepercutido: number, ivaSoportado: number): Modelo303 {
  const resultado = ivaRepercutido - ivaSoportado;
  return {
    repercutido: ivaRepercutido,
    soportado: ivaSoportado,
    resultado,
    label: resultado >= 0 ? "A ingresar:" : "A compensar:",
  };
}

export interface Modelo130 {
  ingresos: number;
  gastos: number;
  retenciones: number;
  beneficioNeto: number;
}

export function calcModelo130(ingresosBase: number, gastosBase: number, retenciones: number): Modelo130 {
  return {
    ingresos: ingresosBase,
    gastos: gastosBase,
    retenciones,
    beneficioNeto: ingresosBase - gastosBase,
  };
}
