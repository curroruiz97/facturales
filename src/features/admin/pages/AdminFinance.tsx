import { useEffect, useState } from "react";
import { DollarSign, TrendingUp, Users, Percent, CreditCard, Coins } from "lucide-react";
import { AdminLayout } from "../components/AdminLayout";
import { AdminMetricCard } from "../components/shared/AdminMetricCard";
import { AdminChart } from "../components/shared/AdminChart";
import { AdminFinanceService } from "../services/AdminFinanceService";
import type { AdminRevenueAnalytics } from "../types";

const PLAN_BADGE: Record<string, string> = {
  starter: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
  pro: "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  business: "bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
};

function fmtEur(value: number): string {
  return value.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " EUR";
}

export function AdminFinance(): import("react").JSX.Element {
  const [data, setData] = useState<AdminRevenueAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void AdminFinanceService.getRevenueAnalytics().then((r) => { setData(r); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />)}
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/20">
            <Coins className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Finanzas</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Metricas de revenue y conversiones</p>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {/* MRR card with gradient accent */}
          <div className="group relative overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700/80 dark:bg-slate-800">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600" />
            <div className="p-5 pt-6">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">MRR</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 dark:bg-orange-900/20">
                  <DollarSign className="h-4 w-4 text-orange-500" />
                </div>
              </div>
              <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{fmtEur(data?.mrr ?? 0)}</p>
            </div>
          </div>
          <AdminMetricCard label="ARR" value={fmtEur(data?.arr ?? 0)} icon={TrendingUp} />
          <AdminMetricCard label="ARPU" value={fmtEur(data?.arpu ?? 0)} icon={DollarSign} />
          <AdminMetricCard label="Conversion" value={`${data?.conversion_rate ?? 0}%`} icon={Percent} />
          <AdminMetricCard label="Usuarios de pago" value={data?.total_paying ?? 0} icon={CreditCard} />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <AdminChart title="Signups mensuales" icon={Users} data={data?.monthly_signups ?? []} type="area" dataKey="count" xKey="month" />
          <AdminChart title="Revenue por plan" icon={DollarSign} data={data?.by_plan ?? []} type="bar" dataKey="revenue" xKey="plan" />
        </div>

        {/* Plan breakdown table */}
        {data?.by_plan?.length ? (
          <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-700/80 dark:bg-slate-800">
            <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-700/60">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Desglose por plan</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 dark:border-slate-700/60 dark:bg-slate-800/80">
                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Plan</th>
                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Usuarios</th>
                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {data.by_plan.map((p) => (
                    <tr key={p.plan} className="border-b border-slate-100 transition-colors last:border-0 hover:bg-orange-50/40 dark:border-slate-700/50 dark:hover:bg-slate-700/30">
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${PLAN_BADGE[p.plan] ?? PLAN_BADGE.starter}`}>
                          {p.plan}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-medium tabular-nums text-slate-700 dark:text-slate-300">{p.count}</td>
                      <td className="px-5 py-3.5 font-semibold tabular-nums text-slate-900 dark:text-white">{fmtEur(p.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>
    </AdminLayout>
  );
}
