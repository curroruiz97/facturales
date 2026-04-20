import { useEffect, useRef, useState } from "react";
import { dashboardAdapter, type DashboardSnapshot } from "../adapters/dashboard.adapter";
import type { DashboardPeriod } from "../domain/dashboard-metrics";

export interface UseDashboardOverviewResult {
  period: DashboardPeriod;
  setPeriod: (value: DashboardPeriod) => void;
  snapshot: DashboardSnapshot | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useDashboardOverview(initialPeriod: DashboardPeriod = "month"): UseDashboardOverviewResult {
  const [period, setPeriod] = useState<DashboardPeriod>(initialPeriod);
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const loadSnapshot = async (periodToLoad: DashboardPeriod) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);
    const result = await dashboardAdapter.loadSnapshot(periodToLoad);
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
    await loadSnapshot(period);
  };

  useEffect(() => {
    void loadSnapshot(period);
  }, [period]);

  return {
    period,
    setPeriod,
    snapshot,
    loading,
    error,
    refresh,
  };
}
