import { useEffect, useState, useCallback } from "react";
import { ScrollText, ChevronLeft, ChevronRight } from "lucide-react";
import { AdminLayout } from "../components/AdminLayout";
import { AdminExportButton } from "../components/shared/AdminExportButton";
import { AdminLogsService } from "../services/AdminLogsService";
import type { AdminSystemLogsResponse, AdminAuditLogsResponse } from "../types";

type TabType = "system" | "audit";

const ACTION_COLOR: Record<string, string> = {
  login: "bg-emerald-50 text-emerald-700 ring-emerald-200/60 dark:bg-emerald-900/20 dark:text-emerald-400 dark:ring-emerald-700/40",
  logout: "bg-slate-100 text-slate-600 ring-slate-200/60 dark:bg-slate-700 dark:text-slate-400 dark:ring-slate-600",
  delete: "bg-red-50 text-red-700 ring-red-200/60 dark:bg-red-900/20 dark:text-red-400 dark:ring-red-700/40",
  suspend: "bg-amber-50 text-amber-700 ring-amber-200/60 dark:bg-amber-900/20 dark:text-amber-400 dark:ring-amber-700/40",
  update: "bg-blue-50 text-blue-700 ring-blue-200/60 dark:bg-blue-900/20 dark:text-blue-400 dark:ring-blue-700/40",
  create: "bg-violet-50 text-violet-700 ring-violet-200/60 dark:bg-violet-900/20 dark:text-violet-400 dark:ring-violet-700/40",
};

function getActionStyle(action: string): string {
  const key = Object.keys(ACTION_COLOR).find((k) => action.toLowerCase().includes(k));
  return key ? ACTION_COLOR[key] : "bg-orange-50 text-orange-700 ring-orange-200/60 dark:bg-orange-900/20 dark:text-orange-400 dark:ring-orange-700/40";
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getPageRange(current: number, total: number): number[] {
  const delta = 2;
  const range: number[] = [];
  const start = Math.max(2, current - delta);
  const end = Math.min(total - 1, current + delta);
  range.push(1);
  if (start > 2) range.push(-1);
  for (let i = start; i <= end; i++) range.push(i);
  if (end < total - 1) range.push(-2);
  if (total > 1) range.push(total);
  return range;
}

export function AdminLogs(): import("react").JSX.Element {
  const [tab, setTab] = useState<TabType>("audit");
  const [systemLogs, setSystemLogs] = useState<AdminSystemLogsResponse | null>(null);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLogsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    if (tab === "system") {
      const r = await AdminLogsService.getSystemLogs(page);
      setSystemLogs(r);
    } else {
      const r = await AdminLogsService.getAuditLogs(page);
      setAuditLogs(r);
    }
    setLoading(false);
  }, [tab, page]);

  useEffect(() => { void load(); }, [load]);

  const switchTab = (t: TabType) => { setTab(t); setPage(1); };

  const totalPages = tab === "system" ? (systemLogs?.total_pages ?? 1) : (auditLogs?.total_pages ?? 1);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/20">
              <ScrollText className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Logs</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Registros del sistema y auditoria</p>
            </div>
          </div>
          {tab === "audit" && auditLogs?.logs ? (
            <AdminExportButton data={auditLogs.logs as unknown as Record<string, unknown>[]} filename="audit-logs" />
          ) : null}
        </div>

        {/* Tabs */}
        <div className="relative border-b border-slate-200 dark:border-slate-700">
          <div className="flex gap-6">
            <button
              type="button"
              onClick={() => switchTab("audit")}
              className={`relative pb-3 text-sm font-medium transition-colors ${
                tab === "audit"
                  ? "text-orange-600 dark:text-orange-400"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              Audit Logs
              {tab === "audit" && (
                <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-orange-500" />
              )}
            </button>
            <button
              type="button"
              onClick={() => switchTab("system")}
              className={`relative pb-3 text-sm font-medium transition-colors ${
                tab === "system"
                  ? "text-orange-600 dark:text-orange-400"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              System Logs
              {tab === "system" && (
                <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-orange-500" />
              )}
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-700/80 dark:bg-slate-800">
          <div className="overflow-x-auto">
            {tab === "audit" ? (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-800/80">
                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Admin</th>
                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Accion</th>
                    <th className="hidden px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 md:table-cell">Target</th>
                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b border-slate-100 last:border-0 dark:border-slate-700/50">
                        <td colSpan={4} className="px-5 py-4"><div className="h-5 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-700" /></td>
                      </tr>
                    ))
                  ) : (
                    (auditLogs?.logs ?? []).map((log, idx) => (
                      <tr key={log.id} className={`border-b border-slate-100 transition-colors last:border-0 hover:bg-orange-50/40 dark:border-slate-700/50 dark:hover:bg-slate-700/30 ${idx % 2 === 1 ? "bg-slate-50/40 dark:bg-slate-800/40" : ""}`}>
                        <td className="px-5 py-3.5 font-medium text-slate-900 dark:text-white">{log.admin_email ?? <span className="text-slate-300 dark:text-slate-600">&mdash;</span>}</td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${getActionStyle(log.action)}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="hidden px-5 py-3.5 text-slate-500 dark:text-slate-400 md:table-cell">
                          {log.target_type ? (
                            <span className="font-mono text-xs">{log.target_type}:{log.target_id}</span>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600">&mdash;</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-slate-500 dark:text-slate-400">{fmtDate(log.created_at)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-800/80">
                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Email</th>
                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Accion</th>
                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b border-slate-100 last:border-0 dark:border-slate-700/50">
                        <td colSpan={3} className="px-5 py-4"><div className="h-5 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-700" /></td>
                      </tr>
                    ))
                  ) : (
                    (systemLogs?.logs ?? []).map((log, idx) => (
                      <tr key={log.id} className={`border-b border-slate-100 transition-colors last:border-0 hover:bg-orange-50/40 dark:border-slate-700/50 dark:hover:bg-slate-700/30 ${idx % 2 === 1 ? "bg-slate-50/40 dark:bg-slate-800/40" : ""}`}>
                        <td className="px-5 py-3.5 font-medium text-slate-900 dark:text-white">{log.email ?? <span className="text-slate-300 dark:text-slate-600">&mdash;</span>}</td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${getActionStyle(log.action)}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-slate-500 dark:text-slate-400">{fmtDate(log.created_at)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 ? (
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Mostrando pagina <span className="font-medium text-slate-700 dark:text-slate-200">{page}</span> de <span className="font-medium text-slate-700 dark:text-slate-200">{totalPages}</span>
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <ChevronLeft className="h-4 w-4" /> Anterior
              </button>
              {getPageRange(page, totalPages).map((p, idx) =>
                p < 0 ? (
                  <span key={`ellipsis-${idx}`} className="px-1 text-slate-400">...</span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    className={`flex h-9 min-w-[2.25rem] items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                      p === page
                        ? "bg-orange-500 text-white shadow-sm shadow-orange-500/25"
                        : "border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Siguiente <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </AdminLayout>
  );
}
