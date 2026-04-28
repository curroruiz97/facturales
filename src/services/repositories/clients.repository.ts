import { getCurrentUserId, getSupabaseClient } from "../supabase/client";
import type { Client } from "../../shared/types/domain";
import { fail, ok, type ServiceResult } from "../../shared/types/service-result";

export interface CreateClientInput {
  nombreRazonSocial: string;
  identificador: string;
  tipoCliente?: "autonomo" | "empresa";
  email?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  codigoPostal?: string | null;
  ciudad?: string | null;
  provincia?: string | null;
  pais?: string | null;
  diaFacturacion?: number | null;
  estado?: "activo" | "inactivo" | "recurrente" | "puntual";
}

export type UpdateClientInput = Partial<CreateClientInput>;

export interface ClientsRepository {
  create(input: CreateClientInput): Promise<ServiceResult<Client>>;
  list(searchTerm?: string): Promise<ServiceResult<Client[]>>;
  getById(clientId: string): Promise<ServiceResult<Client | null>>;
  update(clientId: string, input: UpdateClientInput): Promise<ServiceResult<Client>>;
  remove(clientId: string): Promise<ServiceResult<null>>;
  findByLegacyIdentifier(identifier: string): Promise<ServiceResult<Client | null>>;
}

interface ClientRow {
  id: string;
  user_id: string;
  nombre_razon_social: string;
  identificador: string;
  tipo_cliente: "autonomo" | "empresa";
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  codigo_postal: string | null;
  ciudad: string | null;
  provincia: string | null;
  pais: string | null;
  dia_facturacion: number | null;
  estado: "activo" | "inactivo" | "recurrente" | "puntual";
  created_at: string;
  updated_at: string;
}

