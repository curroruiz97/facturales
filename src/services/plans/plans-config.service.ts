import { getSupabaseClient } from "../supabase/client";

export interface PlanConfig {
  id: "starter" | "pro" | "business";
  label: string;
  tagline: string;
  badge: string | null;
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
  displayOrder: number;
}

export const DEFAULT_PLAN_CONFIGS: PlanConfig[] = [
  {
    id: "starter",
    label: "Starter",
    tagline: "Para empezar a facturar.",
    badge: null,
    monthlyPrice: 6.45,
    yearlyPrice: 4.95,
    features: [
      "Hasta 10 clientes",
      "1 usuario",
      "Hasta 30 productos",
      "10 facturas / mes",
      "Escaneado: 10 docs/mes",
      "Soporte por email",
    ],
    displayOrder: 1,
  },
  {
    id: "pro",
    label: "Pro",
    tagline: "Para profesionales y autónomos activos.",
    badge: "Más popular",
    monthlyPrice: 11.95,
    yearlyPrice: 8.95,
    features: [
      "Hasta 150 clientes",
      "Hasta 3 usuarios",
      "Hasta 150 productos",
      "Facturas ilimitadas",
      "Escaneado: 75 docs/mes",
      "Soporte por chat y email",
    ],
    displayOrder: 2,
  },
  {
    id: "business",
    label: "Ilimitado",
    tagline: "Equipos, asesorías y alto volumen.",
    badge: null,
    monthlyPrice: 23.95,
    yearlyPrice: 17.95,
    features: [
      "Clientes ilimitados",
      "Usuarios ilimitados",
      "Productos ilimitados",
      "Facturas ilimitadas",
      "Escaneado: 300 docs/mes",
      "Soporte prioritario (chat, email y teléfono)",
    ],
    displayOrder: 3,
  },
];

interface PlanConfigRow {
  id: string;
  label: string;
  tagline: string;
  badge: string | null;
  monthly_price: number | string;
  yearly_price: number | string;
  features: unknown;
  display_order: number;
}

function toFeatures(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((f): f is string => typeof f === "string");
}

function mapRow(row: PlanConfigRow): PlanConfig {
  return {
    id: row.id as PlanConfig["id"],
    label: row.label,
    tagline: row.tagline,
    badge: row.badge,
    monthlyPrice: Number(row.monthly_price),
    yearlyPrice: Number(row.yearly_price),
    features: toFeatures(row.features),
    displayOrder: row.display_order,
  };
}

let cache: { data: PlanConfig[]; ts: number } | null = null;
const CACHE_TTL_MS = 60 * 1000;

export async function fetchPlanConfigs(forceRefresh = false): Promise<PlanConfig[]> {
  if (!forceRefresh && cache && Date.now() - cache.ts < CACHE_TTL_MS) {
    return cache.data;
  }
  try {
    const { data, error } = await getSupabaseClient()
      .from("subscription_plan_configs")
      .select("*")
      .order("display_order", { ascending: true });
    if (error || !data || data.length === 0) {
      cache = { data: DEFAULT_PLAN_CONFIGS, ts: Date.now() };
      return DEFAULT_PLAN_CONFIGS;
    }
    const mapped = (data as PlanConfigRow[]).map(mapRow);
    // Asegura que los 3 planes existen (fallback parcial)
    const byId = new Map(mapped.map((p) => [p.id, p] as const));
    const full = DEFAULT_PLAN_CONFIGS.map((def) => byId.get(def.id) ?? def);
    cache = { data: full, ts: Date.now() };
    return full;
  } catch {
    return DEFAULT_PLAN_CONFIGS;
  }
}

export async function adminUpsertPlanConfig(plan: PlanConfig): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const { error } = await getSupabaseClient().rpc("admin_upsert_plan_config", {
      p_id: plan.id,
      p_label: plan.label,
      p_tagline: plan.tagline,
      p_badge: plan.badge,
      p_monthly_price: plan.monthlyPrice,
      p_yearly_price: plan.yearlyPrice,
      p_features: plan.features,
    });
    if (error) return { success: false, error: error.message };
    cache = null;
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Error inesperado" };
  }
}

export async function adminResetPlanConfig(planId: PlanConfig["id"]): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const { error } = await getSupabaseClient().rpc("admin_reset_plan_config", { p_id: planId });
    if (error) return { success: false, error: error.message };
    cache = null;
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Error inesperado" };
  }
}

export interface PlanStats {
  planId: "starter" | "pro" | "business";
  activeCount: number;
  trialingCount: number;
  canceledCount: number;
  mrrEstimate: number;
}

interface PlanStatsRow {
  plan_id: string;
  active_count: number;
  trialing_count: number;
  canceled_count: number;
  mrr_estimate: number | string;
}

export async function adminFetchPlanStats(): Promise<PlanStats[]> {
  try {
    const { data, error } = await getSupabaseClient().rpc("admin_get_plan_stats");
    if (error || !data) return [];
    const rows = (data as { plans?: PlanStatsRow[] }).plans ?? [];
    return rows.map((row) => ({
      planId: row.plan_id as PlanStats["planId"],
      activeCount: Number(row.active_count) || 0,
      trialingCount: Number(row.trialing_count) || 0,
      canceledCount: Number(row.canceled_count) || 0,
      mrrEstimate: Number(row.mrr_estimate) || 0,
    }));
  } catch {
    return [];
  }
}
