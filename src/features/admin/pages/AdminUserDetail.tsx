import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Shield, Trash2, Ban, CheckCircle, CreditCard, FileText, Users as UsersIcon, Package, Receipt, ChevronRight, Clock } from "lucide-react";
import { AdminLayout } from "../components/AdminLayout";
import { AdminMetricCard } from "../components/shared/AdminMetricCard";
import { AdminStatusBadge } from "../components/shared/AdminStatusBadge";
import { AdminConfirmDialog } from "../components/shared/AdminConfirmDialog";
import { AdminUserService } from "../services/AdminUserService";
import { AdminDashboardService } from "../services/AdminDashboardService";
import type { AdminUserDetail as AdminUserDetailType } from "../types";

const PLAN_BADGE: Record<string, string> = {
  starter: "bg-slate-100 text-slate-700 ring-slate-200/60 dark:bg-slate-700 dark:text-slate-300 dark:ring-slate-600",
  pro: "bg-orange-50 text-orange-700 ring-orange-200/60 dark:bg-orange-900/30 dark:text-orange-400 dark:ring-orange-700/40",
  business: "bg-violet-50 text-violet-700 ring-violet-200/60 dark:bg-violet-900/30 dark:text-violet-400 dark:ring-violet-700/40",
};

function getInitials(email: string, name?: string | null): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    return (parts[0]?.[0] ?? "").toUpperCase() + (parts[1]?.[0] ?? "").toUpperCase();
  }
  return (email[0] ?? "?").toUpperCase();
}

