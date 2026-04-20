import { getSupabaseClient } from "../../../services/supabase/client";
import type { AdminRevenueAnalytics } from "../types";

export const AdminFinanceService = {
  async getRevenueAnalytics(months = 12): Promise<AdminRevenueAnalytics | null> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.rpc("admin_get_revenue_analytics", { p_months: months });
      if (error) { console.error("admin_get_revenue_analytics error:", error.message); return null; }
      return data as unknown as AdminRevenueAnalytics;
    } catch {
      return null;
    }
  },
};
