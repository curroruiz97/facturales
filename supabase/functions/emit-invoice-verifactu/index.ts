// Supabase Edge Function: emit-invoice-verifactu
//
// Genera el registro de facturación VERI*FACTU (alta) de una factura YA emitida:
//  1) valida al usuario (auth.getUser),
//  2) carga la factura y comprueba propiedad + estado,
//  3) encadena con la huella del último registro del usuario,
//  4) calcula la huella (server-side) y el QR de cotejo,
//  5) inserta en `verifactu_registros` (append-only).
//
// La lógica fiscal vive en `../_shared/verifactu.ts` (verificada con Vitest contra vectores oficiales AEAT).
// ESTADO: pendiente de validar end-to-end contra el entorno de PREPRODUCCIÓN de la AEAT (requiere
// certificado). Aún NO está enganchada al flujo de emisión de la app ni envía a la AEAT
// (los registros quedan en estado 'pendiente'). verify_jwt=false en el gateway → validamos aquí.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCorsOptions, jsonResponse } from "../_shared/cors.ts";
import {
  calcularHuellaAlta,
  construirCadenaAlta,
  construirUrlCotejoQr,
  determinarTipoFactura,
  formatearFechaExpedicion,
  formatearImporte,
  type CamposHuellaAlta,
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

    // 1) Cargar la factura y validar propiedad + estado
    const { data: inv, error: invErr } = await admin
      .from("invoices")
      .select("id, user_id, status, invoice_number, issue_date, tax_amount, total_amount, invoice_data")
      .eq("id", invoiceId)
      .single();
    if (invErr || !inv) return jsonResponse(req, { error: "Factura no encontrada" }, 404);
    if (inv.user_id !== auth.id) return jsonResponse(req, { error: "Sin permisos sobre esta factura" }, 403);
    if (inv.status !== "issued") return jsonResponse(req, { error: "La factura debe estar emitida" }, 400);
    if (!inv.invoice_number) return jsonResponse(req, { error: "La factura no tiene número asignado" }, 400);

    // 2) Idempotencia: si ya existe registro de alta para esta factura, devolverlo
    const { data: existing } = await admin
      .from("verifactu_registros")
      .select("huella, qr_url, num_orden")
      .eq("invoice_id", invoiceId)
      .eq("tipo", "alta")
      .maybeSingle();
    if (existing) return jsonResponse(req, { ...existing, alreadyRegistered: true });

    // 3) NIF del emisor (obligatorio) y del cliente (determina F1/F2)
    const issuerNif = String(inv.invoice_data?.issuer?.nif ?? "").trim();
    const clientNif = String(inv.invoice_data?.client?.nif ?? "").trim();
    if (!issuerNif) return jsonResponse(req, { error: "Falta el NIF del emisor en la factura" }, 400);

    // 4) Encadenamiento: último registro del usuario
    //    NOTA: bajo alta concurrencia, dos emisiones simultáneas podrían leer el mismo anterior;
    //    la unicidad (user_id, num_orden) lo impide (una falla con 23505 y el cliente reintenta).
    //    Mejora futura: lock de aviso por usuario (pg_advisory_xact_lock) para serializar.
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

    // 5) Construir campos + huella + QR
    const fechaExpedicion = formatearFechaExpedicion(String(inv.issue_date));
    const importeTotal = formatearImporte(Number(inv.total_amount) || 0);
    const cuotaTotal = formatearImporte(Number(inv.tax_amount) || 0);
    const fechaHoraHusoGen = new Date().toISOString(); // marca temporal del servidor (con huso Z)
    const campos: CamposHuellaAlta = {
      idEmisorFactura: issuerNif,
      numSerieFactura: inv.invoice_number,
      fechaExpedicionFactura: fechaExpedicion,
      tipoFactura: determinarTipoFactura(clientNif),
      cuotaTotal,
      importeTotal,
      huellaRegistroAnterior: huellaAnterior,
      fechaHoraHusoGenRegistro: fechaHoraHusoGen,
    };
    const cadena = construirCadenaAlta(campos);
    const huella = await calcularHuellaAlta(campos);
    const qrUrl = construirUrlCotejoQr(
      { nif: issuerNif, numSerie: inv.invoice_number, fecha: fechaExpedicion, importe: importeTotal },
      "produccion",
    );

    // 6) Insertar registro (append-only)
    const { error: insErr } = await admin.from("verifactu_registros").insert({
      user_id: auth.id,
      tipo: "alta",
      invoice_id: invoiceId,
      id_emisor: issuerNif,
      num_serie_factura: inv.invoice_number,
      fecha_expedicion: fechaExpedicion,
      tipo_factura: campos.tipoFactura,
      cuota_total: cuotaTotal,
      importe_total: importeTotal,
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
          .eq("tipo", "alta")
          .maybeSingle();
        if (dup) return jsonResponse(req, { ...dup, alreadyRegistered: true });
      }
      return jsonResponse(req, { error: `No se pudo registrar la factura: ${insErr.message}` }, 500);
    }

    return jsonResponse(req, { huella, qrUrl, numOrden, estado: "pendiente" });
  } catch (e) {
    return jsonResponse(req, { error: (e as Error).message || "Error interno" }, 500);
  }
});