function mapClientRow(row: ClientRow): Client {
  return {
    id: row.id,
    userId: row.user_id,
    nombreRazonSocial: row.nombre_razon_social,
    identificador: row.identificador,
    tipoCliente: row.tipo_cliente,
    email: row.email,
    telefono: row.telefono,
    direccion: row.direccion,
    codigoPostal: row.codigo_postal,
    ciudad: row.ciudad,
    provincia: row.provincia,
    pais: row.pais,
    diaFacturacion: row.dia_facturacion,
    estado: row.estado,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeCreateInput(input: CreateClientInput, userId: string): Record<string, unknown> {
  return {
    user_id: userId,
    nombre_razon_social: input.nombreRazonSocial.trim(),
    identificador: input.identificador.trim().toUpperCase(),
    tipo_cliente: input.tipoCliente ?? "autonomo",
    email: input.email?.trim() ?? null,
    telefono: input.telefono?.trim() ?? null,
    direccion: input.direccion?.trim() ?? null,
    codigo_postal: input.codigoPostal?.trim() ?? null,
    ciudad: input.ciudad?.trim() ?? null,
    provincia: input.provincia?.trim() ?? null,
    pais: input.pais?.trim() ?? null,
    dia_facturacion: input.diaFacturacion ?? null,
    estado: input.estado ?? "recurrente",
  };
}

function normalizeUpdateInput(input: UpdateClientInput): Record<string, unknown> {
  const data: Record<string, unknown> = {};

  if (input.nombreRazonSocial !== undefined) data.nombre_razon_social = input.nombreRazonSocial?.trim();
  if (input.identificador !== undefined) data.identificador = input.identificador?.trim().toUpperCase();
  if (input.tipoCliente !== undefined) data.tipo_cliente = input.tipoCliente;
  if (input.email !== undefined) data.email = input.email?.trim() ?? null;
  if (input.telefono !== undefined) data.telefono = input.telefono?.trim() ?? null;
  if (input.direccion !== undefined) data.direccion = input.direccion?.trim() ?? null;
  if (input.codigoPostal !== undefined) data.codigo_postal = input.codigoPostal?.trim() ?? null;
  if (input.ciudad !== undefined) data.ciudad = input.ciudad?.trim() ?? null;
  if (input.provincia !== undefined) data.provincia = input.provincia?.trim() ?? null;
  if (input.pais !== undefined) data.pais = input.pais?.trim() ?? null;
  if (input.diaFacturacion !== undefined) data.dia_facturacion = input.diaFacturacion ?? null;
  if (input.estado !== undefined) data.estado = input.estado;

  return data;
}

/**
 * Sanitize a search term for use in Supabase PostgREST `.or()` filters.
 * Strips characters that could break filter syntax or enable injection:
 * commas (field separator), parentheses (group delimiter), percent (wildcard).
 */
function sanitizeFilterValue(value: string): string {
  return value.replace(/[%,().\\]/g, "").trim();
}

export class SupabaseClientsRepository implements ClientsRepository {
  async create(input: CreateClientInput): Promise<ServiceResult<Client>> {
    try {
      if (!input.nombreRazonSocial?.trim()) return fail("El nombre o razon social es obligatorio", "VALIDATION_CLIENT_NAME_REQUIRED");
      if (!input.identificador?.trim()) return fail("El identificador es obligatorio", "VALIDATION_CLIENT_IDENTIFIER_REQUIRED");

      const userId = await getCurrentUserId();
      if (!userId) return fail("Usuario no autenticado", "AUTH_REQUIRED");

      const supabase = getSupabaseClient();
      const payload = normalizeCreateInput(input, userId);
      const { data, error } = await supabase.from("clientes").insert([payload]).select("*").single();
      if (error || !data) {
        if (error?.code === "23505") return fail("Ya existe un contacto con ese NIF/CIF.", "CLIENTS_DUPLICATE_IDENTIFIER", error);
        return fail(error?.message ?? "No se pudo crear cliente", error?.code, error);
      }
      return ok(mapClientRow(data as ClientRow));
    } catch (error) {
      return fail("No se pudo crear cliente", "CLIENTS_CREATE_ERROR", error);
    }
  }

  async list(searchTerm = ""): Promise<ServiceResult<Client[]>> {
    try {
      const userId = await getCurrentUserId();
      if (!userId) return ok([]);

      const supabase = getSupabaseClient();
      let query = supabase
        .from("clientes")
        .select("*")
        .eq("user_id", userId)
        .order("nombre_razon_social", { ascending: true });

      if (searchTerm.trim()) {
        const normalizedSearch = sanitizeFilterValue(searchTerm);
        if (normalizedSearch) {
          query = query.or(
            `nombre_razon_social.ilike.%${normalizedSearch}%,identificador.ilike.%${normalizedSearch}%,email.ilike.%${normalizedSearch}%`,
          );
        }
      }

      const { data, error } = await query;
      if (error) return fail(error.message, error.code, error);
      return ok((data ?? []).map((row) => mapClientRow(row as ClientRow)));
    } catch (error) {
      return fail("No se pudo obtener clientes", "CLIENTS_LIST_ERROR", error);
    }
  }

  async getById(clientId: string): Promise<ServiceResult<Client | null>> {
    try {
      if (!clientId) return fail("ID de cliente obligatorio", "VALIDATION_CLIENT_ID_REQUIRED");

      const userId = await getCurrentUserId();
      if (!userId) return ok(null);

      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .eq("user_id", userId)
        .eq("id", clientId)
        .maybeSingle();

      if (error) return fail(error.message, error.code, error);
      return ok(data ? mapClientRow(data as ClientRow) : null);
    } catch (error) {
      return fail("No se pudo obtener cliente", "CLIENTS_GET_BY_ID_ERROR", error);
    }
  }

  async update(clientId: string, input: UpdateClientInput): Promise<ServiceResult<Client>> {
    try {
      if (!clientId) return fail("ID de cliente obligatorio", "VALIDATION_CLIENT_ID_REQUIRED");
      const userId = await getCurrentUserId();
      if (!userId) return fail("Usuario no autenticado", "AUTH_REQUIRED");

      const supabase = getSupabaseClient();
      const payload = normalizeUpdateInput(input);
      const { data, error } = await supabase
        .from("clientes")
        .update(payload)
        .eq("id", clientId)
        .eq("user_id", userId)
        .select("*")
        .single();
      if (error || !data) {
        if (error?.code === "23505") return fail("Ya existe un contacto con ese NIF/CIF.", "CLIENTS_DUPLICATE_IDENTIFIER", error);
        return fail(error?.message ?? "No se pudo actualizar cliente", error?.code, error);
      }
      return ok(mapClientRow(data as ClientRow));
    } catch (error) {
      return fail("No se pudo actualizar cliente", "CLIENTS_UPDATE_ERROR", error);
    }
  }

  async remove(clientId: string): Promise<ServiceResult<null>> {
    try {
      if (!clientId) return fail("ID de cliente obligatorio", "VALIDATION_CLIENT_ID_REQUIRED");
      const userId = await getCurrentUserId();
      if (!userId) return fail("Usuario no autenticado", "AUTH_REQUIRED");

      const supabase = getSupabaseClient();
      const { error } = await supabase.from("clientes").delete().eq("id", clientId).eq("user_id", userId);
      if (error) return fail(error.message, error.code, error);
      return ok(null);
    } catch (error) {
      return fail("No se pudo eliminar cliente", "CLIENTS_REMOVE_ERROR", error);
    }
  }

  async findByLegacyIdentifier(identifier: string): Promise<ServiceResult<Client | null>> {
    try {
      if (!identifier.trim()) return ok(null);

      const userId = await getCurrentUserId();
      if (!userId) return ok(null);

      const normalized = identifier.trim().toUpperCase();
      const sanitized = sanitizeFilterValue(identifier);
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .eq("user_id", userId)
        .or(`identificador.eq.${normalized},nombre_razon_social.ilike.%${sanitized}%`)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) return fail(error.message, error.code, error);
      return ok(data ? mapClientRow(data as ClientRow) : null);
    } catch (error) {
      return fail("No se pudo resolver cliente legacy", "CLIENTS_LEGACY_LOOKUP_ERROR", error);
    }
  }
}

export const clientsRepository = new SupabaseClientsRepository();
