import { useEffect, useMemo, useState } from "react";
import {
  Users,
  DollarSign,
  TrendingUp,
  Activity,
  UserPlus,
  FileText,
  BarChart3,
  LayoutDashboard,
  CreditCard,
  PieChart,
  Zap,
  Eye,
  CalendarDays,
  ArrowUpRight,
} from "lucide-react";
import { AdminLayout } from "../components/AdminLayout";
import { AdminMetricCard } from "../components/shared/AdminMetricCard";
import { AdminChart } from "../components/shared/AdminChart";
import { AdminDashboardService } from "../services/AdminDashboardService";
import { AdminFinanceService } from "../services/AdminFinanceService";
import type { AdminDashboardMetrics, AdminRevenueAnalytics } from "../types";

/* ------------------------------------------------------------------ */
/*  Plan color mapping                                                 */
/* ------------------------------------------------------------------ */

const PLAN_COLORS: Record<string, { bg: string; bar: string; text: string }> = {
  free:       { bg: "bg-slate-100 dark:bg-slate-700/40",    bar: "bg-slate-400 dark:bg-slate-500",      text: "text-slate-600 dark:text-slate-300" },
  starter:    { bg: "bg-blue-50 dark:bg-blue-900/20",       bar: "bg-blue-500 dark:bg-blue-400",        text: "text-blue-700 dark:text-blue-300" },
  pro:        { bg: "bg-orange-50 dark:bg-orange-900/20",   bar: "bg-orange-500 dark:bg-orange-400",    text: "text-orange-700 dark:text-orange-300" },
  premium:    { bg: "bg-violet-50 dark:bg-violet-900/20",   bar: "bg-violet-500 dark:bg-violet-400",    text: "text-violet-700 dark:text-violet-300" },
  enterprise: { bg: "bg-emerald-50 dark:bg-emerald-900/20", bar: "bg-emerald-500 dark:bg-emerald-400",  text: "text-emerald-700 dark:text-emerald-300" },
};

const fallbackPlanColor = { bg: "bg-gray-100 dark:bg-gray-700/40", bar: "bg-gray-400 dark:bg-gray-500", text: "text-gray-600 dark:text-gray-300" };

function getPlanColor(plan: string) {
  return PLAN_COLORS[plan.toLowerCase()] ?? fallbackPlanColor;
}

/* ------------------------------------------------------------------ */
/*  Number formatting helpers                                          */
/* ------------------------------------------------------------------ */

function fmtCurrency(n: number): string {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " \u20AC";
}

function fmtNumber(n: number): string {
  return n.toLocaleString("es-ES");
}

function fmtPercent(n: number): string {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%";
}

/* ------------------------------------------------------------------ */
/*  Date string for hero                                               */
/* ------------------------------------------------------------------ */

