import { useEffect, useState } from "react";
import { Mail, Send, Users, FileText } from "lucide-react";
import { AdminLayout } from "../components/AdminLayout";
import { AdminMetricCard } from "../components/shared/AdminMetricCard";
import { AdminChart } from "../components/shared/AdminChart";
import { AdminEmailService } from "../services/AdminEmailService";
import type { AdminEmailAnalytics as AdminEmailAnalyticsType } from "../types";

export function AdminEmailAnalytics(): import("react").JSX.Element {
  const [data, setData] = useState<AdminEmailAnalyticsType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void AdminEmailService.getEmailAnalytics().then((r) => { setData(r); setLoading(false); });
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
          <div className="h-72 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/25">
            <Mail className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Email Analytics</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Resumen de emails de documentos enviados</p>
          </div>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <AdminMetricCard label="Total enviados" value={data?.total_sent ?? 0} subtitle="Emails entregados con exito" icon={Send} />
          <AdminMetricCard label="Contactos" value={data?.contacts ?? 0} subtitle="Destinatarios unicos" icon={Users} />
          <AdminMetricCard label="Templates" value={data?.templates ?? 0} subtitle="Plantillas de email activas" icon={FileText} />
        </div>

        {/* Chart */}
        <AdminChart title="Actividad diaria" icon={Mail} data={data?.daily_activity ?? []} type="area" dataKey="count" xKey="day" />
      </div>
    </AdminLayout>
  );
}
