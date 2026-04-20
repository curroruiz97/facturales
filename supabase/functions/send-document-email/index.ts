// Supabase Edge Function: send-document-email
// Envía email con PDF adjunto de factura/presupuesto vía Resend
// Requiere JWT (verificación automática de Supabase)
// Sin reintentos: cada combinación documentType+documentId+to se envía una sola vez.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsOptions, jsonResponse } from "../_shared/cors.ts";

// ============================================
// Tipos
// ============================================
interface EmailPayload {
  documentType: "invoice" | "quote";
  documentId: string;
  to: string;
  subject?: string;
  body?: string;
  pdfBase64: string;   // obligatorio
  pdfFilename?: string;
  scheduledAt?: string; // ISO 8601 — si se envía, Resend programa el envío para esa fecha
}

// ============================================
// Validación y sanitización
// ============================================

/** RFC 5322 simplified — covers real-world addresses without allowing injection */
const EMAIL_RE = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

const MAX_SUBJECT_LENGTH = 200;
const MAX_BODY_LENGTH = 2000;
const MAX_FILENAME_LENGTH = 100;

/** Strip characters that could enable header injection (newlines, null bytes) */
function sanitizeOneLine(str: string): string {
  return str.replace(/[\r\n\x00]/g, "").trim();
}

/** Allow only safe filename characters — letters, digits, dots, hyphens, underscores, spaces */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[\r\n\x00]/g, "")
    .replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ._\- ]/g, "_")
    .replace(/\.{2,}/g, ".")
    .trim()
    .substring(0, MAX_FILENAME_LENGTH) || "documento.pdf";
}

// ============================================
// Utilidades
// ============================================
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// arriba de buildEmailHtml, o dentro, como constantes:
const POWERED_BY_URL = "https://facturales.es/";
const POWERED_BY_LOGO = "https://nukslmpdwjqlepacukul.supabase.co/storage/v1/object/public/email-assets/logo-color.png";

