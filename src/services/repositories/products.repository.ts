import { getCurrentUserId, getSupabaseClient } from "../supabase/client";
import type { Product } from "../../shared/types/domain";
import { fail, ok, type ServiceResult } from "../../shared/types/service-result";

export interface CreateProductInput {
  nombre: string;
  referencia?: string | null;
  descripcion?: string | null;
  precioCompra?: number | null;
  precioVenta: number;
  impuesto?: string;
  descuento?: number;
}

export type UpdateProductInput = Partial<CreateProductInput>;

export interface ProductsRepository {
  create(input: CreateProductInput): Promise<ServiceResult<Product>>;
  list(searchTerm?: string): Promise<ServiceResult<Product[]>>;
  getById(productId: string): Promise<ServiceResult<Product | null>>;
  update(productId: string, input: UpdateProductInput): Promise<ServiceResult<Product>>;
  remove(productId: string): Promise<ServiceResult<null>>;
}

interface ProductRow {
  id: string;
  user_id: string;
  nombre: string;
  referencia: string | null;
  descripcion: string | null;
  precio_compra: number | null;
  precio_venta: number;
  impuesto: string;
  descuento: number;
  created_at: string;
  updated_at: string;
}

function mapProductRow(row: ProductRow): Product {
  return {
    id: row.id,
    userId: row.user_id,
    nombre: row.nombre,
    referencia: row.referencia,
    descripcion: row.descripcion,
    precioCompra: row.precio_compra,
    precioVenta: Number(row.precio_venta),
    impuesto: row.impuesto,
    descuento: Number(row.descuento ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeCreateInput(input: CreateProductInput, userId: string): Record<string, unknown> {
  return {
    user_id: userId,
    nombre: input.nombre.trim(),
    referencia: input.referencia?.trim() ?? null,
    descripcion: input.descripcion?.trim() ?? null,
    precio_compra: input.precioCompra ?? null,
    precio_venta: Number(input.precioVenta),
    impuesto: input.impuesto ?? "IVA_21",
    descuento: Number(input.descuento ?? 0),
  };
}

function normalizeUpdateInput(input: UpdateProductInput): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  if (input.nombre !== undefined) payload.nombre = input.nombre?.trim();
  if (input.referencia !== undefined) payload.referencia = input.referencia?.trim() ?? null;
  if (input.descripcion !== undefined) payload.descripcion = input.descripcion?.trim() ?? null;
  if (input.precioCompra !== undefined) payload.precio_compra = input.precioCompra ?? null;
  if (input.precioVenta !== undefined) payload.precio_venta = Number(input.precioVenta);
  if (input.impuesto !== undefined) payload.impuesto = input.impuesto;
  if (input.descuento !== undefined) payload.descuento = Number(input.descuento);
  return payload;
}

/**
 * Sanitize a search term for use in Supabase PostgREST `.or()` filters.
 * Strips characters that could break filter syntax or enable injection.
 */
function sanitizeFilterValue(value: string): string {
  return value.replace(/[%,().\\]/g, "").trim();
}

export class SupabaseProductsRepository implements ProductsRepository {
  async create(input: CreateProductInput): Promise<ServiceResult<Product>> {
    try {
      if (!input.nombre?.trim()) return fail("El nombre del producto es obligatorio", "VALIDATION_PRODUCT_NAME_REQUIRED");
      if (input.precioVenta === undefined || Number(input.precioVenta) < 0) {
        return fail("El precio de venta es obligatorio", "VALIDATION_PRODUCT_PRICE_REQUIRED");
      }

      const userId = await getCurrentUserId();
      if (!userId) return fail("Usuario no autenticado", "AUTH_REQUIRED");

      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("productos")
        .insert([normalizeCreateInput(input, userId)])
        .select("*")
        .single();

      if (error || !data) return fail(error?.message ?? "No se pudo crear producto", error?.code, error);
      return ok(mapProductRow(data as ProductRow));
    } catch (error) {
      return fail("No se pudo crear producto", "PRODUCTS_CREATE_ERROR", error);
    }
  }

  async list(searchTerm = ""): Promise<ServiceResult<Product[]>> {
    try {
      const userId = await getCurrentUserId();
      if (!userId) return ok([]);

      const supabase = getSupabaseClient();
      let query = supabase.from("productos").select("*").eq("user_id", userId).order("created_at", { ascending: false });
      if (searchTerm.trim()) {
        const sanitized = sanitizeFilterValue(searchTerm);
        if (sanitized) {
          query = query.or(`nombre.ilike.%${sanitized}%,referencia.ilike.%${sanitized}%`);
        }
      }

      const { data, error } = await query;
      if (error) return fail(error.message, error.code, error);
      return ok((data ?? []).map((row) => mapProductRow(row as ProductRow)));
    } catch (error) {
      return fail("No se pudo listar productos", "PRODUCTS_LIST_ERROR", error);
    }
  }

  async getById(productId: string): Promise<ServiceResult<Product | null>> {
    try {
      if (!productId) return fail("ID de producto obligatorio", "VALIDATION_PRODUCT_ID_REQUIRED");

      const userId = await getCurrentUserId();
      if (!userId) return ok(null);

      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("productos")
        .select("*")
        .eq("user_id", userId)
        .eq("id", productId)
        .maybeSingle();

      if (error) return fail(error.message, error.code, error);
      return ok(data ? mapProductRow(data as ProductRow) : null);
    } catch (error) {
      return fail("No se pudo obtener producto", "PRODUCTS_GET_BY_ID_ERROR", error);
    }
  }

  async update(productId: string, input: UpdateProductInput): Promise<ServiceResult<Product>> {
    try {
      if (!productId) return fail("ID de producto obligatorio", "VALIDATION_PRODUCT_ID_REQUIRED");
      const userId = await getCurrentUserId();
      if (!userId) return fail("Usuario no autenticado", "AUTH_REQUIRED");

      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("productos")
        .update(normalizeUpdateInput(input))
        .eq("id", productId)
        .eq("user_id", userId)
        .select("*")
        .single();

      if (error || !data) return fail(error?.message ?? "No se pudo actualizar producto", error?.code, error);
      return ok(mapProductRow(data as ProductRow));
    } catch (error) {
      return fail("No se pudo actualizar producto", "PRODUCTS_UPDATE_ERROR", error);
    }
  }

  async remove(productId: string): Promise<ServiceResult<null>> {
    try {
      if (!productId) return fail("ID de producto obligatorio", "VALIDATION_PRODUCT_ID_REQUIRED");
      const userId = await getCurrentUserId();
      if (!userId) return fail("Usuario no autenticado", "AUTH_REQUIRED");

      const supabase = getSupabaseClient();
      const { error } = await supabase.from("productos").delete().eq("id", productId).eq("user_id", userId);
      if (error) return fail(error.message, error.code, error);
      return ok(null);
    } catch (error) {
      return fail("No se pudo eliminar producto", "PRODUCTS_REMOVE_ERROR", error);
    }
  }
}

export const productsRepository = new SupabaseProductsRepository();
