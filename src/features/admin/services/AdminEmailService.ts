import { getSupabaseClient } from "../../../services/supabase/client";
import type { AdminEmailAnalytics } from "../types";

export const AdminEmailService = {
  async getEmailAnalytics(days = 30): Promise<AdminEmailAnalytics | null> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.rpc("admin_get_email_analytics", { p_days: days });
      if (error) { console.error("admin_get_email_analytics error:", error.message); return null; }
      return data as unknown as AdminEmailAnalytics;
    } catch {
      return null;
    }
  },
};
