import type { BillingInterval, BillingPlan, BillingUsageSnapshot } from "../../shared/types/domain";
import { fail, ok, type ServiceResult } from "../../shared/types/service-result";
import { billingLimitsService } from "../billing-limits/billing-limits.service";
import { getCurrentUserId, getSupabaseClient } from "../supabase/client";

export interface BillingPaymentMethod {
  type: string;
  brand: string | null;
  last4: string | null;
  expMonth: number | null;
  expYear: number | null;
}

export interface SubscriptionSnapshot {
  plan: BillingPlan;
  interval: BillingInterval;
  status: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  pendingDowngradePlan: BillingPlan | null;
  pendingDowngradeInterval: BillingInterval | null;
  usage: BillingUsageSnapshot | null;
  paymentMethod: BillingPaymentMethod | null;
}

interface CheckoutResponse {
  url?: string | null;
}

interface UpdateSubscriptionResponse {
  success?: boolean;
  type?: "upgrade" | "downgrade";
  plan?: string;
  new_plan?: string;
  current_plan?: string;
  period_end?: string | null;
}

interface CancelSubscriptionResponse {
  success?: boolean;
  current_period_end?: string | null;
}

interface ReactivateSubscriptionResponse {
  success?: boolean;
}

interface PaymentMethodResponse {
  payment_method?: {
    type?: string;
    brand?: string | null;
    last4?: string | null;
    exp_month?: number | null;
    exp_year?: number | null;
  } | null;
}

export interface SubscriptionManagementService {
  getSnapshot(): Promise<ServiceResult<SubscriptionSnapshot>>;
  createCheckoutSession(plan: Exclude<BillingPlan, "none">, interval: BillingInterval): Promise<ServiceResult<{ url: string }>>;
  changePlan(plan: Exclude<BillingPlan, "none">, interval: BillingInterval): Promise<ServiceResult<UpdateSubscriptionResponse>>;
  cancel(): Promise<ServiceResult<CancelSubscriptionResponse>>;
  reactivate(): Promise<ServiceResult<ReactivateSubscriptionResponse>>;
  openPaymentMethodSession(): Promise<ServiceResult<{ url: string }>>;
}

function normalizePlan(value: unknown): BillingPlan {
  if (value === "starter" || value === "pro" || value === "business") return value;
  return "none";
}

function normalizeInterval(value: unknown): BillingInterval {
  if (value === "monthly" || value === "yearly") return value;
  return "monthly";
}

function isEdgeFailurePayload(value: unknown): value is { error: string } {
  return typeof value === "object" && value !== null && "error" in value && typeof (value as { error?: unknown }).error === "string";
}

class SupabaseSubscriptionManagementService implements SubscriptionManagementService {
  private async invokeEdge<TResponse>(name: string, body?: Record<string, unknown>): Promise<ServiceResult<TResponse>> {
    try {
      const supabase = getSupabaseClient();
      const result = await supabase.functions.invoke(name, body ? { body } : undefined);

      if (result.error) {
        return fail(result.error.message, result.error.name, result.error);
      }
      if (isEdgeFailurePayload(result.data)) {
        return fail(result.data.error, "EDGE_FUNCTION_ERROR", result.data);
      }

      return ok((result.data ?? {}) as TResponse);
    } catch (error) {
      return fail(`No se pudo ejecutar ${name}.`, "EDGE_FUNCTION_INVOKE_ERROR", error);
    }
  }

  async getSnapshot(): Promise<ServiceResult<SubscriptionSnapshot>> {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        return fail("No autenticado.", "AUTH_REQUIRED");
      }

      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("billing_subscriptions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        return fail(error.message, error.code, error);
      }

      const usageResult = await billingLimitsService.getUsage();
      const usage = usageResult.success ? usageResult.data : null;

      const paymentMethodResult = await this.invokeEdge<PaymentMethodResponse>("get-payment-method");
      const paymentMethod = paymentMethodResult.success
        ? paymentMethodResult.data.payment_method
          ? {
              type: String(paymentMethodResult.data.payment_method.type ?? "card"),
              brand: paymentMethodResult.data.payment_method.brand ?? null,
              last4: paymentMethodResult.data.payment_method.last4 ?? null,
              expMonth: paymentMethodResult.data.payment_method.exp_month ?? null,
              expYear: paymentMethodResult.data.payment_method.exp_year ?? null,
            }
          : null
        : null;

      if (!data) {
        return ok({
          plan: usage?.plan ?? "none",
          interval: "monthly",
          status: null,
          currentPeriodStart: null,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
          pendingDowngradePlan: null,
          pendingDowngradeInterval: null,
          usage,
          paymentMethod,
        });
      }

      const row = data as Record<string, unknown>;
      return ok({
        plan: normalizePlan(row.plan),
        interval: normalizeInterval(row.interval),
        status: (row.status as string | null) ?? null,
        currentPeriodStart: (row.current_period_start as string | null) ?? null,
        currentPeriodEnd: (row.current_period_end as string | null) ?? null,
        cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
        pendingDowngradePlan: normalizePlan(row.pending_downgrade_plan),
        pendingDowngradeInterval: normalizeInterval(row.pending_downgrade_interval),
        usage,
        paymentMethod,
      });
    } catch (error) {
      return fail("No se pudo cargar la suscripcion.", "SUBSCRIPTION_SNAPSHOT_ERROR", error);
    }
  }

  async createCheckoutSession(plan: Exclude<BillingPlan, "none">, interval: BillingInterval): Promise<ServiceResult<{ url: string }>> {
    const result = await this.invokeEdge<CheckoutResponse>("create-checkout-session", { plan, interval });
    if (!result.success) return result;

    const url = result.data.url ?? null;
    if (!url) {
      return fail("No se pudo generar la sesión de pago.", "CHECKOUT_URL_MISSING");
    }
    return ok({ url });
  }

  async changePlan(plan: Exclude<BillingPlan, "none">, interval: BillingInterval): Promise<ServiceResult<UpdateSubscriptionResponse>> {
    return this.invokeEdge<UpdateSubscriptionResponse>("update-subscription", { new_plan: plan, new_interval: interval });
  }

  async cancel(): Promise<ServiceResult<CancelSubscriptionResponse>> {
    return this.invokeEdge<CancelSubscriptionResponse>("cancel-subscription", {});
  }

  async reactivate(): Promise<ServiceResult<ReactivateSubscriptionResponse>> {
    return this.invokeEdge<ReactivateSubscriptionResponse>("reactivate-subscription", {});
  }

  async openPaymentMethodSession(): Promise<ServiceResult<{ url: string }>> {
    const result = await this.invokeEdge<CheckoutResponse>("update-payment-method", {});
    if (!result.success) return result;

    const url = result.data.url ?? null;
    if (!url) {
      return fail("No se pudo abrir el flujo de metodo de pago.", "PAYMENT_METHOD_URL_MISSING");
    }
    return ok({ url });
  }
}

export const subscriptionManagementService: SubscriptionManagementService = new SupabaseSubscriptionManagementService();

