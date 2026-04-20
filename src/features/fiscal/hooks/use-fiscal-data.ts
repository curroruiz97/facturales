import { useEffect, useMemo, useState } from "react";
import type { Invoice } from "../../../shared/types/domain";
import { invoicesRepository, transactionsRepository } from "../../../services/repositories";
import {
  calcTotalFacturado,
  calcIVARepercutido,
  calcIRPFRetenido,
  calcResumenPagos,
  calcIVASoportado,
  calcGastosBase,
  calcModelo303,
  calcModelo130,
  getDateRange,
  type Modelo303,
  type Modelo130,
  type PaymentSummary,
  type TransactionFiscalRow,
} from "../domain/fiscal-calc";

export interface FiscalData {
  loading: boolean;
  error: string | null;
  invoices: Invoice[];
  totalFacturado: number;
  ivaRepercutido: number;
  irpfRetenido: number;
  facturasEmitidas: number;
  pagos: PaymentSummary;
  modelo303: Modelo303;
  modelo130: Modelo130;
  ivaSoportado: number;
  gastosBase: number;
}

async function loadExpenses(start: string, end: string): Promise<TransactionFiscalRow[]> {
  const result = await transactionsRepository.listFiscalExpenses(start, end);
  return result.success ? result.data : [];
}

export function useFiscalData(year: number, quarter: number): FiscalData {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<TransactionFiscalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      const range = getDateRange(year, quarter);

      const [invResult, expResult] = await Promise.all([
        invoicesRepository.list({ status: "issued", fromDate: range.start, toDate: range.end }),
        loadExpenses(range.start, range.end),
      ]);

      if (cancelled) return;

      if (!invResult.success) {
        setError(invResult.error.message);
        setInvoices([]);
        setExpenses([]);
        setLoading(false);
        return;
      }

      setInvoices(invResult.data);
      setExpenses(expResult);
      setLoading(false);
    };
    void load();
    return () => { cancelled = true; };
  }, [year, quarter]);

  const totalFacturado = useMemo(() => calcTotalFacturado(invoices), [invoices]);
  const ivaRepercutido = useMemo(() => calcIVARepercutido(invoices), [invoices]);
  const irpfRetenido = useMemo(() => calcIRPFRetenido(invoices), [invoices]);
  const pagos = useMemo(() => calcResumenPagos(invoices), [invoices]);
  const ivaSoportado = useMemo(() => calcIVASoportado(expenses), [expenses]);
  const gastosBase = useMemo(() => calcGastosBase(expenses), [expenses]);
  const modelo303 = useMemo(() => calcModelo303(ivaRepercutido, ivaSoportado), [ivaRepercutido, ivaSoportado]);
  const modelo130 = useMemo(() => calcModelo130(totalFacturado, gastosBase, irpfRetenido), [totalFacturado, gastosBase, irpfRetenido]);

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
  };
}
