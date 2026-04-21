import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Package,
  Save,
  Check,
  Plus,
  X,
  AlertCircle,
  Users,
  DollarSign,
  RotateCcw,
  ExternalLink,
  TrendingUp,
  Star,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Info,
} from "lucide-react";
import { AdminLayout } from "../components/AdminLayout";
import {
  DEFAULT_PLAN_CONFIGS,
  adminFetchPlanStats,
  adminResetPlanConfig,
  adminUpsertPlanConfig,
  fetchPlanConfigs,
  type PlanConfig,
  type PlanStats,
} from "../../../services/plans/plans-config.service";

// === Helpers =================================================================

function formatCurrency(value: number): string {
  return value.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function calculateYearlyDiscount(monthly: number, yearly: number): number | null {
  if (monthly <= 0 || yearly <= 0) return null;
  const discount = ((monthly - yearly) / monthly) * 100;
  return Math.round(discount);
}

function isPlanDirty(current: PlanConfig, original: PlanConfig | null): boolean {
  if (!original) return true;
  if (current.label !== original.label) return true;
  if (current.tagline !== original.tagline) return true;
  if ((current.badge ?? "") !== (original.badge ?? "")) return true;
  if (Math.abs(current.monthlyPrice - original.monthlyPrice) > 0.001) return true;
  if (Math.abs(current.yearlyPrice - original.yearlyPrice) > 0.001) return true;
  if (current.features.length !== original.features.length) return true;
  return current.features.some((f, i) => f !== original.features[i]);
}

function statsByPlanId(stats: PlanStats[], id: PlanConfig["id"]): PlanStats | null {
  return stats.find((s) => s.planId === id) ?? null;
}

// === Live preview card ======================================================

function PlanPreviewCard({ plan, interval }: { plan: PlanConfig; interval: "monthly" | "yearly" }): import("react").JSX.Element {
  const price = interval === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
  const isFeatured = Boolean(plan.badge);
  return (
    <div
      className={`relative flex flex-col rounded-2xl border bg-white p-5 shadow-sm transition-all dark:bg-slate-900 ${
        isFeatured
          ? "border-orange-400 ring-1 ring-orange-400/30 dark:border-orange-500/60"
          : "border-slate-200 dark:border-slate-700"
      }`}
    >
      {plan.badge ? (
        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow">
          {plan.badge}
        </span>
      ) : null}
      <h4 className="text-lg font-bold text-slate-900 dark:text-white">{plan.label || "(sin nombre)"}</h4>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{plan.tagline || <span className="italic">(sin descripción)</span>}</p>
      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          {formatCurrency(price)}
        </span>
        <span className="text-sm font-semibold text-slate-500">€</span>
        <span className="text-xs text-slate-400">/mes + IVA</span>
      </div>
      <p className="mt-0.5 text-[11px] text-slate-400">
        {interval === "yearly"
          ? `Facturación anual · ${formatCurrency(price * 12)} € al año`
          : "Facturación mensual"}
      </p>
      <ul className="mt-4 flex-1 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
        {plan.features.length === 0 ? (
          <li className="italic text-slate-400">Sin características configuradas</li>
        ) : (
          plan.features.map((f, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <Check className="mt-0.5 h-3 w-3 flex-shrink-0 text-emerald-500" />
              <span>{f}</span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

// === Plan editor card =======================================================

interface PlanEditorProps {
  plan: PlanConfig;
  original: PlanConfig | null;
  stats: PlanStats | null;
  onUpdate: (patch: Partial<PlanConfig>) => void;
  onUpdateFeature: (idx: number, value: string) => void;
  onAddFeature: () => void;
  onRemoveFeature: (idx: number) => void;
  onMoveFeature: (idx: number, dir: -1 | 1) => void;
  onSave: () => void;
  onDiscard: () => void;
  onReset: () => void;
  saving: boolean;
  saved: boolean;
}

function PlanEditor({
  plan,
  original,
  stats,
  onUpdate,
  onUpdateFeature,
  onAddFeature,
  onRemoveFeature,
  onMoveFeature,
  onSave,
  onDiscard,
  onReset,
  saving,
  saved,
}: PlanEditorProps): import("react").JSX.Element {
  const dirty = isPlanDirty(plan, original);
  const yearlyDiscount = calculateYearlyDiscount(plan.monthlyPrice, plan.yearlyPrice);
  const stripeMonthlyEnv = `STRIPE_PRICE_${plan.id.toUpperCase()}_MONTHLY`;
  const stripeYearlyEnv = `STRIPE_PRICE_${plan.id.toUpperCase()}_YEARLY`;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      {/* Header */}
      <div className="border-b border-slate-100 bg-gradient-to-r from-orange-50/70 via-white to-white px-5 py-4 dark:border-slate-700 dark:from-orange-900/10 dark:via-slate-800 dark:to-slate-800">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-sm shadow-orange-500/20">
              <Package className="h-4 w-4" />
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400">{plan.id}</p>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">{plan.label}</h3>
            </div>
          </div>
          {dirty ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Cambios sin guardar
            </span>
          ) : saved ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
              <Check className="h-3 w-3" />
              Guardado
            </span>
          ) : null}
        </div>

        {/* Stats row */}
        {stats ? (
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border border-slate-100 bg-white/60 py-2 dark:border-slate-700 dark:bg-slate-800/60">
              <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider text-slate-400">
                <Users className="h-3 w-3" /> Activos
              </div>
              <p className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">{stats.activeCount}</p>
            </div>
            <div className="rounded-lg border border-slate-100 bg-white/60 py-2 dark:border-slate-700 dark:bg-slate-800/60">
              <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider text-slate-400">
                <TrendingUp className="h-3 w-3" /> En trial
              </div>
              <p className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">{stats.trialingCount}</p>
            </div>
            <div className="rounded-lg border border-slate-100 bg-white/60 py-2 dark:border-slate-700 dark:bg-slate-800/60">
              <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider text-slate-400">
                <DollarSign className="h-3 w-3" /> MRR est.
              </div>
              <p className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">{formatCurrency(stats.mrrEstimate)}€</p>
            </div>
          </div>
        ) : null}
      </div>

      <div className="grid gap-5 p-5 lg:grid-cols-2">
        {/* Form */}
        <div className="space-y-4">
          {/* Identity */}
          <section>
            <h4 className="mb-2 text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">Identidad</h4>
            <div className="space-y-2.5">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">Etiqueta</span>
                <input
                  type="text"
                  value={plan.label}
                  onChange={(e) => onUpdate({ label: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">Descripción corta</span>
                <input
                  type="text"
                  value={plan.tagline}
                  onChange={(e) => onUpdate({ tagline: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Badge destacado <span className="font-normal text-slate-400">(ej. "Más popular" — dejar vacío para ocultar)</span>
                </span>
                <div className="relative">
                  <Star className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Vacío para ocultar"
                    value={plan.badge ?? ""}
                    onChange={(e) => onUpdate({ badge: e.target.value || null })}
                    className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  />
                </div>
              </label>
            </div>
          </section>

          {/* Pricing */}
          <section>
            <h4 className="mb-2 text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">Precios (sin IVA)</h4>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">€/mes mensual</span>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={plan.monthlyPrice}
                    onChange={(e) => onUpdate({ monthlyPrice: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 pr-8 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">€</span>
                </div>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">€/mes anual</span>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={plan.yearlyPrice}
                    onChange={(e) => onUpdate({ yearlyPrice: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 pr-8 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">€</span>
                </div>
              </label>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                Descuento anual: <strong className={yearlyDiscount && yearlyDiscount > 0 ? "text-emerald-600" : "text-slate-400"}>
                  {yearlyDiscount === null ? "—" : `${yearlyDiscount}%`}
                </strong>
              </span>
              <span className="text-slate-500 dark:text-slate-400">
                Total anual: <strong className="text-slate-700 dark:text-slate-200">{formatCurrency(plan.yearlyPrice * 12)}€</strong>
              </span>
            </div>
          </section>

          {/* Features */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">
                Características ({plan.features.length})
              </h4>
              <button
                type="button"
                onClick={onAddFeature}
                className="inline-flex items-center gap-1 rounded-md bg-orange-50 px-2 py-1 text-xs font-semibold text-orange-600 transition hover:bg-orange-100 dark:bg-orange-900/20 dark:text-orange-400"
              >
                <Plus className="h-3 w-3" /> Añadir
              </button>
            </div>
            <div className="space-y-1.5">
              {plan.features.map((feature, idx) => (
                <div key={idx} className="group flex items-center gap-1">
                  <div className="flex flex-col gap-0.5 text-slate-300 dark:text-slate-600">
                    <button
                      type="button"
                      onClick={() => onMoveFeature(idx, -1)}
                      disabled={idx === 0}
                      className="flex h-3 w-3 items-center justify-center rounded hover:text-orange-500 disabled:opacity-30"
                      title="Subir"
                    >
                      <ArrowUp className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onMoveFeature(idx, 1)}
                      disabled={idx === plan.features.length - 1}
                      className="flex h-3 w-3 items-center justify-center rounded hover:text-orange-500 disabled:opacity-30"
                      title="Bajar"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </button>
                  </div>
                  <GripVertical className="h-3.5 w-3.5 flex-shrink-0 text-slate-300 dark:text-slate-600" />
                  <input
                    type="text"
                    value={feature}
                    onChange={(e) => onUpdateFeature(idx, e.target.value)}
                    className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => onRemoveFeature(idx)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 opacity-0 transition hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100 dark:hover:bg-rose-900/30"
                    title="Eliminar"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {plan.features.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-200 py-6 text-center text-xs italic text-slate-400 dark:border-slate-700">
                  Sin características. Pulsa "Añadir" para crear la primera.
                </p>
              ) : null}
            </div>
          </section>

          {/* Stripe */}
          <section>
            <h4 className="mb-2 flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">
              <Info className="h-3 w-3" /> Stripe
            </h4>
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-[11px] text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
              <p className="mb-1.5">El importe real cobrado viene de las <strong>Stripe env vars</strong>. Para cambiarlo, actualiza:</p>
              <div className="space-y-0.5 font-mono">
                <p>• <code className="rounded bg-slate-200 px-1 py-0.5 text-[10px] dark:bg-slate-800">{stripeMonthlyEnv}</code></p>
                <p>• <code className="rounded bg-slate-200 px-1 py-0.5 text-[10px] dark:bg-slate-800">{stripeYearlyEnv}</code></p>
              </div>
            </div>
          </section>
        </div>

        {/* Preview */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">Vista previa pública</h4>
            <Link
              to="/planes"
              target="_blank"
              className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-700 dark:text-orange-400"
            >
              Abrir página real <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
          <div className="rounded-xl border border-slate-100 bg-gradient-to-br from-orange-50/40 via-amber-50/20 to-transparent p-4 dark:border-slate-700 dark:from-orange-900/10 dark:via-amber-900/5">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Mensual</p>
            <PlanPreviewCard plan={plan} interval="monthly" />
          </div>
          <div className="rounded-xl border border-slate-100 bg-gradient-to-br from-orange-50/40 via-amber-50/20 to-transparent p-4 dark:border-slate-700 dark:from-orange-900/10 dark:via-amber-900/5">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Anual</p>
            <PlanPreviewCard plan={plan} interval="yearly" />
          </div>
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3 dark:border-slate-700 dark:bg-slate-900/40">
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-rose-500/50 dark:hover:bg-rose-900/20 dark:hover:text-rose-400"
          title="Restaurar valores por defecto"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Restablecer defaults
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onDiscard}
            disabled={!dirty}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Descartar cambios
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving || !dirty}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-semibold shadow-sm transition-all ${
              saved
                ? "bg-emerald-500 text-white"
                : "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-orange-500/25 hover:from-orange-600 hover:to-orange-700 disabled:cursor-not-allowed disabled:opacity-40"
            }`}
          >
            {saved ? (
              <>
                <Check className="h-3.5 w-3.5" /> Guardado
              </>
            ) : saving ? (
              <>
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Guardando
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" /> Guardar cambios
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// === Page ===================================================================

export function AdminPlans(): import("react").JSX.Element {
  const [plans, setPlans] = useState<PlanConfig[]>(DEFAULT_PLAN_CONFIGS);
  const [originalPlans, setOriginalPlans] = useState<PlanConfig[]>([]);
  const [stats, setStats] = useState<PlanStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState<PlanConfig["id"] | null>(null);

  useEffect(() => {
    void (async () => {
      const [data, statsData] = await Promise.all([
        fetchPlanConfigs(true),
        adminFetchPlanStats(),
      ]);
      setPlans(data);
      setOriginalPlans(data.map((p) => ({ ...p, features: [...p.features] })));
      setStats(statsData);
      setLoading(false);
    })();
  }, []);

  const totalActive = useMemo(() => stats.reduce((sum, s) => sum + s.activeCount, 0), [stats]);
  const totalMrr = useMemo(() => stats.reduce((sum, s) => sum + s.mrrEstimate, 0), [stats]);
  const totalTrial = useMemo(() => stats.reduce((sum, s) => sum + s.trialingCount, 0), [stats]);

  const updatePlan = (id: PlanConfig["id"], patch: Partial<PlanConfig>): void => {
    setPlans((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const updateFeature = (id: PlanConfig["id"], idx: number, value: string): void => {
    setPlans((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, features: p.features.map((f, i) => (i === idx ? value : f)) } : p,
      ),
    );
  };

  const addFeature = (id: PlanConfig["id"]): void => {
    setPlans((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, features: [...p.features, "Nueva característica"] } : p,
      ),
    );
  };

  const removeFeature = (id: PlanConfig["id"], idx: number): void => {
    setPlans((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, features: p.features.filter((_, i) => i !== idx) } : p,
      ),
    );
  };

  const moveFeature = (id: PlanConfig["id"], idx: number, dir: -1 | 1): void => {
    setPlans((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const next = [...p.features];
        const target = idx + dir;
        if (target < 0 || target >= next.length) return p;
        [next[idx], next[target]] = [next[target], next[idx]];
        return { ...p, features: next };
      }),
    );
  };

  const discardPlan = (id: PlanConfig["id"]): void => {
    const original = originalPlans.find((p) => p.id === id);
    if (!original) return;
    setPlans((prev) =>
      prev.map((p) => (p.id === id ? { ...original, features: [...original.features] } : p)),
    );
  };

  const savePlan = async (plan: PlanConfig): Promise<void> => {
    setError(null);
    setSaving(plan.id);
    const result = await adminUpsertPlanConfig(plan);
    setSaving(null);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setOriginalPlans((prev) =>
      prev.map((p) => (p.id === plan.id ? { ...plan, features: [...plan.features] } : p)),
    );
    setSavedId(plan.id);
    setTimeout(() => setSavedId(null), 2000);
  };

  const handleReset = async (id: PlanConfig["id"]): Promise<void> => {
    setConfirmReset(null);
    setError(null);
    setSaving(id);
    const result = await adminResetPlanConfig(id);
    if (!result.success) {
      setSaving(null);
      setError(result.error);
      return;
    }
    const [fresh, statsData] = await Promise.all([fetchPlanConfigs(true), adminFetchPlanStats()]);
    setPlans(fresh);
    setOriginalPlans(fresh.map((p) => ({ ...p, features: [...p.features] })));
    setStats(statsData);
    setSaving(null);
    setSavedId(id);
    setTimeout(() => setSavedId(null), 2000);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page header with global stats */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-orange-50/30 to-amber-50/20 shadow-sm dark:border-slate-700 dark:from-slate-800 dark:via-slate-800 dark:to-slate-900">
          <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/25">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Planes de suscripción</h2>
                <p className="max-w-xl text-sm text-slate-500 dark:text-slate-400">
                  Edita el contenido visible en <Link to="/planes" target="_blank" className="font-semibold text-orange-600 underline underline-offset-2 hover:text-orange-700">tu página pública de planes</Link>. Cambios aplicados inmediatamente, sin redeploy.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              <div className="rounded-xl border border-slate-100 bg-white px-3 py-2 text-center dark:border-slate-700 dark:bg-slate-800">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Suscripciones</p>
                <p className="text-xl font-bold tabular-nums text-slate-900 dark:text-white">{totalActive}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-white px-3 py-2 text-center dark:border-slate-700 dark:bg-slate-800">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">En prueba</p>
                <p className="text-xl font-bold tabular-nums text-slate-900 dark:text-white">{totalTrial}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-white px-3 py-2 text-center dark:border-slate-700 dark:bg-slate-800">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">MRR est.</p>
                <p className="text-xl font-bold tabular-nums text-slate-900 dark:text-white">{formatCurrency(totalMrr)}€</p>
              </div>
            </div>
          </div>
        </div>

        {error ? (
          <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-300">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span>{error}</span>
            <button type="button" onClick={() => setError(null)} className="ml-auto text-rose-400 hover:text-rose-600">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        {loading ? (
          <div className="grid gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-[520px] animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
            ))}
          </div>
        ) : (
          <div className="space-y-5">
            {plans.map((plan) => (
              <PlanEditor
                key={plan.id}
                plan={plan}
                original={originalPlans.find((p) => p.id === plan.id) ?? null}
                stats={statsByPlanId(stats, plan.id)}
                onUpdate={(patch) => updatePlan(plan.id, patch)}
                onUpdateFeature={(idx, v) => updateFeature(plan.id, idx, v)}
                onAddFeature={() => addFeature(plan.id)}
                onRemoveFeature={(idx) => removeFeature(plan.id, idx)}
                onMoveFeature={(idx, dir) => moveFeature(plan.id, idx, dir)}
                onSave={() => void savePlan(plan)}
                onDiscard={() => discardPlan(plan.id)}
                onReset={() => setConfirmReset(plan.id)}
                saving={saving === plan.id}
                saved={savedId === plan.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Confirm reset modal */}
      {confirmReset ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-800">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-300">
                <RotateCcw className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Restablecer plan a defaults</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Se perderán todas las personalizaciones.</p>
              </div>
            </div>
            <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
              Vas a restablecer el plan <strong className="text-slate-900 dark:text-white">{confirmReset}</strong> a sus valores por defecto (etiqueta, precios, descripción y características). Los usuarios ya suscritos no se ven afectados.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmReset(null)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleReset(confirmReset)}
                className="rounded-lg bg-gradient-to-r from-rose-500 to-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:from-rose-600 hover:to-rose-700"
              >
                Restablecer
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AdminLayout>
  );
}
