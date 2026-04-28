import type { Invoice } from "../../../shared/types/domain";
import { calculateExpenseBreakdown } from "../../transactions/domain/transaction-amounts";

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

/** Rango YTD (year-to-date): desde 1 de enero hasta el final del trimestre Q. */
export function getYtdRange(year: number, quarter: number): { start: string; end: string } {
  if (quarter === 0) return getYearRange(year);
  const qr = getQuarterRange(year, quarter);
  if (!qr) return getYearRange(year);
  return { start: `${year}-01-01`, end: qr.end };
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
  irpfPorcentaje: number | null;
  /** Si es false, el gasto se EXCLUYE de los cálculos de Modelo 130 y 303. Default true. */
  deducible?: boolean;
}

/** Solo gastos deducibles entran en cálculos fiscales. */
function deducibles(gastos: TransactionFiscalRow[]): TransactionFiscalRow[] {
  return gastos.filter((g) => g.deducible !== false);
}

export function calcIVASoportado(gastos: TransactionFiscalRow[]): number {
  let total = 0;
  for (const g of deducibles(gastos)) {
    const { cuotaIva } = calculateExpenseBreakdown(g.importe || 0, g.ivaPorcentaje, g.irpfPorcentaje);
    total += cuotaIva;
  }
  return total;
}