export function AdminUserDetail(): import("react").JSX.Element {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<AdminUserDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminRole, setAdminRole] = useState<string | null>(null);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("");

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      const [detail, role] = await Promise.all([
        AdminUserService.getUserDetail(userId),
        AdminDashboardService.getAdminRole(),
      ]);
      setData(detail);
      setAdminRole(role);
      setSelectedPlan(detail?.subscription?.plan ?? "starter");
      setLoading(false);
    };
    void load();
  }, [userId]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div className="h-8 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!data) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-slate-500 dark:text-slate-400">Usuario no encontrado</p>
          <Link to="/admin/users" className="mt-3 text-sm text-orange-600 hover:underline">Volver a usuarios</Link>
        </div>
      </AdminLayout>
    );
  }

  const handleSuspend = async () => {
    if (!userId) return;
    await AdminUserService.suspendUser(userId, "Suspendido por admin");
    const detail = await AdminUserService.getUserDetail(userId);
    setData(detail);
  };

  const handleUnsuspend = async () => {
    if (!userId) return;
    await AdminUserService.unsuspendUser(userId);
    const detail = await AdminUserService.getUserDetail(userId);
    setData(detail);
  };

  const handleDelete = async () => {
    if (!userId) return;
    const ok = await AdminUserService.deleteUser(userId);
    if (ok) navigate("/admin/users");
  };

  const handleUpdatePlan = async () => {
    if (!userId) return;
    await AdminUserService.updateSubscription(userId, selectedPlan);
    const detail = await AdminUserService.getUserDetail(userId);
    setData(detail);
    setPlanOpen(false);
  };

  const handleGrantAdmin = async () => {
    if (!userId) return;
    await AdminUserService.grantAdmin(userId);
    const detail = await AdminUserService.getUserDetail(userId);
    setData(detail);
  };

  const handleRevokeAdmin = async () => {
    if (!userId) return;
    await AdminUserService.revokeAdmin(userId);
    const detail = await AdminUserService.getUserDetail(userId);
    setData(detail);
  };

  const isSuperAdmin = adminRole === "super_admin";
  const displayName = data.profile.full_name ?? data.profile.nombre_fiscal ?? null;
  const plan = data.subscription?.plan ?? "starter";

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Breadcrumb navigation */}
        <nav className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
          <Link to="/admin/users" className="flex items-center gap-1 rounded-md px-1.5 py-1 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200">
            <ArrowLeft className="h-3.5 w-3.5" />
            Usuarios
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600" />
          <span className="font-medium text-slate-700 dark:text-slate-200">{data.profile.email}</span>
        </nav>

        {/* Profile header */}
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-lg font-bold text-white shadow-lg shadow-orange-500/20">
            {getInitials(data.profile.email, displayName)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{displayName ?? data.profile.email}</h2>
              {data.is_admin ? <AdminStatusBadge variant="warning" dot>Admin</AdminStatusBadge> : null}
            </div>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              {displayName ? data.profile.email : null}
              {displayName ? " · " : ""}
              Registrado el {new Date(data.profile.created_at).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })}
            </p>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AdminMetricCard label="Clientes" value={data.stats.clients} icon={UsersIcon} />
          <AdminMetricCard label="Facturas" value={data.stats.invoices} icon={FileText} />
          <AdminMetricCard label="Productos" value={data.stats.products} icon={Package} />
          <AdminMetricCard label="Facturado" value={`${data.stats.invoices_total_amount.toLocaleString("es-ES", { minimumFractionDigits: 2 })} EUR`} icon={Receipt} />
        </div>

        {/* Subscription + Actions */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Subscription card */}
          <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-700/80 dark:bg-slate-800">
            <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-700/60">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
                <CreditCard className="h-4 w-4 text-orange-500" /> Suscripcion
              </h3>
            </div>
            <div className="space-y-3 p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 dark:text-slate-400">Plan</span>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset ${PLAN_BADGE[plan] ?? PLAN_BADGE.starter}`}>
                  {plan}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 dark:text-slate-400">Estado</span>
                <AdminStatusBadge variant={data.subscription?.status === "active" ? "active" : "draft"} dot>
                  {data.subscription?.status ?? "sin suscripcion"}
                </AdminStatusBadge>
              </div>
            </div>
            <div className="border-t border-slate-100 px-5 py-4 dark:border-slate-700/60">
              <button
                type="button"
                onClick={() => setPlanOpen(true)}
                className="w-full rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-orange-500/20 transition-all hover:from-orange-600 hover:to-orange-700 hover:shadow-md hover:shadow-orange-500/25 active:scale-[0.98]"
              >
                Cambiar plan
              </button>
            </div>
          </div>

          {/* Actions card */}
          <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-700/80 dark:bg-slate-800">
            <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-700/60">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Acciones</h3>
            </div>
            <div className="space-y-2 p-5">
              <button
                type="button"
                onClick={() => setSuspendOpen(true)}
                className="flex w-full items-center gap-2.5 rounded-lg border border-amber-200 bg-amber-50/50 px-4 py-2.5 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-100/60 dark:border-amber-700/40 dark:bg-amber-900/10 dark:text-amber-400 dark:hover:bg-amber-900/20"
              >
                <Ban className="h-4 w-4" /> Suspender usuario
              </button>
              <button
                type="button"
                onClick={() => void handleUnsuspend()}
                className="flex w-full items-center gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50/50 px-4 py-2.5 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100/60 dark:border-emerald-700/40 dark:bg-emerald-900/10 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
              >
                <CheckCircle className="h-4 w-4" /> Reactivar usuario
              </button>
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                className="flex w-full items-center gap-2.5 rounded-lg border border-red-200 bg-red-50/50 px-4 py-2.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-100/60 dark:border-red-700/40 dark:bg-red-900/10 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <Trash2 className="h-4 w-4" /> Eliminar usuario
              </button>
              {isSuperAdmin ? (
                data.is_admin ? (
                  <button type="button" onClick={() => void handleRevokeAdmin()}
                    className="flex w-full items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100/60 dark:border-slate-600 dark:bg-slate-700/30 dark:text-slate-300 dark:hover:bg-slate-700/50">
                    <Shield className="h-4 w-4" /> Revocar admin
                  </button>
                ) : (
                  <button type="button" onClick={() => void handleGrantAdmin()}
                    className="flex w-full items-center gap-2.5 rounded-lg border border-orange-200 bg-orange-50/50 px-4 py-2.5 text-sm font-medium text-orange-700 transition-colors hover:bg-orange-100/60 dark:border-orange-700/40 dark:bg-orange-900/10 dark:text-orange-400 dark:hover:bg-orange-900/20">
                    <Shield className="h-4 w-4" /> Asignar admin
                  </button>
                )
              ) : null}
            </div>
          </div>
        </div>

        {/* Activity timeline */}
        {data.recent_activity.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-700/80 dark:bg-slate-800">
            <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-700/60">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
                <Clock className="h-4 w-4 text-slate-400" /> Actividad reciente
              </h3>
            </div>
            <div className="p-5">
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute bottom-0 left-[7px] top-0 w-px bg-slate-200 dark:bg-slate-700" />

                <div className="space-y-4">
                  {data.recent_activity.slice(0, 10).map((a, i) => (
                    <div key={i} className="relative flex items-start gap-4 pl-6">
                      {/* Timeline dot */}
                      <div className="absolute left-0 top-2 h-[15px] w-[15px] rounded-full border-2 border-white bg-orange-500 shadow-sm dark:border-slate-800" />
                      <div className="flex flex-1 items-center justify-between rounded-lg border border-slate-100 bg-slate-50/60 px-4 py-3 transition-colors hover:border-slate-200 dark:border-slate-700/50 dark:bg-slate-700/30 dark:hover:border-slate-600">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{a.action}</span>
                        <span className="ml-3 shrink-0 text-xs text-slate-400 dark:text-slate-500">
                          {new Date(a.created_at).toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <AdminConfirmDialog
        open={suspendOpen}
        onClose={() => setSuspendOpen(false)}
        onConfirm={handleSuspend}
        title="Suspender usuario"
        description={`El usuario ${data.profile.email} no podra acceder a la plataforma.`}
        confirmLabel="Suspender"
        destructive
      />

      <AdminConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Eliminar usuario"
        description="Esta accion es irreversible. Se eliminaran todos los datos del usuario."
        confirmLabel="Eliminar permanentemente"
        destructive
        requireConfirmation="ELIMINAR"
      />

      {planOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setPlanOpen(false)}>
          <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-slate-100 px-6 py-4 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Cambiar plan</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Selecciona el nuevo plan para este usuario</p>
            </div>
            <div className="px-6 py-5">
              <select
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm transition-colors focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              >
                <option value="starter">Starter</option>
                <option value="pro">Pro</option>
                <option value="business">Business</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4 dark:border-slate-700 dark:bg-slate-800/50">
              <button type="button" onClick={() => setPlanOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700">
                Cancelar
              </button>
              <button type="button" onClick={() => void handleUpdatePlan()}
                className="rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-orange-500/20 transition-all hover:from-orange-600 hover:to-orange-700">
                Guardar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AdminLayout>
  );
}
