import { useEffect, useState } from "react";
import { Package, Save, Check, Plus, X, AlertCircle } from "lucide-react";
import { AdminLayout } from "../components/AdminLayout";
import {
  DEFAULT_PLAN_CONFIGS,
  adminUpsertPlanConfig,
  fetchPlanConfigs,
  type PlanConfig,
} from "../../../services/plans/plans-config.service";

export function AdminPlans(): import("react").JSX.Element {
  const [plans, setPlans] = useState<PlanConfig[]>(DEFAULT_PLAN_CONFIGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const data = await fetchPlanConfigs(true);
      setPlans(data);
      setLoading(false);
    })();
  }, []);

  const updatePlan = (id: PlanConfig["id"], patch: Partial<PlanConfig>): void => {
    setPlans((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const handleSave = async (plan: PlanConfig): Promise<void> => {
    setError(null);
    setSaving(plan.id);
    const result = await adminUpsertPlanConfig(plan);
    setSaving(null);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setSavedId(plan.id);
    setTimeout(() => setSavedId(null), 2000);
  };

  const addFeature = (id: PlanConfig["id"]): void => {
    setPlans((prev) =>
      prev.map((p) => (p.id === id ? { ...p, features: [...p.features, "Nueva característica"] } : p)),
    );
  };

  const removeFeature = (id: PlanConfig["id"], index: number): void => {
    setPlans((prev) =>
      prev.map((p) => (p.id === id ? { ...p, features: p.features.filter((_, i) => i !== index) } : p)),
    );
  };

  const updateFeature = (id: PlanConfig["id"], index: number, value: string): void => {
    setPlans((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, features: p.features.map((f, i) => (i === index ? value : f)) } : p,
      ),
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/20">
              <Package className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Planes de suscripción</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Edita etiquetas, precios y características de cada plan. Los cambios se aplican al instante en la página pública de planes.
              </p>
            </div>
          </div>
        </div>

        {error ? (
          <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-300">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        {loading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-96 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-700" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"
              >
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-300">
                    <Package className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-slate-400">{plan.id}</p>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">{plan.label}</h3>
                  </div>
                </div>

                {/* Label */}
                <label className="mb-3 block">
                  <span className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">Etiqueta</span>
                  <input
                    type="text"
                    value={plan.label}
                    onChange={(e) => updatePlan(plan.id, { label: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  />
                </label>

                {/* Tagline */}
                <label className="mb-3 block">
                  <span className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">Descripción corta</span>
                  <input
                    type="text"
                    value={plan.tagline}
                    onChange={(e) => updatePlan(plan.id, { tagline: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  />
                </label>

                {/* Badge */}
                <label className="mb-3 block">
                  <span className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">Badge (opcional)</span>
                  <input
                    type="text"
                    placeholder="Ej: Más popular"
                    value={plan.badge ?? ""}
                    onChange={(e) => updatePlan(plan.id, { badge: e.target.value || null })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  />
                </label>

                {/* Prices */}
                <div className="mb-3 grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">€/mes mensual</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={plan.monthlyPrice}
                      onChange={(e) => updatePlan(plan.id, { monthlyPrice: Number(e.target.value) })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">€/mes anual</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={plan.yearlyPrice}
                      onChange={(e) => updatePlan(plan.id, { yearlyPrice: Number(e.target.value) })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    />
                  </label>
                </div>

                {/* Features */}
                <div className="mb-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Características</span>
                    <button
                      type="button"
                      onClick={() => addFeature(plan.id)}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-900/20"
                    >
                      <Plus className="h-3 w-3" /> Añadir
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {plan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={feature}
                          onChange={(e) => updateFeature(plan.id, idx, e.target.value)}
                          className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={() => removeFeature(plan.id, idx)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/30 dark:hover:text-rose-400"
                          title="Eliminar"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => void handleSave(plan)}
                  disabled={saving === plan.id}
                  className={`mt-auto inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold shadow-sm transition-all ${
                    savedId === plan.id
                      ? "bg-emerald-500 text-white"
                      : "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-orange-500/25 hover:from-orange-600 hover:to-orange-700 disabled:opacity-50"
                  }`}
                >
                  {savedId === plan.id ? (
                    <>
                      <Check className="h-4 w-4" /> Guardado
                    </>
                  ) : saving === plan.id ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Guardando
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" /> Guardar {plan.label}
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200">
          <strong>Importante:</strong> los precios aquí son informativos. El cobro real se realiza con los precios configurados en Stripe (env vars <code>STRIPE_PRICE_*</code> de la Edge Function). Para cambiar el importe cobrado de verdad, crea precios nuevos en el dashboard de Stripe y actualiza las variables de entorno en Supabase.
        </div>
      </div>
    </AdminLayout>
  );
}
