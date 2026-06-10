// Supabase Edge Function: anular-invoice-verifactu
//
// Genera el registro de facturación VERI*FACTU de ANULACIÓN de una factura ya anulada:
//  1) valida al usuario (auth.getUser),
//  2) carga la factura y comprueba propiedad + estado 'cancelled',
//  3) exige que exista un registro de ALTA previo de esa factura (no se anula lo no registrado),
//  4) encadena con la huella del último registro del usuario,
//  5) calcula la huella de anulación (server-side) y reutiliza el QR de cotejo de la factura,
//  6) inserta en `verifactu_registros` (tipo='anulacion', append-only).
//
// Solo actúa si el usuario tiene verifactu_enabled=true. El ENVÍO a la AEAT es un paso posterior
// (requiere certificado / colaboración social Tipo 017). verify_jwt=false en el gateway → validamos aquí.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCorsOptions, jsonResponse } from "../_shared/cors.ts";
import {
  calcularHuellaAnulacion,
  construirCadenaAnulacion,
  construirUrlCotejoQr,
  formatearFechaExpedicion,
  formatearImporte,
  type CamposHuellaAnulacion,
} from "../_shared/verifactu.ts";

async function authenticateUser(authHeader: string): Promise<{ id: string } | null> {
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data?.user) return null;
  return { id: data.user.id };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return handleCorsOptions(req);

  try {
    const auth = await authenticateUser(req.headers.get("Authorization") || "");
    if (!auth) return jsonResponse(req, { error: "No autorizado: token inválido" }, 401);

    const { invoiceId } = (await req.json()) as { invoiceId?: string };
    if (!invoiceId) return jsonResponse(req, { error: "invoiceId es obligatorio" }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // 1) Cargar la factura y validar propiedad + estado (debe estar anulada)
    const { data: inv, error: invErr } = await admin
      .from("invoices")
      .select("id, user_id, status, invoice_number, issue_date, total_amount, invoice_data")
      .eq("id", invoiceId)
      .single();
    if (invErr || !inv) return jsonResponse(req, { error: "Factura no encontrada" }, 404);
    if (inv.user_id !== auth.id) return jsonResponse(req, { error: "Sin permisos sobre esta factura" }, 403);
    if (inv.status !== "cancelled") return jsonResponse(req, { error: "La factura debe estar anulada" }, 400);
    if (!inv.invoice_number) return jsonResponse(req, { error: "La factura no tiene número asignado" }, 400);

    // 1b) Solo si el usuario ha activado Veri*Factu.
    const { data: bi } = await admin
      .from("business_info")
      .select("verifactu_enabled")
      .eq("user_id", auth.id)
      .maybeSingle();
    if (!bi?.verifactu_enabled) {
      return jsonResponse(req, { skipped: true, reason: "verifactu_disabled" });
    }

    // 2) Debe existir un registro de ALTA de esta factura
    const { data: alta } = await admin
      .from("verifactu_registros")
      .select("id")
      .eq("invoice_id", invoiceId)
      .eq("tipo", "alta")
      .maybeSingle();
    if (!alta) return jsonResponse(req, { error: "No existe registro de alta para esta factura" }, 400);

    // 3) Idempotencia: si ya existe la anulación, devolverla
    const { data: existing } = await admin
      .from("verifactu_registros")
      .select("huella, qr_url, num_orden")
      .eq("invoice_id", invoiceId)
      .eq("tipo", "anulacion")
      .maybeSingle();
    if (existing) return jsonResponse(req, { ...existing, alreadyRegistered: true });

    const issuerNif = String(inv.invoice_data?.issuer?.nif ?? "").trim();
    if (!issuerNif) return jsonResponse(req, { error: "Falta el NIF del emisor en la factura" }, 400);

    // 4) Encadenamiento: último registro del usuario
    const { data: prev } = await admin
      .from("verifactu_registros")
      .select("huella, num_orden")
      .eq("user_id", auth.id)
      .order("num_orden", { ascending: false })
      .limit(1)
      .maybeSingle();
    const huellaAnterior = prev?.huella ?? "";
    const numOrden = (prev?.num_orden ?? 0) + 1;
    const esPrimero = !prev;

    // 5) Construir campos + huella + QR (cotejo de la factura anulada)
    const fechaExpedicion = formatearFechaExpedicion(String(inv.issue_date));
    const importeTotal = formatearImporte(Number(inv.total_amount) || 0);
    const fechaHoraHusoGen = new Date().toISOString();
    const campos: CamposHuellaAnulacion = {
      idEmisorFacturaAnulada: issuerNif,
      numSerieFacturaAnulada: inv.invoice_number,
      fechaExpedicionFacturaAnulada: fechaExpedicion,
      huellaRegistroAnterior: huellaAnterior,
      fechaHoraHusoGenRegistro: fechaHoraHusoGen,
    };
    const cadena = construirCadenaAnulacion(campos);
    const huella = await calcularHuellaAnulacion(campos);
    const qrUrl = construirUrlCotejoQr(
      { nif: issuerNif, numSerie: inv.invoice_number, fecha: fechaExpedicion, importe: importeTotal },
      "produccion",
    );

    // 6) Insertar registro de anulación (append-only)
    const { error: insErr } = await admin.from("verifactu_registros").insert({
      user_id: auth.id,
      tipo: "anulacion",
      invoice_id: invoiceId,
      id_emisor: issuerNif,
      num_serie_factura: inv.invoice_number,
      fecha_expedicion: fechaExpedicion,
      tipo_factura: null,
      cuota_total: null,
      importe_total: null,
      num_orden: numOrden,
      es_primer_registro: esPrimero,
      huella_anterior: huellaAnterior,
      huella,
      fecha_hora_huso_gen: fechaHoraHusoGen,
      cadena_canonica: cadena,
      qr_url: qrUrl,
      estado_envio: "pendiente",
    });
    if (insErr) {
      if (insErr.code === "23505") {
        const { data: dup } = await admin
          .from("verifactu_registros")
          .select("huella, qr_url, num_orden")
          .eq("invoice_id", invoiceId)
          .eq("tipo", "anulacion")
          .maybeSingle();
        if (dup) return jsonResponse(req, { ...dup, alreadyRegistered: true });
      }
      return jsonResponse(req, { error: `No se pudo registrar la anulación: ${insErr.message}` }, 500);
    }

    return jsonResponse(req, { huella, qrUrl, numOrden, estado: "pendiente" });
  } catch (e) {
    return jsonResponse(req, { error: (e as Error).message || "Error interno" }, 500);
  }
});
