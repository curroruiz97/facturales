import { getSupabaseClient } from "../../../services/supabase/client";
import { toast } from "sonner";
import type { AdminUsersResponse, AdminUserDetail } from "../types";

export const AdminUserService = {
  async getUsers(page = 1, perPage = 20, search = "", planFilter = "", sortBy = "created_at", sortDir = "desc"): Promise<AdminUsersResponse | null> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.rpc("admin_get_users", {
        p_page: page, p_per_page: perPage, p_search: search,
        p_plan_filter: planFilter, p_sort_by: sortBy, p_sort_dir: sortDir,
      });
      if (error) { console.error("admin_get_users error:", error.message); return null; }
      return data as unknown as AdminUsersResponse;
    } catch {
      return null;
    }
  },

  async getUserDetail(userId: string): Promise<AdminUserDetail | null> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.rpc("admin_get_user_detail", { p_target_user_id: userId });
      if (error) { console.error("admin_get_user_detail error:", error.message); return null; }
      return data as unknown as AdminUserDetail;
    } catch {
      return null;
    }
  },

  async updateSubscription(userId: string, plan: string): Promise<boolean> {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.rpc("admin_update_subscription", { p_target_user_id: userId, p_plan: plan });
      if (error) { toast.error("Error al actualizar suscripcion: " + error.message); return false; }
      toast.success("Suscripcion actualizada");
      return true;
    } catch {
      toast.error("Error inesperado al actualizar suscripcion");
      return false;
    }
  },

  async suspendUser(userId: string, reason: string): Promise<boolean> {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.rpc("admin_suspend_user", { p_target_user_id: userId, p_reason: reason });
      if (error) { toast.error("Error al suspender usuario: " + error.message); return false; }
      toast.success("Usuario suspendido");
      return true;
    } catch {
      toast.error("Error inesperado al suspender usuario");
      return false;
    }
  },

  async unsuspendUser(userId: string): Promise<boolean> {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.rpc("admin_unsuspend_user", { p_target_user_id: userId });
      if (error) { toast.error("Error al reactivar usuario: " + error.message); return false; }
      toast.success("Usuario reactivado");
      return true;
    } catch {
      toast.error("Error inesperado al reactivar usuario");
      return false;
    }
  },

  async deleteUser(userId: string): Promise<boolean> {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.rpc("admin_delete_user", { p_target_user_id: userId });
      if (error) { toast.error("Error al eliminar usuario: " + error.message); return false; }
      toast.success("Usuario eliminado");
      return true;
    } catch {
      toast.error("Error inesperado al eliminar usuario");
      return false;
    }
  },

  async grantAdmin(userId: string, role = "admin"): Promise<boolean> {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.rpc("admin_grant_admin", { p_target_user_id: userId, p_role: role });
      if (error) { toast.error("Error al asignar admin: " + error.message); return false; }
      toast.success("Rol admin asignado");
      return true;
    } catch {
      toast.error("Error inesperado al asignar admin");
      return false;
    }
  },

  async revokeAdmin(userId: string): Promise<boolean> {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.rpc("admin_revoke_admin", { p_target_user_id: userId });
      if (error) { toast.error("Error al revocar admin: " + error.message); return false; }
      toast.success("Rol admin revocado");
      return true;
    } catch {
      toast.error("Error inesperado al revocar admin");
      return false;
    }
  },
};
