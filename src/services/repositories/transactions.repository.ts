import { getCurrentUserId, getSupabaseClient } from "../supabase/client";
import type { Transaction, TransactionCategory, TransactionType } from "../../shared/types/domain";
import { fail, ok, type ServiceResult } from "../../shared/types/service-result";

export interface CreateTransactionInput {
  clienteId?: string | null;
  importe: number;
  concepto: string;
  fecha: string;
  categoria: TransactionCategory;
  tipo: TransactionType;
  observaciones?: string | null;
  ivaPorcentaje?: number | null;
  irpfPorcentaje?: number | null;
  invoiceId?: string | null;
}

export type UpdateTransactionInput = Partial<CreateTransactionInput>;

export interface TransactionFilters {
  search?: string;
  minAmount?: number;
  maxAmount?: number;
  startDate?: string;
  endDate?: string;
  tipo?: TransactionType;
  categoria?: TransactionCategory;
}

export interface FiscalExpenseRow {
  importe: number;
  ivaPorcentaje: number | null;
}

export interface TransactionsRepository {
  create(input: CreateTransactionInput): Promise<ServiceResult<Transaction>>;
  list(filters?: TransactionFilters): Promise<ServiceResult<Transaction[]>>;
  getById(transactionId: string): Promise<ServiceResult<Transaction | null>>;
  update(transactionId: string, input: UpdateTransactionInput): Promise<ServiceResult<Transaction>>;
  remove(transactionId: string): Promise<ServiceResult<null>>;
  listFiscalExpenses(startDate: string, endDate: string): Promise<ServiceResult<FiscalExpenseRow[]>>;
}

interface TransactionRow {
  id: string;
  user_id: string;
  cliente_id: string | null;
  importe: number;
  concepto: string;
  fecha: string;
  categoria: TransactionCategory;
  tipo: TransactionType;
  observaciones: string | null;
  iva_porcentaje: number | null;
  irpf_porcentaje: number | null;
  invoice_id: string | null;
  created_at: string;
  updated_at: string;
}

