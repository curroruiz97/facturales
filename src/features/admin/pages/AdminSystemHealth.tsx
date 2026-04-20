import { useEffect, useState } from "react";
import { HeartPulse, Database, Users, FileText, Receipt, AlertTriangle, Clock, CheckCircle2, XCircle } from "lucide-react";
import { AdminLayout } from "../components/AdminLayout";
import { AdminStatusBadge } from "../components/shared/AdminStatusBadge";
import { AdminSystemService } from "../services/AdminSystemService";
import type { AdminSystemHealth as AdminSystemHealthType } from "../types";

export function AdminSystemHealth(): import("react").JSX.Element {
  const [data, setData] = useState<AdminSystemHealthType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void AdminSystemService.getSystemHealth().then((r) => { setData(r); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div className="h-20 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-700" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-36 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />)}
          </div>
        </div>
      </AdminLayout>
    );
  }

  const isHealthy = data?.status === "healthy";

  const cards: Array<{ label: string; icon: typeof Database; values: Array<{ k: string; v: string | number }>; status: "healthy" | "active" | "warning" }> = [
    { label: "Base de datos", icon: Database, values: [{ k: "Tamano", v: data?.database.size ?? "---" }, { k: "Conexiones", v: data?.database.connections ?? 0 }], status: "healthy" },
    { label: "Usuarios", icon: Users, values: [{ k: "Total", v: data?.users.total ?? 0 }, { k: "Activos 24h", v: data?.users.active_24h ?? 0 }], status: "active" },
    { label: "Facturas", icon: FileText, values: [{ k: "Total", v: data?.invoices.total ?? 0 }], status: "active" },
    { label: "Transacciones", icon: Receipt, values: [{ k: "Total", v: data?.transactions.total ?? 0 }], status: "active" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page header with overall status */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/25">
              <HeartPulse className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">System Health</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Estado del sistema en tiempo real</p>
            </div>
          </div>
          <div className={`inline-flex items-center gap-2.5 rounded-full px-4 py-2 text-sm font-semibold shadow-sm ${
            isHealthy
              ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20"
              : "bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20"
          }`}>
            {isHealthy ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            {isHealthy ? "Todos los sistemas operativos" : "Se detectaron problemas"}
          </div>
        </div>

        {/* Health monitoring cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => {
            const statusColor = card.status === "healthy"
              ? "bg-emerald-500"
              : card.status === "warning"
                ? "bg-amber-500"
                : "bg-emerald-500";

            return (
              <div key={card.label} className="group relative overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700/80 dark:bg-slate-800">
                <div className="p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 transition-colors group-hover:bg-orange-50 dark:bg-slate-700 dark:group-hover:bg-orange-500/10">
                        <card.icon className="h-5 w-5 text-slate-500 transition-colors group-hover:text-orange-500 dark:text-slate-400 dark:group-hover:text-orange-400" />
                      </div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{card.label}</h3>
                    </div>
                    <div className="relative flex h-3 w-3">
                      <span className={`absolute inset-0 animate-ping rounded-full opacity-30 ${statusColor}`} />
                      <span className={`relative inline-flex h-3 w-3 rounded-full ${statusColor}`} />
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    {card.values.map((v) => (
                      <div key={v.k} className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{v.k}</span>
                        <span className="text-sm font-bold tabular-nums text-slate-900 dark:text-white">{v.v}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Bottom status bar */}
                <div className="flex items-center gap-1.5 border-t border-slate-100 bg-slate-50/50 px-5 py-2 dark:border-slate-700/50 dark:bg-slate-800/50">
                  <AdminStatusBadge variant={card.status} dot>{card.status === "healthy" ? "Operativo" : card.status === "active" ? "Activo" : "Alerta"}</AdminStatusBadge>
                </div>
              </div>
            );
          })}
        </div>

        {/* Recent errors */}
        {data?.recent_errors && (data.recent_errors as unknown[]).length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-red-200 bg-white shadow-sm dark:border-red-800/50 dark:bg-slate-800">
            <div className="flex items-center gap-3 border-b border-red-100 bg-red-50/80 px-6 py-4 dark:border-red-800/30 dark:bg-red-900/20">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 dark:bg-red-500/20">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-red-800 dark:text-red-300">Errores recientes</h3>
                <p className="text-xs text-red-600/70 dark:text-red-400/60">{(data.recent_errors as unknown[]).length} errores detectados</p>
              </div>
            </div>
            <div className="divide-y divide-red-100 dark:divide-red-800/30">
              {(data.recent_errors as Array<Record<string, unknown>>).map((error, index) => (
                <div key={index} className="flex items-start gap-3 px-6 py-3.5">
                  <Clock className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400 dark:text-red-500" />
                  <pre className="min-w-0 flex-1 whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-red-700 dark:text-red-300">
                    {JSON.stringify(error, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 px-6 py-4 dark:border-emerald-800/30 dark:bg-emerald-900/10">
            <CheckCircle2 className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Sin errores recientes. El sistema funciona correctamente.</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
