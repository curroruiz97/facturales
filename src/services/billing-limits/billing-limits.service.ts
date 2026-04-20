import { evaluateDocumentLimit, type DocumentKind } from "../../domain/rules/document-limit.rule";
import type { BillingPlan, BillingUsageSnapshot, PlanLimits, PlanUsage } from "../../shared/types/domain";
import { fail, ok, type ServiceResult } from "../../shared/types/service-result";
import { getCurrentUserId, getSupabaseClient } from "../supabase/client";

export interface LimitCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
  reason?: string;
}

export interface BillingLimitsService {
  getUsage(): Promise<ServiceResult<BillingUsageSnapshot | null>>;
  canCreateDocument(kind: DocumentKind): Promise<ServiceResult<LimitCheckResult>>;
  canCreateClient(): Promise<ServiceResult<LimitCheckResult>>;
  canCreateProduct(): Promise<ServiceResult<LimitCheckResult>>;
  canCreateInvoice(): Promise<ServiceResult<LimitCheckResult>>;
  canScanOCR(): Promise<ServiceResult<LimitCheckResult>>;
  recordInvoiceUsage(): Promise<ServiceResult<null>>;
  recordOCRUsage(): Promise<ServiceResult<null>>;
  formatLimit(value: number): string;
}

const LIMITS_BY_PLAN: Record<BillingPlan, PlanLimits> = {
  none: { clients: 0, products: 0, invoicesMonth: 0, ocrMonth: 0 },
  starter: { clients: 10, products: 30, invoicesMonth: 10, ocrMonth: 10 },
  pro: { clients: 150, products: 150, invoicesMonth: Number.POSITIVE_INFINITY, ocrMonth: 75 },
  business: { clients: Number.POSITIVE_INFINITY, products: Number.POSITIVE_INFINITY, invoicesMonth: Number.POSITIVE_INFINITY, ocrMonth: 300 },
};

const PLAN_NAMES: Record<BillingPlan, string> = {
  none: "Sin plan",
  starter: "Starter",
  pro: "Pro",
  business: "Ilimitado",
};

function monthStartISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

async function resolveCurrentPlan(): Promise<BillingPlan> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return "none";
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("billing_subscriptions")
    .select("plan")
    .eq("user_id", userId)
    .in("status", ["trialing", "active"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data?.plan) {
    return "none";
  }

  return data.plan as BillingPlan;
}

