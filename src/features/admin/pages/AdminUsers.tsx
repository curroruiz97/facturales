import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Users, Search, ChevronLeft, ChevronRight, Trash2, Eye, AlertTriangle } from "lucide-react";
import { AdminLayout } from "../components/AdminLayout";
import { AdminExportButton } from "../components/shared/AdminExportButton";
import { AdminUserService } from "../services/AdminUserService";
import type { AdminUsersResponse } from "../types";

type PlanValue = "starter" | "pro" | "business";
const PLAN_OPTIONS: ReadonlyArray<{ value: PlanValue; label: string }> = [
  { value: "starter", label: "Starter" },
  { value: "pro", label: "Pro" },
  { value: "business", label: "Business" },
];

const PLAN_BADGE: Record<string, string> = {
  starter: "bg-slate-100 text-slate-700 ring-slate-200/60 dark:bg-slate-700 dark:text-slate-300 dark:ring-slate-600",
  pro: "bg-orange-50 text-orange-700 ring-orange-200/60 dark:bg-orange-900/30 dark:text-orange-400 dark:ring-orange-700/40",
  business: "bg-violet-50 text-violet-700 ring-violet-200/60 dark:bg-violet-900/30 dark:text-violet-400 dark:ring-violet-700/40",
};

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

export function AdminUsers(): import("react").JSX.Element {
  const [data, setData] = useState<AdminUsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; email: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await AdminUserService.getUsers(page, 20, search, planFilter);
    setData(result);
    setLoading(false);
  }, [page, search, planFilter]);

  useEffect(() => { void load(); }, [load]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handlePlanChange = async (userId: string, plan: string): Promise<void> => {
    setUpdatingUser(userId);
    const ok = await AdminUserService.updateSubscription(userId, plan);
    setUpdatingUser(null);
    if (ok) void load();
  };

  const handleConfirmDelete = async (): Promise<void> => {
    if (!confirmDelete) return;
    setDeleting(true);
    const ok = await AdminUserService.deleteUser(confirmDelete.id);
    setDeleting(false);
    if (ok) {
      setConfirmDelete(null);
      void load();
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/20">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Usuarios</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {data ? (
                  <>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{data.total}</span> usuarios registrados
                  </>
                ) : "Cargando..."}
              </p>
            </div>
          </div>
          {data ? <AdminExportButton data={data.users as unknown as Record<string, unknown>[]} filename="admin-users" /> : null}
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors peer-focus:text-orange-500" />
            <input
              type="text"
              placeholder="Buscar por email o nombre..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="peer w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm transition-all placeholder:text-slate-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-orange-500 dark:focus:ring-orange-500/30"
            />
          </div>
          <select
            value={planFilter}
            onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm transition-colors focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:focus:border-orange-500"
          >
            <option value="">Todos los planes</option>
            <option value="starter">Starter</option>
            <option value="pro">Pro</option>
            <option value="business">Business</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-700/80 dark:bg-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-800/80">
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Email</th>
                  <th className="hidden px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 sm:table-cell">Nombre</th>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Plan</th>
                  <th className="hidden px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 md:table-cell">Facturas</th>
                  <th className="hidden px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 lg:table-cell">Registro</th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-slate-100 last:border-0 dark:border-slate-700/50">
                      <td colSpan={6} className="px-5 py-4"><div className="h-5 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-700" /></td>
                    </tr>
                  ))
                ) : (
                  (data?.users ?? []).map((user) => (
                    <tr key={user.id} className="group border-b border-slate-100 transition-colors last:border-0 hover:bg-orange-50/40 dark:border-slate-700/50 dark:hover:bg-slate-700/30">
                      <td className="px-5 py-3.5">
                        <Link to={`/admin/users/${user.id}`} className="font-medium text-orange-600 transition-colors hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300">
                          {user.email}
                        </Link>
                      </td>
                      <td className="hidden px-5 py-3.5 text-slate-600 dark:text-slate-300 sm:table-cell">
                        {user.nombre_fiscal ?? user.nombre_comercial ?? <span className="text-slate-300 dark:text-slate-600">&mdash;</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset ${PLAN_BADGE[user.plan] ?? PLAN_BADGE.starter}`}>
                            {user.plan}
                          </span>
                          <select
                            value={user.plan}
                            disabled={updatingUser === user.id}
                            onChange={(e) => void handlePlanChange(user.id, e.target.value)}
                            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-500/30 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                            title="Cambiar plan"
                          >
                            {PLAN_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="hidden px-5 py-3.5 font-medium tabular-nums text-slate-700 dark:text-slate-300 md:table-cell">{user.invoices_count}</td>
                      <td className="hidden px-5 py-3.5 text-slate-500 dark:text-slate-400 lg:table-cell">
                        {new Date(user.created_at).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <Link
                            to={`/admin/users/${user.id}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-orange-600 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-orange-400"
                            title="Ver detalle"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => setConfirmDelete({ id: user.id, email: user.email })}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-900/30 dark:hover:text-rose-400"
                            title="Eliminar usuario"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {data && data.total_pages > 1 ? (
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Mostrando pagina <span className="font-medium text-slate-700 dark:text-slate-200">{data.page}</span> de <span className="font-medium text-slate-700 dark:text-slate-200">{data.total_pages}</span>
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
              {getPageRange(page, data.total_pages).map((p, idx) =>
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
                onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
                disabled={page >= data.total_pages}
                className="flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Siguiente <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Modal de confirmación de borrado */}
      {confirmDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-800">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-300">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Eliminar usuario</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Esta acción es irreversible.</p>
              </div>
            </div>
            <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
              Vas a eliminar permanentemente al usuario <strong className="text-slate-900 dark:text-white">{confirmDelete.email}</strong>. Se borrarán sus facturas, presupuestos, contactos, productos y ficheros.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmDelete()}
                disabled={deleting}
                className="rounded-lg bg-gradient-to-r from-rose-500 to-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:from-rose-600 hover:to-rose-700 disabled:opacity-50"
              >
                {deleting ? "Eliminando..." : "Eliminar usuario"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AdminLayout>
  );
}
