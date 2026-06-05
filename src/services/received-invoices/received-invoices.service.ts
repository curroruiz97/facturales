import { getCurrentUserId, getSupabaseClient } from "../supabase/client";
import { fail, ok, type ServiceResult } from "../../shared/types/service-result";
import { parseFacturaeXml } from "../../domain/rules/fiscal/facturae-parse";

const BUCKET = "received-invoices";
const MAX_BYTES = 15 * 1024 * 1024; // 15 MB

export type ReceivedInvoiceStatus = "received" | "accepted" | "rejected";
export type ReceivedInvoiceFormat = "xml" | "pdf";

export interface ReceivedInvoiceRecord {
  id: string;
  supplierName: string;
  supplierNif: string;
  buyerNif: string;
  invoiceNumber: string;
  issueDate: string | null;
  totalAmount: number;
  taxAmount: number;
  currency: string;
  source: "upload" | "email";
  fileFormat: ReceivedInvoiceFormat | null;
  filePath: string | null;
  status: ReceivedInvoiceStatus;
  createdAt: string | null;
}

function mapRow(row: Record<string, unknown>): ReceivedInvoiceRecord {
  return {
    id: String(row.id ?? ""),
    supplierName: String(row.supplier_name ?? ""),
    supplierNif: String(row.supplier_nif ?? ""),
    buyerNif: String(row.buyer_nif ?? ""),
    invoiceNumber: String(row.invoice_number ?? ""),
    issueDate: (row.issue_date as string | null) ?? null,
    totalAmount: Number(row.total_amount ?? 0),
    taxAmount: Number(row.tax_amount ?? 0),
    currency: String(row.currency ?? "EUR"),
    source: (row.source as "upload" | "email" | undefined) ?? "upload",
    fileFormat: (row.file_format as ReceivedInvoiceFormat | null) ?? null,
    filePath: (row.file_path as string | null) ?? null,
    status: (row.status as ReceivedInvoiceStatus | undefined) ?? "received",
    createdAt: (row.created_at as string | null) ?? null,
  };
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "factura";
}

function detectFormat(file: File): ReceivedInvoiceFormat | null {
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".xml") || file.type.includes("xml")) return "xml";
  if (lower.endsWith(".pdf") || file.type === "application/pdf") return "pdf";
  return null;
}

export interface ReceivedInvoicesService {
  listMine(): Promise<ServiceResult<ReceivedInvoiceRecord[]>>;
  upload(file: File): Promise<ServiceResult<ReceivedInvoiceRecord>>;
  setStatus(id: string, status: ReceivedInvoiceStatus): Promise<ServiceResult<void>>;
  remove(id: string): Promise<ServiceResult<void>>;
  getDownloadUrl(filePath: string): Promise<ServiceResult<string>>;
}

class SupabaseReceivedInvoicesService implements ReceivedInvoicesService {
  async listMine(): Promise<ServiceResult<ReceivedInvoiceRecord[]>> {
    const userId = await getCurrentUserId();
    if (!userId) return ok([]);
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("received_invoices")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) return fail(error.message, error.code, error);
    const rows = Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
    return ok(rows.map(mapRow));
  }

  async upload(file: File): Promise<ServiceResult<ReceivedInvoiceRecord>> {
    const userId = await getCurrentUserId();
    if (!userId) return fail("No autenticado", "AUTH_REQUIRED");

    const format = detectFormat(file);
    if (!format) return fail("Formato no admitido. Sube un XML Facturae o un PDF.", "VALIDATION_FORMAT");
    if (file.size > MAX_BYTES) return fail("El archivo supera el tamaño máximo (15 MB).", "VALIDATION_SIZE");

    const supabase = getSupabaseClient();

    // 1) Si es XML Facturae, extraemos los datos del proveedor/factura.
    let parsedFields: Record<string, unknown> = {
      supplier_name: "",
      supplier_nif: "",
      buyer_nif: "",
      invoice_number: "",
      issue_date: null,
      total_amount: 0,
      tax_amount: 0,
      currency: "EUR",
    };
    let rawXml: string | null = null;
    if (format === "xml") {
      const text = await file.text();
      const parsed = parseFacturaeXml(text);
      if (!parsed) return fail("El XML no parece una factura electrónica Facturae válida.", "VALIDATION_FACTURAE");
      rawXml = text;
      parsedFields = {
        supplier_name: parsed.supplierName,
        supplier_nif: parsed.supplierNif,
        buyer_nif: parsed.buyerNif,
        invoice_number: parsed.invoiceNumber,
        issue_date: parsed.issueDate || null,
        total_amount: parsed.total,
        tax_amount: parsed.taxAmount,
        currency: parsed.currency,
      };
    } else {
      // PDF: guardamos el fichero; los datos los puede revisar el usuario (o un OCR posterior).
      parsedFields.supplier_name = file.name.replace(/\.pdf$/i, "");
    }

    // 2) Subimos el fichero al bucket (carpeta del usuario).
    const path = `${userId}/${Date.now()}_${sanitizeFileName(file.name)}`;
    const uploaded = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
    if (uploaded.error) return fail(uploaded.error.message, uploaded.error.name, uploaded.error);

    // 3) Insertamos el registro.
    const { data, error } = await supabase
      .from("received_invoices")
      .insert({
        user_id: userId,
        ...parsedFields,
        source: "upload",
        file_format: format,
        file_path: path,
        raw_xml: rawXml,
        status: "received",
      })
      .select("*")
      .single();

    if (error) {
      // Si falla el insert, intentamos limpiar el fichero subido (best-effort).
      await supabase.storage.from(BUCKET).remove([path]).catch(() => undefined);
      return fail(error.message, error.code, error);
    }
    return ok(mapRow(data as Record<string, unknown>));
  }

  async setStatus(id: string, status: ReceivedInvoiceStatus): Promise<ServiceResult<void>> {
    const userId = await getCurrentUserId();
    if (!userId) return fail("No autenticado", "AUTH_REQUIRED");
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("received_invoices")
      .update({ status })
      .eq("id", id)
      .eq("user_id", userId);
    if (error) return fail(error.message, error.code, error);
    return ok(undefined);
  }

  async remove(id: string): Promise<ServiceResult<void>> {
    const userId = await getCurrentUserId();
    if (!userId) return fail("No autenticado", "AUTH_REQUIRED");
    const supabase = getSupabaseClient();

    // Recuperamos la ruta del fichero para borrarlo del bucket.
    const { data: existing } = await supabase
      .from("received_invoices")
      .select("file_path")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();

    const { error } = await supabase.from("received_invoices").delete().eq("id", id).eq("user_id", userId);
    if (error) return fail(error.message, error.code, error);

    const filePath = (existing as { file_path?: string } | null)?.file_path;
    if (filePath) {
      await supabase.storage.from(BUCKET).remove([filePath]).catch(() => undefined);
    }
    return ok(undefined);
  }

  async getDownloadUrl(filePath: string): Promise<ServiceResult<string>> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(filePath, 60);
    if (error) return fail(error.message, error.name, error);
    if (!data?.signedUrl) return fail("No se pudo generar el enlace de descarga.", "SIGNED_URL_EMPTY");
    return ok(data.signedUrl);
  }
}

export const receivedInvoicesService: ReceivedInvoicesService = new SupabaseReceivedInvoicesService();