export function calcGastosBase(gastos: TransactionFiscalRow[]): number {
  let total = 0;
  for (const g of deducibles(gastos)) {
    const { base } = calculateExpenseBreakdown(g.importe || 0, g.ivaPorcentaje, g.irpfPorcentaje);
    total += base;
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

// ─── Modelo 130 (Pago a cuenta IRPF para autónomos) ─────────────────────────
//
// El Modelo 130 trimestral es ACUMULATIVO desde inicio de año:
// 1. Sumar ingresos (base) - gastos deducibles (base) acumulados desde 1 enero hasta fin del trimestre.
// 2. Si el autónomo está en estimación directa simplificada y tiene activado el flag:
//    Aplicar deducción del 7% sobre el rendimiento neto. Tope 2.000€/año (Ley 28/2022).
// 3. Calcular pago a cuenta acumulado: 20% del rendimiento neto reducido.
// 4. Restar retenciones acumuladas (lo que clientes ya retuvieron al usuario).
// 5. Restar pagos a cuenta de trimestres anteriores ya declarados.
// 6. Resultado del trimestre = pago acumulado − pagos anteriores. Si es negativo, no hay pago.

export const MODELO_130_PAGO_PORCENTAJE = 0.2;
export const DIFICIL_JUSTIFICACION_PORCENTAJE = 0.07;
export const DIFICIL_JUSTIFICACION_TOPE_ANUAL = 2000;

export interface Modelo130PeriodAggregates {
  /** Ingresos base imponible acumulados (desde 1 enero hasta fin del trimestre). */
  ingresosBase: number;
  /** Gastos deducibles base imponible acumulados. */
  gastosBase: number;
  /** Retenciones IRPF acumuladas en facturas emitidas. */
  retenciones: number;
}

export interface Modelo130Detail {
  /** Inputs */
  ingresosAcumulados: number;
  gastosAcumulados: number;
  retencionesAcumuladas: number;
  pagosAcumuladosAnteriores: number;

  /** Cálculo paso a paso */
  rendimientoNetoPrevio: number; // ingresos - gastos
  difJustificacionImporte: number; // 7% con tope, 0 si no aplica
  difJustificacionAplicada: boolean;
  difJustificacionTope: number; // tope efectivo (2000 - lo ya aplicado, no contemplado: en este simplificador asumimos tope completo)
  rendimientoNeto: number; // rendimiento - difJustificacion
  pagoAcumulado: number; // 20% rendimiento neto
  pagoAcumuladoMenosRetenciones: number; // pago - retenciones
  /** Resultado del trimestre actual: pago_acumulado_menos_retenciones - pagos_anteriores. */
  resultado: number;
  /** "A ingresar" si > 0, "A compensar / sin pago" si <= 0. */
  label: string;

  // Compatibilidad hacia atrás con la UI antigua
  ingresos: number; // = ingresosAcumulados
  gastos: number; // = gastosAcumulados
  retenciones: number; // = retencionesAcumuladas
  beneficioNeto: number; // = rendimientoNeto (rendimiento tras DJ)
}

export interface Modelo130Options {
  /** Si aplicar el 7% de difícil justificación. Solo válido en EDS. */
  applyDifficultJustification: boolean;
  /** Pagos a cuenta de Modelos 130 ya declarados en trimestres anteriores del mismo año. */
  pagosAnteriores: number;
}

/**
 * Calcula el Modelo 130 trimestral acumulado.
 * Los `ingresos`, `gastos` y `retenciones` deben ser los YTD (desde 1 enero hasta el fin del trimestre seleccionado).
 */
export function calcModelo130Detail(
  ingresosAcumulados: number,
  gastosAcumulados: number,
  retencionesAcumuladas: number,
  options: Modelo130Options,
): Modelo130Detail {
  const rendimientoNetoPrevio = ingresosAcumulados - gastosAcumulados;

  let difJustificacionImporte = 0;
  let difJustificacionAplicada = false;
  if (options.applyDifficultJustification && rendimientoNetoPrevio > 0) {
    const importeBruto = rendimientoNetoPrevio * DIFICIL_JUSTIFICACION_PORCENTAJE;
    difJustificacionImporte = Math.min(importeBruto, DIFICIL_JUSTIFICACION_TOPE_ANUAL);
    difJustificacionAplicada = difJustificacionImporte > 0;
  }

  const rendimientoNeto = Math.max(0, rendimientoNetoPrevio - difJustificacionImporte);
  const pagoAcumulado = rendimientoNeto * MODELO_130_PAGO_PORCENTAJE;
  const pagoAcumuladoMenosRetenciones = Math.max(0, pagoAcumulado - retencionesAcumuladas);
  const resultado = Math.max(0, pagoAcumuladoMenosRetenciones - options.pagosAnteriores);

  return {
    ingresosAcumulados,
    gastosAcumulados,
    retencionesAcumuladas,
    pagosAcumuladosAnteriores: options.pagosAnteriores,
    rendimientoNetoPrevio,
    difJustificacionImporte,
    difJustificacionAplicada,
    difJustificacionTope: DIFICIL_JUSTIFICACION_TOPE_ANUAL,
    rendimientoNeto,
    pagoAcumulado,
    pagoAcumuladoMenosRetenciones,
    resultado,
    label: resultado > 0 ? "A ingresar:" : "Sin pago a cuenta:",
    ingresos: ingresosAcumulados,
    gastos: gastosAcumulados,
    retenciones: retencionesAcumuladas,
    beneficioNeto: rendimientoNeto,
  };
}

/**
 * Calcula los pagos a cuenta de TODOS los trimestres anteriores al actual.
 * Necesita los agregados YTD por trimestre (T1, T2, T3 si actualQ === 4).
 */
export function calcPagosAnterioresAcumulados(
  agregadosPorTrimestre: Modelo130PeriodAggregates[],
  applyDifficultJustification: boolean,
): number {
  // Cada elemento es el YTD hasta el final del trimestre N. Para el trimestre actual, NO debemos meterlo aquí.
  // Recorremos los anteriores y para cada uno calculamos el pago neto que tocaría declarar.
  let pagosAcumulados = 0;
  for (let i = 0; i < agregadosPorTrimestre.length; i++) {
    const agg = agregadosPorTrimestre[i];
    const detail = calcModelo130Detail(agg.ingresosBase, agg.gastosBase, agg.retenciones, {
      applyDifficultJustification,
      pagosAnteriores: pagosAcumulados,
    });
    // El pago "del trimestre N" es lo que tocó pagar ese trimestre concreto.
    // Como detail.resultado ya es "lo que toca pagar ESTE trimestre" (acumulado − pagos previos),
    // sumamos resultado para acumular.
    pagosAcumulados += detail.resultado;
  }
  return pagosAcumulados;
}

// Mantenemos la firma antigua para compatibilidad con código existente que la use directamente.
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
