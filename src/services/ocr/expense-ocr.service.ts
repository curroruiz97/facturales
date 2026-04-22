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
  invoiceNumber: string | null;
  confidence: number | null;
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
// Azure Document Intelligence no soporta WEBP — alineamos MIME types con el edge function
const ALLOWED_OCR_MIME_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);

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
    return fail("Formato no soportado. Usa PDF, JPG o PNG.", "OCR_FILE_TYPE_NOT_SUPPORTED");
  }
  if (file.size <= 0) return fail("El archivo esta vacio.", "OCR_FILE_EMPTY");
  if (file.size > MAX_OCR_FILE_BYTES) {
    return fail("El archivo supera el tamano maximo de 10 MB.", "OCR_FILE_TOO_LARGE");
  }
  return ok(null);
}

function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function toISODate(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return todayISO();
  const normalized = value.trim();
  // Azure Document Intelligence devuelve fechas tipo "2026-03-10" o ISO completa — nos quedamos con yyyy-mm-dd
  const match = normalized.match(/^\d{4}-\d{2}-\d{2}/);
  if (match) return match[0];
  const parsed = new Date(normalized);
  if (!Number.isNaN(parsed.getTime())) {
    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
  }
  return todayISO();
}

function toAmount(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value ?? 0));
  if (!Number.isFinite(parsed)) return 0;
  return parsed;
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value));
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

function buildConcept(vendor: string | null, invoiceNumber: string | null): string {
  const parts: string[] = [];
  if (vendor) parts.push(vendor);
  if (invoiceNumber) parts.push(`Factura ${invoiceNumber}`);
  return parts.length > 0 ? parts.join(" · ") : "Gasto OCR";
}

function computeTaxRate(tax: number | null, subtotal: number | null, total: number | null): number | null {
  // Azure devuelve `tax` y `subtotal` como importes. Deducimos el % de IVA sobre la base imponible.
  if (tax !== null && subtotal !== null && subtotal > 0) {
    return Math.round((tax / subtotal) * 100 * 100) / 100;
  }
  // Fallback: si solo hay tax y total, la base es total - tax
  if (tax !== null && total !== null && total > tax) {
    const base = total - tax;
    if (base > 0) return Math.round((tax / base) * 100 * 100) / 100;
  }
  return null;
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
        if (/Azure.*(401|autenticaci)/i.test(detail)) {
          detail = "El servicio de OCR no está disponible temporalmente. Las credenciales han caducado; contacta con soporte para renovarlas.";
        } else if (/Límite alcanzado/i.test(detail)) {
          // Dejamos el mensaje del edge tal cual — ya es claro
        } else if (/Azure .* respondió 429/i.test(detail)) {
          detail = "El servicio de OCR está saturado. Inténtalo en unos segundos.";
        }
        return fail(detail, invoke.error.name, invoke.error);
      }

      const payload = (invoke.data ?? {}) as Record<string, unknown>;
      // El edge (`analyze-expense-document`) devuelve campos de Azure Document Intelligence:
      // { vendorName, invoiceNumber, invoiceDate, total, subtotal, tax, currency, confidence }
      const vendor = payload.vendorName ? String(payload.vendorName) : null;
      const invoiceNumber = payload.invoiceNumber ? String(payload.invoiceNumber) : null;
      const total = toAmount(payload.total ?? 0);
      const tax = toNullableNumber(payload.tax);
      const subtotal = toNullableNumber(payload.subtotal);
      const confidence = toNullableNumber(payload.confidence);

      const analyzed: OcrExpenseResult = {
        concept: buildConcept(vendor, invoiceNumber),
        amount: total,
        date: toISODate(payload.invoiceDate),
        taxRate: computeTaxRate(tax, subtotal, total || null),
        provider: vendor,
        invoiceNumber,
        confidence,
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
