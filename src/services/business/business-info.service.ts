import { getCurrentUserId, getSupabaseClient } from "../supabase/client";
import { fail, ok, type ServiceResult } from "../../shared/types/service-result";

export type BusinessTaxType = "iva" | "igic" | "ipsi";
export type BusinessSubscriptionPlan = "starter" | "pro" | "business" | null;
export type BusinessSubscriptionInterval = "monthly" | "yearly" | null;

export interface BusinessInfoInput {
  nombreFiscal: string;
  nifCif: string;
  nombreComercial?: string | null;
  telefono: string;
  direccionFacturacion: string;
  ciudad: string;
  codigoPostal: string;
  provincia: string;
  pais: string;
  sector: string;
  businessType?: "autonomo" | "empresa";
  brandColor?: string | null;
  formaJuridica?: string | null;
  defaultTaxType?: BusinessTaxType;
  defaultIva?: number | null;
  defaultIrpf?: number | null;
  profileImageUrl?: string | null;
  invoiceImageUrl?: string | null;
}

export interface BusinessInfoRecord extends BusinessInfoInput {
  userId: string;
  subscriptionPlan?: BusinessSubscriptionPlan;
  subscriptionInterval?: BusinessSubscriptionInterval;
  subscriptionUpdatedAt?: string | null;
}

function mapRowToRecord(row: Record<string, unknown>): BusinessInfoRecord {
  return {
    userId: String(row.user_id ?? ""),
    nombreFiscal: String(row.nombre_fiscal ?? ""),
    nifCif: String(row.nif_cif ?? ""),
    nombreComercial: (row.nombre_comercial as string | null) ?? null,
    telefono: String(row.telefono ?? ""),
    direccionFacturacion: String(row.direccion_facturacion ?? ""),
    ciudad: String(row.ciudad ?? ""),
    codigoPostal: String(row.codigo_postal ?? ""),
    provincia: String(row.provincia ?? ""),
    pais: String(row.pais ?? ""),
    sector: String(row.sector ?? ""),
    businessType: (row.business_type as "autonomo" | "empresa" | undefined) ?? "autonomo",
    brandColor: (row.brand_color as string | null) ?? null,
    formaJuridica: (row.forma_juridica as string | null) ?? null,
    defaultTaxType: (row.default_tax_type as BusinessTaxType | undefined) ?? "iva",
    defaultIva: row.default_iva === null || row.default_iva === undefined ? 21 : Number(row.default_iva),
    defaultIrpf: row.default_irpf === null || row.default_irpf === undefined ? 15 : Number(row.default_irpf),
    profileImageUrl: (row.profile_image_url as string | null) ?? null,
    invoiceImageUrl: (row.invoice_image_url as string | null) ?? null,
    subscriptionPlan: (row.subscription_plan as BusinessSubscriptionPlan | undefined) ?? null,
    subscriptionInterval: (row.subscription_interval as BusinessSubscriptionInterval | undefined) ?? null,
    subscriptionUpdatedAt: (row.subscription_updated_at as string | null) ?? null,
  };
}

function sanitizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function normalizePercent(value: number | null | undefined, fallback: number): number {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return fallback;
  }
  return Math.max(0, Math.min(100, Number(value)));
}

function mapInputToRow(userId: string, input: BusinessInfoInput): Record<string, unknown> {
  return {
    user_id: userId,
    nombre_fiscal: sanitizeText(input.nombreFiscal),
    nif_cif: sanitizeText(input.nifCif).toUpperCase(),
    nombre_comercial: input.nombreComercial ? sanitizeText(input.nombreComercial) : null,
    telefono: sanitizeText(input.telefono),
    direccion_facturacion: sanitizeText(input.direccionFacturacion),
    ciudad: sanitizeText(input.ciudad),
    codigo_postal: sanitizeText(input.codigoPostal),
    provincia: sanitizeText(input.provincia),
    pais: sanitizeText(input.pais),
    sector: sanitizeText(input.sector),
    business_type: input.businessType ?? "autonomo",
    brand_color: input.brandColor ?? null,
    forma_juridica: input.formaJuridica ? sanitizeText(input.formaJuridica) : null,
    default_tax_type: input.defaultTaxType ?? "iva",
    default_iva: normalizePercent(input.defaultIva, 21),
    default_irpf: normalizePercent(input.defaultIrpf, 15),
    profile_image_url: input.profileImageUrl ?? null,
    invoice_image_url: input.invoiceImageUrl ?? null,
  };
}

