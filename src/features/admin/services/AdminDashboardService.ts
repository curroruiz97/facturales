import { getSupabaseClient } from "../../../services/supabase/client";
import type { AdminDashboardMetrics, AdminOverview } from "../types";

export const AdminDashboardService = {
  async isAdmin(): Promise<boolean> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.rpc("admin_get_role");
      if (error) return false;
      return (data as { is_admin: boolean })?.is_admin === true;
    } catch {
      return false;
    }
  },

  async getAdminRole(): Promise<string | null> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.rpc("admin_get_role");
      if (error) return null;
      return (data as { role: string | null })?.role ?? null;
    } catch {
      return null;
    }
  },

  async getOverview(): Promise<AdminOverview | null> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.rpc("admin_get_overview");
      if (error) { console.error("admin_get_overview error:", error.message); return null; }
      return data as unknown as AdminOverview;
    } catch {
      return null;
    }
  },

  async getDashboardMetrics(): Promise<AdminDashboardMetrics | null> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.rpc("admin_get_dashboard_metrics");
      if (error) { console.error("admin_get_dashboard_metrics error:", error.message); return null; }
      return data as unknown as AdminDashboardMetrics;
    } catch {
      return null;
    }
  },
};
