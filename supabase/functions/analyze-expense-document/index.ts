import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const AZURE_ENDPOINT = Deno.env.get("AZURE_DI_ENDPOINT")!;
const AZURE_KEY = Deno.env.get("AZURE_DI_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MIN = 5;
const AZURE_TIMEOUT_MS = 45_000;

interface OcrResult {
  vendorName: string | null;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  total: number | null;
  currency: string;
  tax: number | null;
  subtotal: number | null;
  confidence: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonError("No autorizado: falta header Authorization", 401);
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return jsonError("Config error: faltan SUPABASE_URL o SERVICE_ROLE_KEY", 500);
    }

    if (!AZURE_ENDPOINT || !AZURE_KEY) {
      return jsonError("Config error: faltan AZURE_DI_ENDPOINT o AZURE_DI_KEY", 500);
    }

    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: { user: authedUser }, error: authErr } = await userClient.auth.getUser(token);

    if (authErr || !authedUser) {
      return jsonError("Token inválido: " + (authErr?.message || "usuario no encontrado"), 401);
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const withinWindow = new Date(
      Date.now() - RATE_LIMIT_WINDOW_MIN * 60_000,
    ).toISOString();
    const { count } = await admin
      .from("expense_ocr_log")
      .select("*", { count: "exact", head: true })
      .eq("user_id", authedUser.id)
      .gte("created_at", withinWindow);

    if ((count ?? 0) >= RATE_LIMIT_MAX) {
      return jsonError(
        `Límite alcanzado: ${RATE_LIMIT_MAX} escaneos cada ${RATE_LIMIT_WINDOW_MIN} min`,
        429,
      );
    }

    const { filePath } = await req.json();
    if (!filePath || typeof filePath !== "string") {
      return jsonError("filePath requerido", 400);
    }

    const pathParts = filePath.split("/");
    if (pathParts[0] !== authedUser.id) {
      return jsonError("Acceso denegado al archivo", 403);
    }

    const { data: fileData, error: dlErr } = await admin.storage
      .from("expense-ocr-temp")
      .download(filePath);
    if (dlErr || !fileData) {
      return jsonError("No se pudo descargar el archivo", 404);
    }

    const fileBytes = new Uint8Array(await fileData.arrayBuffer());
    const contentType = fileData.type || "application/octet-stream";

    let ocrResult: OcrResult;
    try {
      ocrResult = await analyzeWithAzure(fileBytes, contentType);
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      await logOcr(admin, authedUser.id, "error", null, null, null, null, null, null, errorMsg);
      await deleteFile(admin, filePath);
      return jsonError(`Error OCR: ${errorMsg}`, 502);
    }

    const status = ocrResult.confidence < 0.65 ? "low_confidence" : "success";
    await logOcr(
      admin,
      authedUser.id,
      status,
      ocrResult.confidence,
      ocrResult.vendorName,
      ocrResult.invoiceNumber,
      ocrResult.invoiceDate,
      ocrResult.total,
      ocrResult.currency,
      null,
    );

    await deleteFile(admin, filePath);

    return new Response(JSON.stringify(ocrResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonError(`Error interno: ${msg}`, 500);
  }
});

