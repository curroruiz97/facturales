import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface TicketPayload {
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string;
  titulo: string;
  descripcion: string;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Sanitize HTML from Quill editor: only allow safe formatting tags.
 * Strips all attributes except href on <a> tags (validated as http/https).
 */
function sanitizeHtml(html: string): string {
  const ALLOWED_TAGS = new Set([
    "p", "br", "strong", "b", "em", "i", "u", "ol", "ul", "li", "a",
  ]);

  return html.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, (_match, tag, attrs) => {
    const lowerTag = tag.toLowerCase();
    if (!ALLOWED_TAGS.has(lowerTag)) return "";

    // For <a> tags, only keep safe href attributes
    if (lowerTag === "a" && !_match.startsWith("</")) {
      const hrefMatch = attrs.match(/href\s*=\s*"([^"]*)"/i) ||
        attrs.match(/href\s*=\s*'([^']*)'/i);
      if (hrefMatch) {
        const href = hrefMatch[1];
        // Only allow http/https URLs — block javascript: and data: schemes
        if (/^https?:\/\//i.test(href)) {
          const safeHref = href
            .replace(/&/g, "&amp;")
            .replace(/"/g, "&quot;");
          return `<a href="${safeHref}" rel="noopener noreferrer" target="_blank">`;
        }
      }
      return "<a>";
    }

    // All other allowed tags: strip all attributes
    return _match.startsWith("</") ? `</${lowerTag}>` : `<${lowerTag}>`;
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization")!;

    const supabaseUser = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return jsonResponse({ error: "No autenticado" }, 401);
    }

    const payload: TicketPayload = await req.json();
    const nombre = (payload.nombre || "").replace(/[\r\n\x00]/g, "").trim().substring(0, 100);
    const apellido = (payload.apellido || "").replace(/[\r\n\x00]/g, "").trim().substring(0, 100);
    const email = (payload.email || "").trim().toLowerCase();
    const telefono = payload.telefono ? payload.telefono.replace(/[\r\n\x00]/g, "").trim() : undefined;
    const titulo = (payload.titulo || "").replace(/[\r\n\x00]/g, "").trim().substring(0, 200);
    const descripcion = (payload.descripcion || "").substring(0, 20_000);

    if (!nombre || !apellido || !email || !titulo || !descripcion) {
      return jsonResponse({ error: "Faltan campos obligatorios" }, 400);
    }

    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    if (!emailRegex.test(email)) {
      return jsonResponse({ error: "Correo electrónico no válido" }, 400);
    }

    if (telefono && !/^\+?[\d\s\-()]{6,20}$/.test(telefono)) {
      return jsonResponse({ error: "Número de teléfono no válido" }, 400);
    }

    const plainText = descripcion.replace(/<[^>]*>/g, "");
    if (plainText.length < 150) {
      return jsonResponse({
        error: "La descripción debe tener al menos 150 caracteres",
      }, 400);
    }

    // Rate limit: 1 ticket per user per hour
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { count } = await supabaseAdmin
      .from("support_tickets")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", oneHourAgo);

    if (count && count >= 1) {
      return jsonResponse({
        error: "Solo puedes enviar 1 ticket por hora. Inténtalo más tarde.",
      }, 429);
    }

    // Get support email from secrets
    const supportEmail = Deno.env.get("SUPPORT_EMAIL");
    if (!supportEmail) {
      return jsonResponse({ error: "Email de soporte no configurado" }, 500);
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const resendFrom =
      Deno.env.get("RESEND_FROM") || "Facturales <noreply@facturales.es>";
    if (!resendApiKey) {
      return jsonResponse({ error: "Servicio de email no configurado" }, 500);
    }

    const userEmail = user.email || "No disponible";
    const emailSubject = `[SOPORTE FACTURALES] - ${titulo.replace(/[<>"]/g, "")}`;

    const emailHtml = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
        <tr><td style="background-color:#ec8228;padding:28px 40px;">
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Nuevo Ticket de Soporte</h1>
        </td></tr>
        <tr><td style="padding:36px 40px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr>
              <td style="padding:8px 0;border-bottom:1px solid #e8e8e8;font-size:14px;color:#666;width:180px;"><strong>Nombre:</strong></td>
              <td style="padding:8px 0;border-bottom:1px solid #e8e8e8;font-size:14px;color:#333;">${escapeHtml(nombre)} ${escapeHtml(apellido)}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;border-bottom:1px solid #e8e8e8;font-size:14px;color:#666;"><strong>Email (formulario):</strong></td>
              <td style="padding:8px 0;border-bottom:1px solid #e8e8e8;font-size:14px;color:#333;">${escapeHtml(email)}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;border-bottom:1px solid #e8e8e8;font-size:14px;color:#666;"><strong>Email (cuenta):</strong></td>
              <td style="padding:8px 0;border-bottom:1px solid #e8e8e8;font-size:14px;color:#333;">${escapeHtml(userEmail)}</td>
            </tr>
            ${telefono ? `<tr>
              <td style="padding:8px 0;border-bottom:1px solid #e8e8e8;font-size:14px;color:#666;"><strong>Tel\u00e9fono:</strong></td>
              <td style="padding:8px 0;border-bottom:1px solid #e8e8e8;font-size:14px;color:#333;">${escapeHtml(telefono)}</td>
            </tr>` : ""}
            <tr>
              <td style="padding:8px 0;border-bottom:1px solid #e8e8e8;font-size:14px;color:#666;"><strong>T\u00edtulo:</strong></td>
              <td style="padding:8px 0;border-bottom:1px solid #e8e8e8;font-size:14px;color:#333;">${escapeHtml(titulo)}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;font-size:14px;color:#666;"><strong>User ID:</strong></td>
              <td style="padding:8px 0;font-size:14px;color:#333;">${user.id}</td>
            </tr>
          </table>
          <h3 style="margin:0 0 12px;font-size:16px;color:#333;">Descripci\u00f3n:</h3>
          <div style="background:#f8f8f8;border-radius:6px;padding:16px;font-size:14px;color:#333;line-height:1.6;">
            ${sanitizeHtml(descripcion)}
          </div>
        </td></tr>
        <tr><td style="padding:0 40px;"><hr style="border:none;border-top:1px solid #e8e8e8;margin:0;"></td></tr>
        <tr><td style="padding:20px 40px 28px;">
          <p style="margin:0;font-size:12px;color:#999;line-height:1.5;">
            Este ticket fue enviado desde la plataforma Facturales. Responde directamente al usuario en ${escapeHtml(email)} o ${escapeHtml(userEmail)}.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const resendCtrl = new AbortController();
    const resendTimer = setTimeout(() => resendCtrl.abort(), 15_000);

    let resendResponse: Response;
    try {
      resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: resendFrom,
          to: [supportEmail],
          subject: emailSubject,
          html: emailHtml,
          reply_to: email,
        }),
        signal: resendCtrl.signal,
      });
    } catch (e) {
      const isTimeout = e instanceof DOMException && e.name === "AbortError";
      return jsonResponse({
        error: isTimeout
          ? "El servicio de email no respondió a tiempo. Inténtalo de nuevo."
          : "Error de conexión con el servicio de email",
      }, 504);
    } finally {
      clearTimeout(resendTimer);
    }

    const resendResult = await resendResponse.json();

    if (!resendResponse.ok || !resendResult.id) {
      const errorMsg = resendResult.message || resendResult.error || JSON.stringify(resendResult);
      console.error("Resend error:", errorMsg);
      return jsonResponse({ error: "Error al enviar el ticket: " + errorMsg }, 502);
    }

    // Log the ticket
    await supabaseAdmin.from("support_tickets").insert({
      user_id: user.id,
      email: email,
      title: titulo,
      status: "sent",
      resend_message_id: resendResult.id,
    });

    return jsonResponse({
      success: true,
      message: "Ticket enviado correctamente",
    });
  } catch (error) {
    console.error("send-support-ticket error:", error);
    return jsonResponse({ error: error.message || "Error interno" }, 500);
  }
});
