import { useEffect, useMemo, useState } from "react";
import type { Invoice } from "../../../shared/types/domain";
import { businessInfoService } from "../../../services/business/business-info.service";
import { invoicesRepository, transactionsRepository } from "../../../services/repositories";
import {
  calcGastosBase,
  calcIRPFRetenido,
  calcIVARepercutido,
  calcIVASoportado,
  calcModelo130Detail,
  calcModelo303,
  calcPagosAnterioresAcumulados,
  calcResumenPagos,
  calcTotalFacturado,
  getDateRange,
  getQuarterRange,
  type Modelo130Detail,
  type Modelo303,
  type PaymentSummary,
  type TransactionFiscalRow,
} from "../domain/fiscal-calc";

export interface FiscalData {
  loading: boolean;
  error: string | null;
  /** Facturas del periodo seleccionado (NO acumulado YTD). */
  invoices: Invoice[];
  /** KPIs del periodo seleccionado (no YTD). */
  totalFacturado: number;
  ivaRepercutido: number;
  irpfRetenido: number;
  facturasEmitidas: number;
  pagos: PaymentSummary;
  /** Modelo 303 calculado sobre el periodo seleccionado. */
  modelo303: Modelo303;
  /** Modelo 130 con desglose ACUMULADO (YTD hasta fin del trimestre). */
  modelo130: Modelo130Detail;
  /** Datos auxiliares ya derivados del periodo seleccionado. */
  ivaSoportado: number;
  gastosBase: number;
  /** Régimen IRPF del usuario (lectura). */
  irpfRegime: string;
  applyDifficultJustification: boolean;
}

async function loadExpenses(start: string, end: string): Promise<TransactionFiscalRow[]> {
  const result = await transactionsRepository.listFiscalExpenses(start, end);
  return result.success ? result.data : [];
}

interface QuarterAggregate {
  ingresosBase: number;
  gastosBase: number;
  retenciones: number;
}

/** Carga los agregados YTD (ingresos, gastos, retenciones) hasta el final de cada trimestre desde T1 hasta `untilQuarter` inclusive. */
async function loadQuarterAggregates(year: number, untilQuarter: number): Promise<QuarterAggregate[]> {
  const aggregates: QuarterAggregate[] = [];
  for (let q = 1; q <= untilQuarter; q++) {
    const range = getQuarterRange(year, q);
    if (!range) continue;
    const ytdRange = { start: `${year}-01-01`, end: range.end };
    const [invResult, expenses] = await Promise.all([
      invoicesRepository.list({ status: "issued", fromDate: ytdRange.start, toDate: ytdRange.end }),
      loadExpenses(ytdRange.start, ytdRange.end),
    ]);
    const invoices = invResult.success ? invResult.data : [];
    aggregates.push({
      ingresosBase: calcTotalFacturado(invoices),
      gastosBase: calcGastosBase(expenses),
      retenciones: calcIRPFRetenido(invoices),
    });
  }
  return aggregates;
}

export function useFiscalData(year: number, quarter: number): FiscalData {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<TransactionFiscalRow[]>([]);
  /** Agregados YTD hasta el final de cada trimestre, desde T1 hasta el seleccionado. */
  const [quarterAggregates, setQuarterAggregates] = useState<QuarterAggregate[]>([]);
  const [irpfRegime, setIrpfRegime] = useState<string>("estimacion_directa_simplificada");
  const [applyDJ, setApplyDJ] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      const range = getDateRange(year, quarter);

      const [invResult, expResult, businessResult] = await Promise.all([
        invoicesRepository.list({ status: "issued", fromDate: range.start, toDate: range.end }),
        loadExpenses(range.start, range.end),
        businessInfoService.getMine(),
      ]);

      if (cancelled) return;

      if (!invResult.success) {
        setError(invResult.error.message);
        setInvoices([]);
        setExpenses([]);
        setQuarterAggregates([]);
        setLoading(false);
        return;
      }

      // Para Modelo 130 acumulado: cuando se selecciona un trimestre concreto (1-4),
      // cargamos los agregados YTD de cada trimestre hasta el actual para poder
      // calcular los pagos de trimestres anteriores.
      let aggregates: QuarterAggregate[] = [];
      if (quarter >= 1 && quarter <= 4) {
        aggregates = await loadQuarterAggregates(year, quarter);
      } else {
        // Año natural: el "agregado" es el del año entero (un solo "trimestre").
        aggregates = [
          {
            ingresosBase: calcTotalFacturado(invResult.data),
            gastosBase: calcGastosBase(expResult),
            retenciones: calcIRPFRetenido(invResult.data),
          },
        ];
      }

      if (cancelled) return;

      setInvoices(invResult.data);
      setExpenses(expResult);
      setQuarterAggregates(aggregates);

      if (businessResult.success && businessResult.data) {
        setIrpfRegime(businessResult.data.irpfRegime ?? "estimacion_directa_simplificada");
        setApplyDJ(businessResult.data.applyDifficultJustification ?? true);
      }

      setLoading(false);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [year, quarter]);

  // KPIs del periodo seleccionado (no YTD).
  const totalFacturado = useMemo(() => calcTotalFacturado(invoices), [invoices]);
  const ivaRepercutido = useMemo(() => calcIVARepercutido(invoices), [invoices]);
  const irpfRetenido = useMemo(() => calcIRPFRetenido(invoices), [invoices]);
  const pagos = useMemo(() => calcResumenPagos(invoices), [invoices]);
  const ivaSoportado = useMemo(() => calcIVASoportado(expenses), [expenses]);
  const gastosBase = useMemo(() => calcGastosBase(expenses), [expenses]);
  const modelo303 = useMemo(() => calcModelo303(ivaRepercutido, ivaSoportado), [ivaRepercutido, ivaSoportado]);

  // Modelo 130 acumulado YTD usando los agregados del trimestre actual y los anteriores.
  const applyDJEffective = applyDJ && irpfRegime === "estimacion_directa_simplificada";

  const modelo130 = useMemo<Modelo130Detail>(() => {
    if (quarterAggregates.length === 0) {
      return calcModelo130Detail(0, 0, 0, {
        applyDifficultJustification: applyDJEffective,
        pagosAnteriores: 0,
      });
    }
    // El agregado del trimestre actual es el último de la lista (acumulado YTD).
    const current = quarterAggregates[quarterAggregates.length - 1];
    const previous = quarterAggregates.slice(0, -1);
    const pagosAnteriores = calcPagosAnterioresAcumulados(previous, applyDJEffective);
    return calcModelo130Detail(current.ingresosBase, current.gastosBase, current.retenciones, {
      applyDifficultJustification: applyDJEffective,
      pagosAnteriores,
    });
  }, [quarterAggregates, applyDJEffective]);

  return {
    loading,
    error,
    invoices,
    totalFacturado,
    ivaRepercutido,
    irpfRetenido,
    facturasEmitidas: invoices.length,
    pagos,
    modelo303,
    modelo130,
    ivaSoportado,
    gastosBase,
    irpfRegime,
    applyDifficultJustification: applyDJ,
  };
}