function buildEmailHtml(params: {
  documentType: "invoice" | "quote";
  documentNumber: string;
  clientName: string;
  issuerName: string;
  totalAmount: string;
  customBody?: string;
}): string {
  const { documentType, documentNumber, clientName, issuerName, totalAmount, customBody } = params;
  const docLabel = documentType === "invoice" ? "factura" : "presupuesto";
  const docLabelCap = documentType === "invoice" ? "Factura" : "Presupuesto";

  const bodyText = customBody ||
    `Adjuntamos su ${docLabel} <strong>N&ordm; ${documentNumber}</strong> por un importe de <strong>${totalAmount}</strong>.`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${docLabelCap} ${documentNumber}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
          <!-- Header -->
          <tr>
            <td style="background-color:#ec8228;padding:28px 40px;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">${issuerName}</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 24px;">
              <p style="margin:0 0 16px;font-size:16px;color:#333333;line-height:1.6;">
                Estimado/a <strong>${clientName}</strong>,
              </p>
              <p style="margin:0 0 24px;font-size:16px;color:#333333;line-height:1.6;">
                ${bodyText}
              </p>
              <p style="margin:0 0 8px;font-size:14px;color:#666666;">
                Encontrará el documento adjunto en formato PDF.
              </p>
            </td>
          </tr>
          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <hr style="border:none;border-top:1px solid #e8e8e8;margin:0;">
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px 28px;">
              <p style="margin:0;font-size:12px;color:#999999;line-height:1.5;">
                Este email ha sido enviado automáticamente desde la plataforma de facturación de <a href="https://facturales.es" style="color:#ec8228;text-decoration:none;">Facturales</a> (facturales.es).
                Si tiene alguna consulta, póngase directamente en contacto con ${issuerName}. No responda a este correo.
              </p>

              <p style="margin:14px 0 0;font-size:12px;color:#999999;line-height:1.5;text-align:center;">
                <a href="${POWERED_BY_URL}"
                  target="_blank"
                  rel="noopener noreferrer"
                  style="color:#999999;text-decoration:none;">
                  <img src="${POWERED_BY_LOGO}"
                      alt="Facturales"
                      height="18"
                      style="display:inline-block;border:0;outline:none;text-decoration:none;vertical-align:middle;margin-right:8px;">
                  <span style="vertical-align:middle;">Powered by Facturales</span>
                </a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ============================================
// Handler principal
// ============================================
Deno.serve(async (req: Request) => {
  // Manejar preflight CORS
  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  try {
    // ── 1. Parsear y validar payload ──────────────────────────
    const payload: EmailPayload = await req.json();
    const { documentType, documentId, pdfBase64 } = payload;
    // Normalize inputs early — strip injection vectors
    const to = typeof payload.to === "string" ? payload.to.trim().toLowerCase() : "";
    const subject = payload.subject ? sanitizeOneLine(payload.subject).substring(0, MAX_SUBJECT_LENGTH) : undefined;
    const body = payload.body ? payload.body.substring(0, MAX_BODY_LENGTH) : undefined;
    const pdfFilename = payload.pdfFilename ? sanitizeFilename(payload.pdfFilename) : undefined;
    const scheduledAt = payload.scheduledAt ? sanitizeOneLine(payload.scheduledAt) : undefined;

    // Validar scheduledAt si se proporciona: debe ser ISO 8601, futuro y máximo 30 días
    if (scheduledAt) {
      const scheduledDate = new Date(scheduledAt);
      if (isNaN(scheduledDate.getTime())) {
        return jsonResponse(req, { success: false, error: "scheduledAt debe ser una fecha ISO 8601 válida" }, 400);
      }
      if (scheduledDate.getTime() <= Date.now()) {
        return jsonResponse(req, { success: false, error: "scheduledAt debe ser una fecha futura" }, 400);
      }
      const maxMs = 30 * 24 * 60 * 60 * 1000;
      if (scheduledDate.getTime() > Date.now() + maxMs) {
        return jsonResponse(req, { success: false, error: "scheduledAt no puede superar los 30 días desde ahora" }, 400);
      }
    }

    if (!documentType || !["invoice", "quote"].includes(documentType)) {
      return jsonResponse(req, { success: false, error: "documentType debe ser 'invoice' o 'quote'" }, 400);
    }
    if (!documentId || typeof documentId !== "string") {
      return jsonResponse(req, { success: false, error: "documentId es obligatorio" }, 400);
    }
    if (!to || !EMAIL_RE.test(to.trim())) {
      return jsonResponse(req, { success: false, error: "to debe ser un email válido" }, 400);
    }
    if (!pdfBase64 || typeof pdfBase64 !== "string") {
      return jsonResponse(req, { success: false, error: "pdfBase64 es obligatorio (PDF del documento)" }, 400);
    }

    // ── 2. Crear clientes Supabase ───────────────────────────
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization")!;

    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // ── 3. Validar JWT ───────────────────────────────────────
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return jsonResponse(req, { success: false, error: "No autenticado" }, 401);
    }
    const userId = user.id;

    // ── 4. Verificar ownership y status del documento ────────
    const tableName = documentType === "invoice" ? "invoices" : "quotes";
    const dataField = documentType === "invoice" ? "invoice_data" : "quote_data";
    const numberField = documentType === "invoice" ? "invoice_number" : "quote_number";

    const { data: docData, error: docError } = await supabaseAdmin
      .from(tableName)
      .select(`id, user_id, status, ${numberField}, total_amount, ${dataField}`)
      .eq("id", documentId)
      .single();

    if (docError || !docData) {
      return jsonResponse(req, { success: false, error: "Documento no encontrado" }, 404);
    }
    if (docData.user_id !== userId) {
      return jsonResponse(req, { success: false, error: "No tienes permisos sobre este documento" }, 403);
    }
    if (docData.status !== "issued") {
      return jsonResponse(req, { success: false, error: "El documento debe estar emitido para enviar email" }, 400);
    }

    // ── 4b. Validar que 'to' coincide con el email del cliente del documento ──
    const docJsonDataRaw = docData[dataField] || {};
    const clientEmailOnDoc = docJsonDataRaw.client?.email;
    if (!clientEmailOnDoc) {
      return jsonResponse(req, { success: false, error: "El documento no tiene un email de cliente asociado" }, 400);
    }
    if (to.trim().toLowerCase() !== clientEmailOnDoc.trim().toLowerCase()) {
      return jsonResponse(req, { success: false, error: "El email de destino no coincide con el email del cliente del documento" }, 403);
    }

    // ── 5. Idempotencia ──────────────────────────────────────
    const idempotencyKey = await sha256(`${documentType}:${documentId}:${to}`);

    // FIX #1: Si existe log con CUALQUIER status, devolver sin reenviar
    const { data: existingLog } = await supabaseAdmin
      .from("document_email_log")
      .select("*")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (existingLog) {
      const alreadySent = existingLog.status === "sent" || existingLog.status === "scheduled";
      return jsonResponse(req, {
        success: alreadySent,
        alreadyProcessed: true,
        alreadySent,
        data: {
          logId: existingLog.id,
          status: existingLog.status,
          providerMessageId: existingLog.provider_message_id,
          errorMessage: existingLog.error_message,
        },
        message: existingLog.status === "sent"
          ? "Email ya enviado previamente para este documento"
          : `Email ya procesado con estado: ${existingLog.status}`,
      });
    }

    // ── 6. Extraer datos del documento ───────────────────────
    const docJsonData = docData[dataField] || {};
    const issuerName = docJsonData.issuer?.name || "Sin nombre";
    const clientName = docJsonData.client?.name || "Cliente";
    const docNumber = docData[numberField] || "Sin número";
    const totalAmount = new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(parseFloat(docData.total_amount) || 0);

    const emailSubject = sanitizeOneLine(subject || (
      documentType === "invoice"
        ? `Factura ${docNumber} de ${issuerName}`
        : `Presupuesto ${docNumber} de ${issuerName}`
    ));

    // ── 7. Insertar log con status = queued ──────────────────
    const { data: logEntry, error: logError } = await supabaseAdmin
      .from("document_email_log")
      .insert({
        user_id: userId,
        document_type: documentType,
        document_id: documentId,
        to_email: to,
        subject: emailSubject,
        provider: "resend",
        status: "queued",
        idempotency_key: idempotencyKey,
      })
      .select()
      .single();

    // FIX #2: Si falla el insert (ej: race condition con 23505), abortar limpiamente
    if (logError || !logEntry) {
      console.error("Error insertando log:", logError);
      // Podría ser race condition con otra request concurrente → devolver como ya procesado
      if (logError?.code === "23505") {
        return jsonResponse(req, {
          success: false,
          alreadyProcessed: true,
          alreadySent: false,
          error: "Envío ya en proceso por otra solicitud concurrente",
        });
      }
      return jsonResponse(req, { success: false, error: "Error al registrar el envío" }, 500);
    }

    const logId = logEntry.id;

    // ── 8. Validar y subir PDF a Storage ──────────────────────
    // Límite: 10 MB en base64 ≈ 7.5 MB de PDF real (más que suficiente para facturas)
    const MAX_BASE64_LENGTH = 10 * 1024 * 1024;
    if (pdfBase64.length > MAX_BASE64_LENGTH) {
      await supabaseAdmin
        .from("document_email_log")
        .update({ status: "failed", error_message: "PDF excede el tamaño máximo permitido (7.5 MB)" })
        .eq("id", logId);
      return jsonResponse(req, { success: false, error: "El PDF excede el tamaño máximo permitido (7.5 MB)" }, 413);
    }

    const fileName = pdfFilename || `documento_${docNumber}.pdf`;
    const storagePath = `${userId}/${documentType}/${documentId}/${fileName}`;

    let binaryStr: string;
    try {
      binaryStr = atob(pdfBase64);
    } catch {
      await supabaseAdmin
        .from("document_email_log")
        .update({ status: "failed", error_message: "pdfBase64 no es base64 válido" })
        .eq("id", logId);
      return jsonResponse(req, { success: false, error: "El contenido de pdfBase64 no es base64 válido" }, 400);
    }

    // Validar magic bytes de PDF (%PDF-)
    if (!binaryStr.startsWith("%PDF-")) {
      await supabaseAdmin
        .from("document_email_log")
        .update({ status: "failed", error_message: "El archivo no es un PDF válido" })
        .eq("id", logId);
      return jsonResponse(req, { success: false, error: "El archivo adjunto no es un PDF válido" }, 400);
    }

    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    const { error: uploadError } = await supabaseAdmin.storage
      .from("document-pdfs")
      .upload(storagePath, bytes, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("Error subiendo PDF a Storage:", uploadError);
      // No es crítico para el envío de email, continuamos
    }

    // ── 9. Construir HTML del email ──────────────────────────
    const emailHtml = buildEmailHtml({
      documentType,
      documentNumber: docNumber,
      clientName,
      issuerName,
      totalAmount,
      customBody: body,
    });

    // ── 10. Enviar vía Resend ────────────────────────────────
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const resendFrom = Deno.env.get("RESEND_FROM") || "Facturales <noreply@facturales.es>";
    const mailReplyTo = Deno.env.get("MAIL_REPLY_TO");

    if (!resendApiKey) {
      await supabaseAdmin
        .from("document_email_log")
        .update({ status: "failed", error_message: "RESEND_API_KEY no configurada" })
        .eq("id", logId);
      return jsonResponse(req, { success: false, error: "Servicio de email no configurado" }, 500);
    }

    const resendBody: Record<string, unknown> = {
      from: resendFrom,
      to: [to],
      subject: emailSubject,
      html: emailHtml,
      attachments: [{
        filename: fileName,
        content: pdfBase64,
      }],
    };

    if (mailReplyTo) {
      resendBody.reply_to = mailReplyTo;
    }

    if (scheduledAt) {
      resendBody.scheduled_at = scheduledAt;
    }

    // FIX #3: Enviar Idempotency-Key a Resend como seguridad extra
    const resendCtrl = new AbortController();
    const resendTimer = setTimeout(() => resendCtrl.abort(), 30_000);

    let resendResponse: Response;
    try {
      resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${resendApiKey}`,
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(resendBody),
        signal: resendCtrl.signal,
      });
    } catch (e) {
      const isTimeout = e instanceof DOMException && e.name === "AbortError";
      const errorMsg = isTimeout
        ? "Timeout: el servicio de email no respondió en 30s"
        : "Error de conexión con el servicio de email";
      await supabaseAdmin
        .from("document_email_log")
        .update({ status: "failed", error_message: errorMsg })
        .eq("id", logId);
      return jsonResponse(req, { success: false, error: errorMsg }, 504);
    } finally {
      clearTimeout(resendTimer);
    }

    const resendResult = await resendResponse.json();

    // ── 11. Actualizar log según resultado ────────────────────
    if (resendResponse.ok && resendResult.id) {
      await supabaseAdmin
        .from("document_email_log")
        .update({
          status: scheduledAt ? "scheduled" : "sent",
          provider_message_id: resendResult.id,
          scheduled_at: scheduledAt || null,
          sent_at: scheduledAt ? null : new Date().toISOString(),
        })
        .eq("id", logId);

      return jsonResponse(req, {
        success: true,
        scheduled: !!scheduledAt,
        scheduledAt: scheduledAt || null,
        data: {
          logId,
          providerMessageId: resendResult.id,
          storagePath,
        },
      });
    } else {
      const errorMsg = resendResult.message || resendResult.error || JSON.stringify(resendResult);
      console.error("Error de Resend:", errorMsg);

      await supabaseAdmin
        .from("document_email_log")
        .update({
          status: "failed",
          error_message: String(errorMsg).substring(0, 500),
        })
        .eq("id", logId);

      return jsonResponse(req, { success: false, error: `Error al enviar email: ${errorMsg}` }, 502);
    }
  } catch (error) {
    console.error("Error inesperado:", error);
    return jsonResponse(req, { success: false, error: error.message || "Error interno" }, 500);
  }
});
