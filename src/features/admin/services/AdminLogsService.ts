import { getSupabaseClient } from "../../../services/supabase/client";
import type { AdminSystemLogsResponse, AdminAuditLogsResponse } from "../types";

export const AdminLogsService = {
  async getSystemLogs(page = 1, perPage = 25, operationFilter = ""): Promise<AdminSystemLogsResponse | null> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.rpc("admin_get_system_logs", {
        p_page: page, p_per_page: perPage, p_operation_filter: operationFilter,
      });
      if (error) { console.error("admin_get_system_logs error:", error.message); return null; }
      return data as unknown as AdminSystemLogsResponse;
    } catch {
      return null;
    }
  },

  async getAuditLogs(page = 1, perPage = 25, actionFilter = "", search = ""): Promise<AdminAuditLogsResponse | null> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.rpc("admin_get_audit_logs", {
        p_page: page, p_per_page: perPage, p_action_filter: actionFilter, p_search: search,
      });
      if (error) { console.error("admin_get_audit_logs error:", error.message); return null; }
      return data as unknown as AdminAuditLogsResponse;
    } catch {
      return null;
    }
  },
};