async function resolvePeriodStart(userId: string): Promise<string> {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from("billing_subscriptions")
    .select("current_period_start")
    .eq("user_id", userId)
    .in("status", ["trialing", "active"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data?.current_period_start) {
    return monthStartISO();
  }

  return String(data.current_period_start).slice(0, 10);
}

async function resolveUsageForPeriod(userId: string, periodStart: string): Promise<PlanUsage> {
  const supabase = getSupabaseClient();
  const [{ count: clients = 0 }, { count: products = 0 }, usageResult] = await Promise.all([
    supabase.from("clientes").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("productos").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase
      .from("billing_usage")
      .select("invoices_used, ocr_scans_used")
      .eq("user_id", userId)
      .eq("period_start", periodStart)
      .maybeSingle(),
  ]);

  const monthly = usageResult.data ?? { invoices_used: 0, ocr_scans_used: 0 };
  return {
    clients: clients ?? 0,
    products: products ?? 0,
    invoicesMonth: monthly.invoices_used ?? 0,
    ocrMonth: monthly.ocr_scans_used ?? 0,
  };
}

function checkLimit(current: number, limit: number, exceededMessage: string): LimitCheckResult {
  if (limit === Number.POSITIVE_INFINITY) {
    return { allowed: true, current, limit };
  }

  if (current >= limit) {
    return { allowed: false, current, limit, reason: exceededMessage };
  }

  return { allowed: true, current, limit };
}

class BillingLimitsServiceImpl implements BillingLimitsService {
  async getUsage(): Promise<ServiceResult<BillingUsageSnapshot | null>> {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        return ok(null);
      }

      const plan = await resolveCurrentPlan();
      const limits = LIMITS_BY_PLAN[plan] ?? LIMITS_BY_PLAN.none;
      const periodStart = await resolvePeriodStart(userId);
      const usage = await resolveUsageForPeriod(userId, periodStart);

      return ok({
        plan,
        planName: PLAN_NAMES[plan] ?? plan,
        limits,
        usage,
      });
    } catch (error) {
      return fail("No se pudo calcular el uso del plan", "BILLING_USAGE_ERROR", error);
    }
  }

  async canCreateClient(): Promise<ServiceResult<LimitCheckResult>> {
    try {
      const usageResult = await this.getUsage();
      if (!usageResult.success || !usageResult.data) {
        return ok({ allowed: false, current: 0, limit: 0, reason: "No autenticado" });
      }

      const { usage, limits, planName } = usageResult.data;
      return ok(checkLimit(usage.clients, limits.clients, `Has alcanzado el limite de ${limits.clients} clientes del plan ${planName}.`));
    } catch (error) {
      return fail("No se pudo validar limite de clientes", "BILLING_LIMIT_CLIENTS_ERROR", error);
    }
  }

  async canCreateProduct(): Promise<ServiceResult<LimitCheckResult>> {
    try {
      const usageResult = await this.getUsage();
      if (!usageResult.success || !usageResult.data) {
        return ok({ allowed: false, current: 0, limit: 0, reason: "No autenticado" });
      }

      const { usage, limits, planName } = usageResult.data;
      return ok(checkLimit(usage.products, limits.products, `Has alcanzado el limite de ${limits.products} productos del plan ${planName}.`));
    } catch (error) {
      return fail("No se pudo validar limite de productos", "BILLING_LIMIT_PRODUCTS_ERROR", error);
    }
  }

  async canCreateInvoice(): Promise<ServiceResult<LimitCheckResult>> {
    return this.canCreateDocument("invoice");
  }

  async canCreateDocument(kind: DocumentKind): Promise<ServiceResult<LimitCheckResult>> {
    try {
      const usageResult = await this.getUsage();
      if (!usageResult.success || !usageResult.data) {
        return ok({ allowed: false, current: 0, limit: 0, reason: "No autenticado" });
      }

      const { usage, limits, planName } = usageResult.data;
      const documentLimit = evaluateDocumentLimit(kind, usage, limits, planName);
      return ok({
        allowed: documentLimit.allowed,
        current: documentLimit.current,
        limit: documentLimit.limit,
        reason: documentLimit.reason,
      });
    } catch (error) {
      return fail("No se pudo validar limite de facturas", "BILLING_LIMIT_INVOICES_ERROR", error);
    }
  }

  async canScanOCR(): Promise<ServiceResult<LimitCheckResult>> {
    try {
      const usageResult = await this.getUsage();
      if (!usageResult.success || !usageResult.data) {
        return ok({ allowed: false, current: 0, limit: 0, reason: "No autenticado" });
      }

      const { usage, limits, planName } = usageResult.data;
      return ok(checkLimit(usage.ocrMonth, limits.ocrMonth, `Has alcanzado el limite de ${limits.ocrMonth} escaneos/mes del plan ${planName}.`));
    } catch (error) {
      return fail("No se pudo validar limite de OCR", "BILLING_LIMIT_OCR_ERROR", error);
    }
  }

  async recordInvoiceUsage(): Promise<ServiceResult<null>> {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        return fail("No autenticado", "AUTH_REQUIRED");
      }

      const periodStart = await resolvePeriodStart(userId);
      const supabase = getSupabaseClient();
      const { error } = await supabase.rpc("increment_billing_usage", {
        p_period_start: periodStart,
        p_field: "invoices_used",
      });

      if (error) {
        return fail(error.message, error.code, error);
      }

      return ok(null);
    } catch (error) {
      return fail("No se pudo registrar uso de facturas", "BILLING_USAGE_INCREMENT_INVOICES_ERROR", error);
    }
  }

  async recordOCRUsage(): Promise<ServiceResult<null>> {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        return fail("No autenticado", "AUTH_REQUIRED");
      }

      const periodStart = await resolvePeriodStart(userId);
      const supabase = getSupabaseClient();
      const { error } = await supabase.rpc("increment_billing_usage", {
        p_period_start: periodStart,
        p_field: "ocr_scans_used",
      });

      if (error) {
        return fail(error.message, error.code, error);
      }

      return ok(null);
    } catch (error) {
      return fail("No se pudo registrar uso de OCR", "BILLING_USAGE_INCREMENT_OCR_ERROR", error);
    }
  }

  formatLimit(value: number): string {
    if (value === Number.POSITIVE_INFINITY) {
      return "Ilimitado";
    }
    return String(value);
  }
}

export const billingLimitsService = new BillingLimitsServiceImpl();
