import { getSupabaseClient } from "../../../services/supabase/client";
import { toast } from "sonner";
import type { AdminConfigEntry } from "../types";

export const AdminConfigService = {
  async getConfig(): Promise<AdminConfigEntry[] | null> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.rpc("admin_get_config");
      if (error) { console.error("admin_get_config error:", error.message); return null; }
      return data as unknown as AdminConfigEntry[];
    } catch {
      return null;
    }
  },

  async updateConfig(key: string, value: unknown): Promise<boolean> {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.rpc("admin_update_config", { p_key: key, p_value: value });
      if (error) { toast.error("Error al actualizar config: " + error.message); return false; }
      toast.success("Configuracion actualizada");
      return true;
    } catch {
      toast.error("Error inesperado al actualizar config");
      return false;
    }
  },
};