export interface IncomeGoals {
  year: number;
  q1: number | null;
  q2: number | null;
  q3: number | null;
  q4: number | null;
}

export type GoalPeriod = "year" | "q1" | "q2" | "q3" | "q4";

export interface BusinessInfoService {
  getMine(): Promise<ServiceResult<BusinessInfoRecord | null>>;
  saveMine(input: BusinessInfoInput): Promise<ServiceResult<BusinessInfoRecord>>;
  getIncomeGoals(): Promise<ServiceResult<IncomeGoals | null>>;
  saveIncomeGoal(period: GoalPeriod, value: number): Promise<ServiceResult<void>>;
}

class SupabaseBusinessInfoService implements BusinessInfoService {
  async getMine(): Promise<ServiceResult<BusinessInfoRecord | null>> {
    const userId = await getCurrentUserId();
    if (!userId) {
      return ok(null);
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from("business_info").select("*").eq("user_id", userId).maybeSingle();
    if (error) {
      return fail(error.message, error.code, error);
    }

    if (!data) {
      return ok(null);
    }

    return ok(mapRowToRecord(data as Record<string, unknown>));
  }

  async saveMine(input: BusinessInfoInput): Promise<ServiceResult<BusinessInfoRecord>> {
    const userId = await getCurrentUserId();
    if (!userId) {
      return fail("No autenticado", "AUTH_REQUIRED");
    }

    if (!input.nombreFiscal.trim() || !input.nifCif.trim() || !input.telefono.trim()) {
      return fail("Nombre fiscal, NIF/CIF y telefono son obligatorios", "VALIDATION_REQUIRED_FIELDS");
    }

    const supabase = getSupabaseClient();
    const payload = mapInputToRow(userId, input);
    const { data, error } = await supabase
      .from("business_info")
      .upsert(payload, { onConflict: "user_id" })
      .select("*")
      .single();

    if (error) {
      return fail(error.message, error.code, error);
    }

    return ok(mapRowToRecord(data as Record<string, unknown>));
  }
  async getIncomeGoals(): Promise<ServiceResult<IncomeGoals | null>> {
    const userId = await getCurrentUserId();
    if (!userId) return ok(null);

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("business_info")
      .select("income_goal, income_goal_q1, income_goal_q2, income_goal_q3, income_goal_q4")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) return fail(error.message, error.code, error);
    if (!data) return ok(null);

    const parseGoal = (v: unknown): number | null => {
      if (v === null || v === undefined) return null;
      const n = Number(v);
      return Number.isNaN(n) ? null : n;
    };

    return ok({
      year: parseGoal(data.income_goal) ?? 1_000_000,
      q1: parseGoal(data.income_goal_q1),
      q2: parseGoal(data.income_goal_q2),
      q3: parseGoal(data.income_goal_q3),
      q4: parseGoal(data.income_goal_q4),
    });
  }

  async saveIncomeGoal(period: GoalPeriod, value: number): Promise<ServiceResult<void>> {
    const userId = await getCurrentUserId();
    if (!userId) return fail("No autenticado", "AUTH_REQUIRED");

    const columnMap: Record<GoalPeriod, string> = {
      year: "income_goal",
      q1: "income_goal_q1",
      q2: "income_goal_q2",
      q3: "income_goal_q3",
      q4: "income_goal_q4",
    };

    const column = columnMap[period];
    const supabase = getSupabaseClient();
    const { error } = await supabase.from("business_info").update({ [column]: value }).eq("user_id", userId);
    if (error) return fail(error.message, error.code, error);
    return ok(undefined);
  }
}

export const businessInfoService: BusinessInfoService = new SupabaseBusinessInfoService();
