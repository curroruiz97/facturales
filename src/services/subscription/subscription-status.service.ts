import { getCurrentUserId, getSupabaseClient } from "../supabase/client";
import { fail, ok, type ServiceResult } from "../../shared/types/service-result";

export interface SubscriptionStatus {
  hasAccess: boolean;
  status: string | null;
  currentPeriodEnd: string | null;
}

export interface SubscriptionStatusService {
  resolveStatus(): Promise<ServiceResult<SubscriptionStatus>>;
}

class SupabaseSubscriptionStatusService implements SubscriptionStatusService {
  async resolveStatus(): Promise<ServiceResult<SubscriptionStatus>> {
    const userId = await getCurrentUserId();
    if (!userId) {
      return ok({
        hasAccess: false,
        status: null,
        currentPeriodEnd: null,
      });
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("billing_subscriptions")
      .select("status, cancel_at_period_end, current_period_end")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return fail(error.message, error.code, error);
    }

    if (!data) {
      return ok({
        hasAccess: false,
        status: null,
        currentPeriodEnd: null,
      });
    }

    const status = (data.status as string | null) ?? null;
    const currentPeriodEnd = (data.current_period_end as string | null) ?? null;
    const cancelAtPeriodEnd = Boolean(data.cancel_at_period_end);

    if (status === "trialing" || status === "active") {
      return ok({
        hasAccess: true,
        status,
        currentPeriodEnd,
      });
    }

    if (cancelAtPeriodEnd && currentPeriodEnd) {
      const endDate = new Date(currentPeriodEnd);
      if (!Number.isNaN(endDate.getTime()) && endDate > new Date()) {
        return ok({
          hasAccess: true,
          status,
          currentPeriodEnd,
        });
      }
    }

    return ok({
      hasAccess: false,
      status,
      currentPeriodEnd,
    });
  }
}

export const subscriptionStatusService: SubscriptionStatusService = new SupabaseSubscriptionStatusService();

