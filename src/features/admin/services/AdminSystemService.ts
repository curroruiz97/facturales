import { getSupabaseClient } from "../../../services/supabase/client";
import type { AdminSystemHealth } from "../types";

export const AdminSystemService = {
  async getSystemHealth(): Promise<AdminSystemHealth | null> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.rpc("admin_get_system_health");
      if (error) { console.error("admin_get_system_health error:", error.message); return null; }
      return data as unknown as AdminSystemHealth;
    } catch {
      return null;
    }
  },
};
