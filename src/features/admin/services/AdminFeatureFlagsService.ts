import { getSupabaseClient } from "../../../services/supabase/client";
import { toast } from "sonner";
import type { AdminFeatureFlag } from "../types";

export const AdminFeatureFlagsService = {
  async getFeatureFlags(): Promise<AdminFeatureFlag[] | null> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.rpc("admin_get_feature_flags");
      if (error) { console.error("admin_get_feature_flags error:", error.message); return null; }
      return data as unknown as AdminFeatureFlag[];
    } catch {
      return null;
    }
  },

  async upsertFeatureFlag(key: string, name: string, description = "", enabled = false, rolloutPercentage = 0): Promise<boolean> {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.rpc("admin_upsert_feature_flag", {
        p_key: key, p_name: name, p_description: description,
        p_enabled: enabled, p_rollout_percentage: rolloutPercentage,
      });
      if (error) { toast.error("Error al guardar feature flag: " + error.message); return false; }
      toast.success("Feature flag guardado");
      return true;
    } catch {
      toast.error("Error inesperado al guardar feature flag");
      return false;
    }
  },

  async deleteFeatureFlag(key: string): Promise<boolean> {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.rpc("admin_delete_feature_flag", { p_key: key });
      if (error) { toast.error("Error al eliminar feature flag: " + error.message); return false; }
      toast.success("Feature flag eliminado");
      return true;
    } catch {
      toast.error("Error inesperado al eliminar feature flag");
      return false;
    }
  },
};
