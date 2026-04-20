import { useEffect, useState } from "react";
import { Activity, Users, BarChart3, TrendingUp, Crown } from "lucide-react";
import { AdminLayout } from "../components/AdminLayout";
import { AdminMetricCard } from "../components/shared/AdminMetricCard";
import { AdminChart } from "../components/shared/AdminChart";
import { AdminExportButton } from "../components/shared/AdminExportButton";
import { AdminApiUsageService } from "../services/AdminApiUsageService";
import type { AdminApiUsage as AdminApiUsageType } from "../types";

export function AdminApiUsage(): import("react").JSX.Element {
  const [data, setData] = useState<AdminApiUsageType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void AdminApiUsageService.getApiUsage().then((r) => { setData(r); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          {/* Header skeleton */}
          <div className="h-20 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-700" />
          {/* Metric cards skeleton */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />)}
          </div>
          {/* Chart skeleton */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="h-72 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
            <div className="h-72 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
          </div>
        </div>
      </AdminLayout>
    );
  }

  const maxCount = Math.max(...(data?.top_users?.map((u) => u.count) ?? [1]));

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/25">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Uso de API</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Actividad de los ultimos 30 dias</p>
            </div>
          </div>
          {data?.top_users ? <AdminExportButton data={data.top_users as unknown as Record<string, unknown>[]} filename="api-usage-top-users" /> : null}
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <AdminMetricCard label="Total llamadas" value={data?.total_calls ?? 0} subtitle="Peticiones registradas" icon={Activity} />
          <AdminMetricCard label="Usuarios activos" value={data?.top_users?.length ?? 0} subtitle="Con actividad en API" icon={Users} />
          <AdminMetricCard
            label="Media diaria"
            value={data?.daily_usage?.length ? Math.round((data.total_calls ?? 0) / data.daily_usage.length) : 0}
            subtitle="Llamadas por dia"
            icon={TrendingUp}
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <AdminChart title="Uso diario" icon={Activity} data={data?.daily_usage ?? []} type="line" dataKey="count" xKey="day" />
          <AdminChart title="Por accion" icon={BarChart3} data={data?.by_action ?? []} type="bar" dataKey="count" xKey="action" />
        </div>

        {/* Top users table */}
        {data?.top_users?.length ? (
          <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-700/80 dark:bg-slate-800">
            <div className="flex items-center gap-3 border-b border-slate-200 px-6 py-4 dark:border-slate-700">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 dark:bg-orange-500/10">
                <Crown className="h-4 w-4 text-orange-500 dark:text-orange-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Top usuarios por consumo</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{data.top_users.length} usuarios con mayor actividad</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700/50">
                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">#</th>
                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Usuario</th>
                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Llamadas</th>
                    <th className="hidden px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 sm:table-cell">Uso relativo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {data.top_users.map((u, index) => (
                    <tr key={u.user_id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/30">
                      <td className="px-6 py-3.5">
                        <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                          index === 0
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
                            : index === 1
                              ? "bg-slate-200 text-slate-600 dark:bg-slate-600 dark:text-slate-300"
                              : index === 2
                                ? "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400"
                                : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                        }`}>
                          {index + 1}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-slate-200 to-slate-300 text-xs font-semibold text-slate-600 dark:from-slate-600 dark:to-slate-700 dark:text-slate-300">
                            {u.email?.charAt(0)?.toUpperCase() ?? "?"}
                          </div>
                          <span className="font-medium text-slate-900 dark:text-white">{u.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-200">{u.count.toLocaleString()}</span>
                      </td>
                      <td className="hidden px-6 py-3.5 sm:table-cell">
                        <div className="flex items-center gap-3">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-500 transition-all duration-500"
                              style={{ width: `${Math.round((u.count / maxCount) * 100)}%` }}
                            />
                          </div>
                          <span className="w-10 text-right text-xs tabular-nums text-slate-400 dark:text-slate-500">
                            {Math.round((u.count / maxCount) * 100)}%
                          </span>
                        </div>
                      </td>
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