function todayString(): string {
  return new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/* ------------------------------------------------------------------ */
/*  Skeleton loader                                                    */
/* ------------------------------------------------------------------ */

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200/70 dark:bg-slate-700/60 ${className}`} />;
}

function DashboardSkeleton() {
  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Hero skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-4 w-56" />
        </div>

        {/* Primary KPI row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={`p-${i}`} className="h-[7.5rem]" />
          ))}
        </div>

        {/* Secondary KPI row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={`s-${i}`} className="h-[6.5rem]" />
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>

        {/* Bottom cards */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    </AdminLayout>
  );
}

/* ------------------------------------------------------------------ */
/*  Stagger animation helper                                           */
/* ------------------------------------------------------------------ */

const stagger = (index: number) =>
  ({
    opacity: 0,
    animation: `fadeSlideUp 0.45s ease-out ${index * 0.07}s forwards`,
  }) as React.CSSProperties;

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function AdminOverview(): import("react").JSX.Element {
  const [metrics, setMetrics] = useState<AdminDashboardMetrics | null>(null);
  const [revenue, setRevenue] = useState<AdminRevenueAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [m, r] = await Promise.all([
        AdminDashboardService.getDashboardMetrics(),
        AdminFinanceService.getRevenueAnalytics(),
      ]);
      setMetrics(m);
      setRevenue(r);
      setLoading(false);
    };
    void load();
  }, []);

  /* Plan distribution helpers */
  const planDistribution = useMemo(() => {
    const plans = metrics?.plans_distribution ?? [];
    const max = Math.max(...plans.map((p) => p.count), 1);
    return plans.map((p) => ({ ...p, pct: (p.count / max) * 100 }));
  }, [metrics?.plans_distribution]);

  const totalPlanUsers = useMemo(
    () => planDistribution.reduce((s, p) => s + p.count, 0),
    [planDistribution],
  );

  if (loading) return <DashboardSkeleton />;

  return (
    <AdminLayout>
      {/* Keyframes injected once */}
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="space-y-8">
        {/* -------------------------------------------------------- */}
        {/*  Hero header                                              */}
        {/* -------------------------------------------------------- */}
        <div style={stagger(0)}>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500 shadow-sm">
                  <LayoutDashboard className="h-5 w-5 text-white" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Panel de Administraci&oacute;n
                </h1>
              </div>
              <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                Vista general de Facturales Pro &mdash; M&eacute;tricas en tiempo real
              </p>
            </div>

            {/* Live indicator pill */}
            <div className="mt-2 flex items-center gap-1.5 self-start rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 sm:mt-0 sm:self-auto">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              En directo
            </div>
          </div>

          {/* Thin accent divider */}
          <div className="mt-4 h-px bg-gradient-to-r from-orange-400 via-orange-200 to-transparent dark:from-orange-600 dark:via-orange-900/40 dark:to-transparent" />
        </div>

        {/* -------------------------------------------------------- */}
        {/*  Primary KPI cards                                        */}
        {/* -------------------------------------------------------- */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div style={stagger(1)}>
            <AdminMetricCard
              label="Total usuarios"
              value={fmtNumber(metrics?.total_users ?? 0)}
              icon={Users}
              subtitle="Registrados en la plataforma"
            />
          </div>
          <div style={stagger(2)}>
            <AdminMetricCard
              label="MRR"
              value={fmtCurrency(metrics?.mrr ?? 0)}
              icon={DollarSign}
              subtitle="Ingresos recurrentes mensuales"
            />
          </div>
          <div style={stagger(3)}>
            <AdminMetricCard
              label="ARR"
              value={fmtCurrency(metrics?.arr ?? 0)}
              icon={TrendingUp}
              subtitle="Ingresos recurrentes anuales"
            />
          </div>
          <div style={stagger(4)}>
            <AdminMetricCard
              label="Activos semana"
              value={fmtNumber(metrics?.active_week ?? 0)}
              icon={Activity}
              subtitle="Ultimos 7 dias"
            />
          </div>
        </div>

        {/* -------------------------------------------------------- */}
        {/*  Secondary KPI cards                                      */}
        {/* -------------------------------------------------------- */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div style={stagger(5)}>
            <AdminMetricCard
              label="Nuevos hoy"
              value={fmtNumber(metrics?.new_today ?? 0)}
              icon={UserPlus}
              subtitle="Registros en las ultimas 24 h"
            />
          </div>
          <div style={stagger(6)}>
            <AdminMetricCard
              label="Facturas"
              value={fmtNumber(metrics?.total_invoices ?? 0)}
              icon={FileText}
              subtitle="Total emitidas"
            />
          </div>
          <div style={stagger(7)}>
            <AdminMetricCard
              label="Presupuestos"
              value={fmtNumber(metrics?.total_quotes ?? 0)}
              icon={FileText}
              subtitle="Total creados"
            />
          </div>
          <div style={stagger(8)}>
            <AdminMetricCard
              label="Transacciones"
              value={fmtNumber(metrics?.total_transactions ?? 0)}
              icon={BarChart3}
              subtitle="Movimientos registrados"
            />
          </div>
        </div>

        {/* -------------------------------------------------------- */}
        {/*  Charts                                                    */}
        {/* -------------------------------------------------------- */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div style={stagger(9)}>
            <AdminChart
              title="Signups mensuales"
              icon={UserPlus}
              data={metrics?.monthly_signups ?? []}
              type="area"
              dataKey="count"
              xKey="month"
            />
          </div>
          <div style={stagger(10)}>
            <AdminChart
              title="Revenue por plan"
              icon={DollarSign}
              data={revenue?.by_plan ?? []}
              type="bar"
              dataKey="revenue"
              xKey="plan"
            />
          </div>
        </div>

        {/* -------------------------------------------------------- */}
        {/*  Bottom section: Plans + Key metrics                       */}
        {/* -------------------------------------------------------- */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* --- Plan distribution card --- */}
          <div
            style={stagger(11)}
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800"
          >
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PieChart className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Distribuci&oacute;n de planes
                </h3>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                {fmtNumber(totalPlanUsers)} usuarios
              </span>
            </div>

            <div className="space-y-3">
              {planDistribution.map((p) => {
                const c = getPlanColor(p.plan);
                const share = totalPlanUsers > 0 ? ((p.count / totalPlanUsers) * 100) : 0;
                return (
                  <div key={p.plan} className={`rounded-lg px-4 py-3 ${c.bg}`}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className={`text-sm font-semibold capitalize ${c.text}`}>{p.plan}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-400 dark:text-slate-500">
                          {fmtPercent(share)}
                        </span>
                        <span className="min-w-[3.5rem] text-right text-sm font-bold text-slate-900 dark:text-white">
                          {fmtNumber(p.count)}
                        </span>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/5">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ease-out ${c.bar}`}
                        style={{ width: `${p.pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* --- Key metrics summary card --- */}
          <div
            style={stagger(12)}
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800"
          >
            <div className="mb-5 flex items-center gap-2">
              <Zap className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                M&eacute;tricas clave
              </h3>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
              <MetricRow
                icon={ArrowUpRight}
                label="Tasa de conversi&oacute;n"
                value={fmtPercent(revenue?.conversion_rate ?? 0)}
                accent="text-emerald-600 dark:text-emerald-400"
              />
              <MetricRow
                icon={DollarSign}
                label="ARPU"
                value={fmtCurrency(revenue?.arpu ?? 0)}
              />
              <MetricRow
                icon={CreditCard}
                label="Usuarios de pago"
                value={fmtNumber(revenue?.total_paying ?? 0)}
              />
              <MetricRow
                icon={Eye}
                label="Activos hoy"
                value={fmtNumber(metrics?.active_today ?? 0)}
              />
              <MetricRow
                icon={CalendarDays}
                label="Activos este mes"
                value={fmtNumber(metrics?.active_month ?? 0)}
              />
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

/* ------------------------------------------------------------------ */
/*  MetricRow sub-component                                            */
/* ------------------------------------------------------------------ */

interface MetricRowProps {
  icon: typeof Users;
  label: string;
  value: string;
  accent?: string;
}

function MetricRow({ icon: Icon, label, value, accent }: MetricRowProps) {
  return (
    <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
      <div className="flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 dark:bg-slate-700/50">
          <Icon className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
        </div>
        <span className="text-sm text-slate-600 dark:text-slate-400">{label}</span>
      </div>
      <span className={`text-sm font-bold ${accent ?? "text-slate-900 dark:text-white"}`}>
        {value}
      </span>
    </div>
  );
}
