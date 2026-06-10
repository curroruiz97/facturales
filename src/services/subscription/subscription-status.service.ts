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

function isActiveStatus(status: string | null, cancelAtPeriodEnd: boolean, currentPeriodEnd: string | null): boolean {
  if (status === "trialing" || status === "active") return true;
  if (cancelAtPeriodEnd && currentPeriodEnd) {
    const endDate = new Date(currentPeriodEnd);
    if (!Number.isNaN(endDate.getTime()) && endDate > new Date()) return true;
  }
  return false;
}

class SupabaseSubscriptionStatusService implements SubscriptionStatusService {
  async resolveStatus(): Promise<ServiceResult<SubscriptionStatus>> {
    const userId = await getCurrentUserId();
    if (!userId) {
      return ok({ hasAccess: false, status: null, currentPeriodEnd: null });
    }

    const supabase = getSupabaseClient();

    // 1. Check user's own subscription.
    const { data, error } = await supabase
      .from("billing_subscriptions")
      .select("status, cancel_at_period_end, current_period_end")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return fail(error.message, error.code, error);

    if (data) {
      const status = (data.status as string | null) ?? null;
      const currentPeriodEnd = (data.current_period_end as string | null) ?? null;
      const cancelAtPeriodEnd = Boolean(data.cancel_at_period_end);

      if (isActiveStatus(status, cancelAtPeriodEnd, currentPeriodEnd)) {
        return ok({ hasAccess: true, status, currentPeriodEnd });
      }
      // User has a subscription record but it's expired — fall through to team check.
    }

    // 2. Check if the user is an active team member of an owner with an active subscription.
    const { data: membership, error: memberError } = await supabase
      .from("team_members")
      .select("owner_user_id, status")
      .eq("member_user_id", userId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (!memberError && membership?.owner_user_id) {
      const { data: ownerSub, error: ownerSubError } = await supabase
        .from("billing_subscriptions")
        .select("status, cancel_at_period_end, current_period_end")
        .eq("user_id", membership.owner_user_id as string)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!ownerSubError && ownerSub) {
        const ownerStatus = (ownerSub.status as string | null) ?? null;
        const ownerPeriodEnd = (ownerSub.current_period_end as string | null) ?? null;
        const ownerCancel = Boolean(ownerSub.cancel_at_period_end);

        if (isActiveStatus(ownerStatus, ownerCancel, ownerPeriodEnd)) {
          return ok({ hasAccess: true, status: ownerStatus, currentPeriodEnd: ownerPeriodEnd });
        }
      }
    }

    return ok({
      hasAccess: false,
      status: data ? ((data.status as string | null) ?? null) : null,
      currentPeriodEnd: data ? ((data.current_period_end as string | null) ?? null) : null,
    });
  }
}

export const subscriptionStatusService: SubscriptionStatusService = new SupabaseSubscriptionStatusService();