function mapTransactionRow(row: TransactionRow): Transaction {
  return {
    id: row.id,
    userId: row.user_id,
    clienteId: row.cliente_id,
    importe: Number(row.importe),
    concepto: row.concepto,
    fecha: row.fecha,
    categoria: row.categoria,
    tipo: row.tipo,
    observaciones: row.observaciones,
    ivaPorcentaje: row.iva_porcentaje,
    irpfPorcentaje: row.irpf_porcentaje,
    invoiceId: row.invoice_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeCreateInput(input: CreateTransactionInput, userId: string): Record<string, unknown> {
  return {
    user_id: userId,
    cliente_id: input.clienteId ?? null,
    importe: Number(input.importe),
    concepto: input.concepto.trim(),
    fecha: input.fecha,
    categoria: input.categoria,
    tipo: input.tipo,
    observaciones: input.observaciones?.trim() ?? null,
    iva_porcentaje: input.ivaPorcentaje ?? null,
    irpf_porcentaje: input.irpfPorcentaje ?? null,
    invoice_id: input.invoiceId ?? null,
  };
}

function normalizeUpdateInput(input: UpdateTransactionInput): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  if (input.clienteId !== undefined) payload.cliente_id = input.clienteId ?? null;
  if (input.importe !== undefined) payload.importe = Number(input.importe);
  if (input.concepto !== undefined) payload.concepto = input.concepto?.trim();
  if (input.fecha !== undefined) payload.fecha = input.fecha;
  if (input.categoria !== undefined) payload.categoria = input.categoria;
  if (input.tipo !== undefined) payload.tipo = input.tipo;
  if (input.observaciones !== undefined) payload.observaciones = input.observaciones?.trim() ?? null;
  if (input.ivaPorcentaje !== undefined) payload.iva_porcentaje = input.ivaPorcentaje ?? null;
  if (input.irpfPorcentaje !== undefined) payload.irpf_porcentaje = input.irpfPorcentaje ?? null;
  if (input.invoiceId !== undefined) payload.invoice_id = input.invoiceId ?? null;
  return payload;
}

export class SupabaseTransactionsRepository implements TransactionsRepository {
  async create(input: CreateTransactionInput): Promise<ServiceResult<Transaction>> {
    try {
      if (!input.concepto?.trim()) return fail("El concepto es obligatorio", "VALIDATION_TRANSACTION_CONCEPT_REQUIRED");
      if (!input.fecha) return fail("La fecha es obligatoria", "VALIDATION_TRANSACTION_DATE_REQUIRED");
      if (!input.importe || Number(input.importe) <= 0) return fail("El importe debe ser mayor que 0", "VALIDATION_TRANSACTION_AMOUNT_INVALID");

      const userId = await getCurrentUserId();
      if (!userId) return fail("Usuario no autenticado", "AUTH_REQUIRED");

      const supabase = getSupabaseClient();
      const payload = normalizeCreateInput(input, userId);
      const { data, error } = await supabase.from("transacciones").insert([payload]).select("*").single();

      if (error || !data) return fail(error?.message ?? "No se pudo crear transaccion", error?.code, error);
      return ok(mapTransactionRow(data as TransactionRow));
    } catch (error) {
      return fail("No se pudo crear transaccion", "TRANSACTIONS_CREATE_ERROR", error);
    }
  }

  async list(filters: TransactionFilters = {}): Promise<ServiceResult<Transaction[]>> {
    try {
      const userId = await getCurrentUserId();
      if (!userId) return ok([]);

      const supabase = getSupabaseClient();
      let query = supabase
        .from("transacciones")
        .select("*")
        .eq("user_id", userId)
        .order("fecha", { ascending: false });

      if (filters.minAmount !== undefined) query = query.gte("importe", filters.minAmount);
      if (filters.maxAmount !== undefined) query = query.lte("importe", filters.maxAmount);
      if (filters.startDate) query = query.gte("fecha", filters.startDate);
      if (filters.endDate) query = query.lte("fecha", filters.endDate);
      if (filters.tipo) query = query.eq("tipo", filters.tipo);
      if (filters.categoria) query = query.eq("categoria", filters.categoria);

      const { data, error } = await query;
      if (error) return fail(error.message, error.code, error);

      let mapped = (data ?? []).map((row) => mapTransactionRow(row as TransactionRow));
      if (filters.search?.trim()) {
        const search = filters.search.trim().toLowerCase();
        mapped = mapped.filter((item) => item.concepto.toLowerCase().includes(search));
      }

      return ok(mapped);
    } catch (error) {
      return fail("No se pudo obtener transacciones", "TRANSACTIONS_LIST_ERROR", error);
    }
  }

  async getById(transactionId: string): Promise<ServiceResult<Transaction | null>> {
    try {
      if (!transactionId) return fail("ID de transaccion obligatorio", "VALIDATION_TRANSACTION_ID_REQUIRED");

      const userId = await getCurrentUserId();
      if (!userId) return ok(null);

      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("transacciones")
        .select("*")
        .eq("user_id", userId)
        .eq("id", transactionId)
        .maybeSingle();

      if (error) return fail(error.message, error.code, error);
      return ok(data ? mapTransactionRow(data as TransactionRow) : null);
    } catch (error) {
      return fail("No se pudo obtener transaccion", "TRANSACTIONS_GET_BY_ID_ERROR", error);
    }
  }

  async update(transactionId: string, input: UpdateTransactionInput): Promise<ServiceResult<Transaction>> {
    try {
      if (!transactionId) return fail("ID de transaccion obligatorio", "VALIDATION_TRANSACTION_ID_REQUIRED");
      const userId = await getCurrentUserId();
      if (!userId) return fail("Usuario no autenticado", "AUTH_REQUIRED");

      const payload = normalizeUpdateInput(input);
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("transacciones")
        .update(payload)
        .eq("id", transactionId)
        .eq("user_id", userId)
        .select("*")
        .single();

      if (error || !data) return fail(error?.message ?? "No se pudo actualizar transaccion", error?.code, error);
      return ok(mapTransactionRow(data as TransactionRow));
    } catch (error) {
      return fail("No se pudo actualizar transaccion", "TRANSACTIONS_UPDATE_ERROR", error);
    }
  }

  async listFiscalExpenses(startDate: string, endDate: string): Promise<ServiceResult<FiscalExpenseRow[]>> {
    try {
      const userId = await getCurrentUserId();
      if (!userId) return ok([]);

      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("transacciones")
        .select("importe, iva_porcentaje")
        .eq("user_id", userId)
        .eq("tipo", "gasto")
        .gte("fecha", startDate)
        .lte("fecha", endDate);

      if (error) return fail(error.message, error.code, error);
      return ok(
        (data ?? []).map((row: { importe: number; iva_porcentaje: number | null }) => ({
          importe: row.importe ?? 0,
          ivaPorcentaje: row.iva_porcentaje,
        })),
      );
    } catch (error) {
      return fail("No se pudo obtener gastos fiscales", "TRANSACTIONS_FISCAL_EXPENSES_ERROR", error);
    }
  }

  async remove(transactionId: string): Promise<ServiceResult<null>> {
    try {
      if (!transactionId) return fail("ID de transaccion obligatorio", "VALIDATION_TRANSACTION_ID_REQUIRED");
      const userId = await getCurrentUserId();
      if (!userId) return fail("Usuario no autenticado", "AUTH_REQUIRED");

      const supabase = getSupabaseClient();
      const { error } = await supabase.from("transacciones").delete().eq("id", transactionId).eq("user_id", userId);
      if (error) return fail(error.message, error.code, error);
      return ok(null);
    } catch (error) {
      return fail("No se pudo eliminar transaccion", "TRANSACTIONS_REMOVE_ERROR", error);
    }
  }
}

export const transactionsRepository = new SupabaseTransactionsRepository();
