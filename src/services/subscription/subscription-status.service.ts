import { getRawAuthUserId, getSupabaseClient, setEffectiveUserId } from "../supabase/client";
import { fail, ok, type ServiceResult } from "../../shared/types/service-result";

export interface SubscriptionStatus {
  hasAccess: boolean;
  status: string | null;
  currentPeriodEnd: string | null;
  effectiveUserId: string | null;
  via: "own" | "team" | "none";
}

export interface SubscriptionStatusService {
  resolveStatus(): Promise<ServiceResult<SubscriptionStatus>>;
}

class SupabaseSubscriptionStatusService implements SubscriptionStatusService {
  async resolveStatus(): Promise<ServiceResult<SubscriptionStatus>> {
    const userId = await getRawAuthUserId();
    if (!userId) {
      return ok({ hasAccess: false, status: null, currentPeriodEnd: null, effectiveUserId: null, via: "none" });
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc("resolve_subscription_access");

    if (error) {
      return this.fallbackResolve(userId);
    }

    const result = data as Record<string, unknown> | null;
    if (!result) {
      setEffectiveUserId(userId);
      return ok({ hasAccess: false, status: null, currentPeriodEnd: null, effectiveUserId: userId, via: "none" });
    }

    const effectiveUserId = (result.effective_user_id as string | undefined) ?? userId;
    // Cache the effective user ID so all data services use the owner's ID.
    setEffectiveUserId(effectiveUserId);

    return ok({
      hasAccess: Boolean(result.has_access),
      status: (result.status as string | undefined) ?? null,
      currentPeriodEnd: (result.current_period_end as string | undefined) ?? null,
      effectiveUserId,
      via: (result.via as "own" | "team" | "none" | undefined) ?? "none",
    });
  }

  private async fallbackResolve(userId: string): Promise<ServiceResult<SubscriptionStatus>> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("billing_subscriptions")
      .select("status, cancel_at_period_end, current_period_end")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return fail(error.message, error.code, error);
    if (!data) {
      setEffectiveUserId(userId);
      return ok({ hasAccess: false, status: null, currentPeriodEnd: null, effectiveUserId: userId, via: "none" });
    }

    const status = (data.status as string | null) ?? null;
    const currentPeriodEnd = (data.current_period_end as string | null) ?? null;
    const cancelAtPeriodEnd = Boolean(data.cancel_at_period_end);
    const hasAccess = status === "trialing" || status === "active" ||
      (cancelAtPeriodEnd && currentPeriodEnd != null && new Date(currentPeriodEnd) > new Date());

    setEffectiveUserId(userId);
    return ok({ hasAccess, status, currentPeriodEnd, effectiveUserId: userId, via: hasAccess ? "own" : "none" });
  }
}

export const subscriptionStatusService: SubscriptionStatusService = new SupabaseSubscriptionStatusService();