async function analyzeWithAzure(
  fileBytes: Uint8Array,
  contentType: string,
): Promise<OcrResult> {
  const models = ["prebuilt-invoice", "prebuilt-receipt"];

  for (const model of models) {
    const url = `${AZURE_ENDPOINT}/documentintelligence/documentModels/${model}:analyze?api-version=2024-11-30`;

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), AZURE_TIMEOUT_MS);

    let postRes: Response;
    try {
      postRes = await fetch(url, {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": AZURE_KEY,
          "Content-Type": contentType,
        },
        body: fileBytes,
        signal: ctrl.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    if (!postRes.ok) {
      if (model === "prebuilt-invoice") continue;
      throw new Error(`Azure ${model} respondió ${postRes.status}`);
    }

    const operationUrl = postRes.headers.get("Operation-Location");
    if (!operationUrl) throw new Error("Sin Operation-Location");

    let result: Record<string, unknown> | null = null;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 1500));
      const pollRes = await fetch(operationUrl, {
        headers: { "Ocp-Apim-Subscription-Key": AZURE_KEY },
      });
      const body = await pollRes.json();
      if (body.status === "succeeded") {
        result = body.analyzeResult;
        break;
      }
      if (body.status === "failed") {
        throw new Error(body.error?.message || "Azure análisis fallido");
      }
    }

    if (!result) throw new Error("Timeout esperando resultado de Azure");

    return normalizeResult(result, model);
  }

  throw new Error("Ningún modelo de Azure pudo procesar el documento");
}

function normalizeResult(
  analyzeResult: Record<string, unknown>,
  model: string,
): OcrResult {
  const docs = (analyzeResult.documents as Array<Record<string, unknown>>) || [];
  const doc = docs[0] || {};
  const fields = (doc.fields as Record<string, Record<string, unknown>>) || {};
  const docConfidence = typeof doc.confidence === "number" ? doc.confidence : 0;

  const str = (key: string): string | null => {
    const f = fields[key];
    if (!f) return null;
    const v = (f.valueString || f.content) as string | undefined;
    return v ? sanitize(v) : null;
  };

  const num = (key: string): number | null => {
    const f = fields[key];
    if (!f) return null;
    const v = f.valueNumber ?? f.valueCurrency;
    if (v && typeof v === "object" && "amount" in (v as Record<string, unknown>)) {
      return (v as Record<string, number>).amount ?? null;
    }
    return typeof v === "number" ? v : null;
  };

  const dateStr = (key: string): string | null => {
    const f = fields[key];
    if (!f) return null;
    const v = (f.valueDate || f.content) as string | undefined;
    return v || null;
  };

  const currency = (() => {
    const f = fields["InvoiceTotal"] || fields["Total"];
    if (f?.valueCurrency && typeof f.valueCurrency === "object") {
      return ((f.valueCurrency as Record<string, string>).currencyCode) || "EUR";
    }
    return "EUR";
  })();

  if (model === "prebuilt-invoice") {
    return {
      vendorName: str("VendorName"),
      invoiceNumber: str("InvoiceId"),
      invoiceDate: dateStr("InvoiceDate"),
      total: num("InvoiceTotal"),
      currency,
      tax: num("TotalTax"),
      subtotal: num("SubTotal"),
      confidence: docConfidence,
    };
  }

  return {
    vendorName: str("MerchantName"),
    invoiceNumber: str("TransactionId") || str("ReceiptNumber"),
    invoiceDate: dateStr("TransactionDate"),
    total: num("Total"),
    currency,
    tax: num("TotalTax") || num("Tax"),
    subtotal: num("Subtotal"),
    confidence: docConfidence,
  };
}

function sanitize(s: string): string {
  return s.replace(/[\x00-\x1F]/g, "").trim().substring(0, 200);
}

async function logOcr(
  admin: ReturnType<typeof createClient>,
  userId: string,
  status: string,
  confidence: number | null,
  vendor: string | null,
  invoiceNumber: string | null,
  invoiceDate: string | null,
  total: number | null,
  currency: string | null,
  error: string | null,
) {
  await admin.from("expense_ocr_log").insert({
    user_id: userId,
    status,
    confidence,
    vendor,
    invoice_number: invoiceNumber,
    invoice_date: invoiceDate,
    total,
    currency: currency || "EUR",
    error: error ? error.substring(0, 500) : null,
  });
}

async function deleteFile(
  admin: ReturnType<typeof createClient>,
  filePath: string,
) {
  try {
    await admin.storage.from("expense-ocr-temp").remove([filePath]);
  } catch {
    // best-effort cleanup
  }
}

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
