import { getRawAuthUserId, getSupabaseClient } from "../supabase/client";
import { fail, ok, type ServiceResult } from "../../shared/types/service-result";

export type TeamMemberRole = "propietario" | "gestor" | "lector";
export type TeamMemberStatus = "invited" | "active" | "revoked";

export interface TeamMemberRecord {
  id: string;
  name: string;
  email: string;
  role: TeamMemberRole;
  status: TeamMemberStatus;
  memberUserId: string | null;
  invitedAt: string | null;
}

export interface TeamMemberInput {
  name: string;
  email: string;
  role: TeamMemberRole;
}

function mapRow(row: Record<string, unknown>): TeamMemberRecord {
  return {
    id: String(row.id ?? ""),
    name: String(row.name ?? ""),
    email: String(row.email ?? ""),
    role: (row.role as TeamMemberRole | undefined) ?? "gestor",
    status: (row.status as TeamMemberStatus | undefined) ?? "invited",
    memberUserId: (row.member_user_id as string | null) ?? null,
    invitedAt: (row.invited_at as string | null) ?? null,
  };
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export interface TeamService {
  listMine(): Promise<ServiceResult<TeamMemberRecord[]>>;
  invite(input: TeamMemberInput): Promise<ServiceResult<TeamMemberRecord>>;
  updateRole(id: string, role: TeamMemberRole): Promise<ServiceResult<void>>;
  remove(id: string): Promise<ServiceResult<void>>;
}

class SupabaseTeamService implements TeamService {
  async listMine(): Promise<ServiceResult<TeamMemberRecord[]>> {
    const userId = await getRawAuthUserId();
    if (!userId) return ok([]);

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("team_members")
      .select("*")
      .eq("owner_user_id", userId)
      .order("invited_at", { ascending: true });

    if (error) return fail(error.message, error.code, error);
    const rows = Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
    return ok(rows.map(mapRow));
  }

  async invite(input: TeamMemberInput): Promise<ServiceResult<TeamMemberRecord>> {
    const userId = await getRawAuthUserId();
    if (!userId) return fail("No autenticado", "AUTH_REQUIRED");

    const name = input.name.trim();
    const email = normalizeEmail(input.email);
    if (!name || !email) return fail("Nombre y email son obligatorios", "VALIDATION_REQUIRED_FIELDS");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("Email no válido", "VALIDATION_EMAIL");

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("team_members")
      .insert({ owner_user_id: userId, name, email, role: input.role, status: "invited" })
      .select("*")
      .single();

    if (error) {
      // 23505 = unique_violation (email ya invitado en este equipo).
      if (error.code === "23505") return fail("Ya existe un usuario con ese email.", "DUPLICATE_EMAIL", error);
      return fail(error.message, error.code, error);
    }
    return ok(mapRow(data as Record<string, unknown>));
  }

  async updateRole(id: string, role: TeamMemberRole): Promise<ServiceResult<void>> {
    const userId = await getRawAuthUserId();
    if (!userId) return fail("No autenticado", "AUTH_REQUIRED");

    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("team_members")
      .update({ role })
      .eq("id", id)
      .eq("owner_user_id", userId);

    if (error) return fail(error.message, error.code, error);
    return ok(undefined);
  }

  async remove(id: string): Promise<ServiceResult<void>> {
    const userId = await getRawAuthUserId();
    if (!userId) return fail("No autenticado", "AUTH_REQUIRED");

    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("team_members")
      .delete()
      .eq("id", id)
      .eq("owner_user_id", userId);

    if (error) return fail(error.message, error.code, error);
    return ok(undefined);
  }
}

export const teamService: TeamService = new SupabaseTeamService();
