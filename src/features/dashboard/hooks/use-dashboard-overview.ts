import { useEffect, useMemo, useRef, useState } from "react";
import { dashboardAdapter, type DashboardSnapshot } from "../adapters/dashboard.adapter";
import type { DashboardPeriod } from "../domain/dashboard-metrics";

const CURRENT_YEAR = new Date().getFullYear();

export interface UseDashboardOverviewResult {
  period: DashboardPeriod;
  setPeriod: (value: DashboardPeriod) => void;
  year: number;
  setYear: (value: number) => void;
  availableYears: number[];
  snapshot: DashboardSnapshot | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useDashboardOverview(initialPeriod: DashboardPeriod = "month", initialYear: number = CURRENT_YEAR): UseDashboardOverviewResult {
  const [period, setPeriod] = useState<DashboardPeriod>(initialPeriod);
  const [year, setYear] = useState<number>(initialYear);
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  // Lista de años disponibles: año actual + 4 anteriores. Suficiente para
  // consultar histórico fiscal habitual (último ejercicio + algo más).
  const availableYears = useMemo(() => {
    const years: number[] = [];
    for (let y = CURRENT_YEAR; y >= CURRENT_YEAR - 4; y--) years.push(y);
    return years;
  }, []);

  const loadSnapshot = async (periodToLoad: DashboardPeriod, yearToLoad: number) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);
    // El adapter `loadSnapshot(period, referenceDate?)` usa la fecha que le
    // pasamos para resolver el rango. Si pedimos "Q2 de 2025", basta con un
    // referenceDate cualquiera dentro de ese año (1 de junio cubre todos los
    // trimestres y también "year").
    const referenceDate = yearToLoad === CURRENT_YEAR ? new Date() : new Date(yearToLoad, 5, 15);
    const result = await dashboardAdapter.loadSnapshot(periodToLoad, referenceDate);
    if (requestId !== requestIdRef.current) {
      return;
    }
    if (!result.success) {
      setSnapshot(null);
      setError(result.error.message);
      setLoading(false);
      return;
    }
    setSnapshot(result.data);
    setError(null);
    setLoading(false);
  };

  const refresh = async () => {
    await loadSnapshot(period, year);
  };

  useEffect(() => {
    void loadSnapshot(period, year);
  }, [period, year]);

  return {
    period,
    setPeriod,
    year,
    setYear,
    availableYears,
    snapshot,
    loading,
    error,
    refresh,
  };
}
