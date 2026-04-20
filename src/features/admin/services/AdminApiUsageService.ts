import { getSupabaseClient } from "../../../services/supabase/client";
import type { AdminApiUsage } from "../types";

export const AdminApiUsageService = {
  async getApiUsage(days = 30): Promise<AdminApiUsage | null> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.rpc("admin_get_api_usage", { p_days: days });
      if (error) { console.error("admin_get_api_usage error:", error.message); return null; }
      return data as unknown as AdminApiUsage;
    } catch {
      return null;
    }
  },
};
