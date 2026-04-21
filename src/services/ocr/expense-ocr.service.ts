import { billingLimitsService } from "../billing-limits/billing-limits.service";
import { transactionsRepository } from "../repositories";
import { getCurrentUserId, getSupabaseClient } from "../supabase/client";
import type { CreateTransactionInput } from "../repositories/transactions.repository";
import { fail, ok, type ServiceResult } from "../../shared/types/service-result";

export interface OcrExpenseResult {
  concept: string;
  amount: number;
  date: string;
  taxRate: number | null;
  provider: string | null;
  raw: unknown;
}

export interface AnalyzeExpenseInput {
  file: File;
}

export interface ExpenseOcrService {
  analyzeExpense(input: AnalyzeExpenseInput): Promise<ServiceResult<OcrExpenseResult>>;
  createTransactionFromOcr(input: OcrExpenseResult): Promise<ServiceResult<null>>;
}

const MAX_OCR_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_OCR_MIME_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

function sanitizeFileName(name: string): string {
  const normalized = name
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_+/g, "_");
  return normalized || "document";
}

function validateOcrFile(file: File): ServiceResult<null> {
  if (!file) return fail("Debes adjuntar un archivo.", "OCR_FILE_REQUIRED");
  if (!ALLOWED_OCR_MIME_TYPES.has(file.type)) {
    return fail("Formato no soportado. Usa PDF, JPG, PNG o WEBP.", "OCR_FILE_TYPE_NOT_SUPPORTED");
  }
  if (file.size <= 0) return fail("El archivo esta vacio.", "OCR_FILE_EMPTY");
  if (file.size > MAX_OCR_FILE_BYTES) {
    return fail("El archivo supera el tamano maximo de 10 MB.", "OCR_FILE_TOO_LARGE");
  }
  return ok(null);
}

function toISODate(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }
  const normalized = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized;
  return toISODate(undefined);
}

function toAmount(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value ?? 0));
  if (!Number.isFinite(parsed)) return 0;
  return parsed;
}

export class DefaultExpenseOcrService implements ExpenseOcrService {
  async analyzeExpense(input: AnalyzeExpenseInput): Promise<ServiceResult<OcrExpenseResult>> {
    try {
      const fileValidation = validateOcrFile(input.file);
      if (!fileValidation.success) return fileValidation;

      const limit = await billingLimitsService.canScanOCR();
      if (!limit.success) return fail(limit.error.message, limit.error.code, limit.error.cause);
      if (!limit.data.allowed) return fail(limit.data.reason ?? "Limite de OCR alcanzado.", "BILLING_LIMIT_OCR_BLOCKED");

      const userId = await getCurrentUserId();
      if (!userId) return fail("Usuario no autenticado.", "AUTH_REQUIRED");

      const supabase = getSupabaseClient();
      const safeName = sanitizeFileName(input.file.name);
      const path = `${userId}/${Date.now()}_${safeName}`;
      const upload = await supabase.storage.from("expense-ocr-temp").upload(path, input.file, {
        upsert: false,
      });
      if (upload.error) return fail(upload.error.message, upload.error.name, upload.error);

      const invoke = await supabase.functions.invoke("analyze-expense-document", {
        body: {
          filePath: path,
        },
      });
      if (invoke.error) {
        // El error es un FunctionsHttpError con un body JSON útil — intenta leerlo
        let detail = invoke.error.message;
        try {
          const errorBody = (invoke.error as { context?: { body?: string | Blob } })?.context?.body;
          if (typeof errorBody === "string") {
            const parsed = JSON.parse(errorBody);
            if (parsed?.error) detail = String(parsed.error);
          } else if (errorBody instanceof Blob) {
            const txt = await errorBody.text();
            const parsed = JSON.parse(txt);
            if (parsed?.error) detail = String(parsed.error);
          }
        } catch {
          // ignore — usa el mensaje original
        }
        // Mensajes más claros para errores conocidos
        if (/Azure.*401/i.test(detail)) {
          detail = "El servicio de OCR no está disponible temporalmente (credenciales Azure caducadas). Contacta con soporte.";
        }
        return fail(detail, invoke.error.name, invoke.error);
      }

      const payload = (invoke.data ?? {}) as Record<string, unknown>;
      const analyzed: OcrExpenseResult = {
        concept: String(payload.concept ?? payload.description ?? "Gasto OCR"),
        amount: toAmount(payload.amount ?? payload.total ?? 0),
        date: toISODate(payload.date ?? payload.issue_date),
        taxRate: payload.tax_rate !== undefined ? toAmount(payload.tax_rate) : null,
        provider: payload.provider ? String(payload.provider) : null,
        raw: invoke.data,
      };

      await billingLimitsService.recordOCRUsage();
      return ok(analyzed);
    } catch (error) {
      return fail("No se pudo procesar el documento OCR.", "OCR_ANALYZE_ERROR", error);
    }
  }

  async createTransactionFromOcr(input: OcrExpenseResult): Promise<ServiceResult<null>> {
    const payload: CreateTransactionInput = {
      concepto: input.provider ? `${input.provider} - ${input.concept}` : input.concept,
      importe: input.amount,
      fecha: input.date,
      categoria: "otros",
      tipo: "gasto",
      ivaPorcentaje: input.taxRate,
      observaciones: "Generado desde OCR",
      clienteId: null,
      irpfPorcentaje: null,
      invoiceId: null,
    };

    const created = await transactionsRepository.create(payload);
    if (!created.success) return fail(created.error.message, created.error.code, created.error.cause);
    return ok(null);
  }
}

export const expenseOcrService = new DefaultExpenseOcrService();
