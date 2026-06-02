// Verifactu — lógica AUTORITATIVA del servidor (huella encadenada, QR y campos del registro).
//
// Implementa los documentos oficiales de la AEAT:
//   - "Especificaciones técnicas para generación de la huella o hash" (v0.1.2)
//   - "Especificaciones técnicas del código QR de la factura" (v0.5.0)
//
// Usa SOLO APIs web estándar (crypto.subtle, TextEncoder, encodeURIComponent), idénticas en
// Deno (Edge Function) y Node (Vitest), de modo que este MISMO fichero se verifica con tests.
// Es la copia autoritativa server-side; la huella se calcula aquí (nunca en el cliente: sería forjable).
// Espejo verificado de `src/domain/rules/fiscal/*` (parity test contra los vectores oficiales).

export interface CamposHuellaAlta {
  idEmisorFactura: string;
  numSerieFactura: string;
  fechaExpedicionFactura: string;
  tipoFactura: string;
  cuotaTotal: string;
  importeTotal: string;
  huellaRegistroAnterior: string;
  fechaHoraHusoGenRegistro: string;
}

export interface CamposHuellaAnulacion {
  idEmisorFacturaAnulada: string;
  numSerieFacturaAnulada: string;
  fechaExpedicionFacturaAnulada: string;
  huellaRegistroAnterior: string;
  fechaHoraHusoGenRegistro: string;
}

function valor(v: string): string {
  return v.trim();
}

export function construirCadenaAlta(c: CamposHuellaAlta): string {
  return [
    `IDEmisorFactura=${valor(c.idEmisorFactura)}`,
    `NumSerieFactura=${valor(c.numSerieFactura)}`,
    `FechaExpedicionFactura=${valor(c.fechaExpedicionFactura)}`,
    `TipoFactura=${valor(c.tipoFactura)}`,
    `CuotaTotal=${valor(c.cuotaTotal)}`,
    `ImporteTotal=${valor(c.importeTotal)}`,
    `Huella=${valor(c.huellaRegistroAnterior)}`,
    `FechaHoraHusoGenRegistro=${valor(c.fechaHoraHusoGenRegistro)}`,
  ].join("&");
}

export function construirCadenaAnulacion(c: CamposHuellaAnulacion): string {
  return [
    `IDEmisorFacturaAnulada=${valor(c.idEmisorFacturaAnulada)}`,
    `NumSerieFacturaAnulada=${valor(c.numSerieFacturaAnulada)}`,
    `FechaExpedicionFacturaAnulada=${valor(c.fechaExpedicionFacturaAnulada)}`,
    `Huella=${valor(c.huellaRegistroAnterior)}`,
    `FechaHoraHusoGenRegistro=${valor(c.fechaHoraHusoGenRegistro)}`,
  ].join("&");
}

export async function sha256Hex(cadena: string): Promise<string> {
  const bytes = new TextEncoder().encode(cadena);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

export async function calcularHuellaAlta(c: CamposHuellaAlta): Promise<string> {
  return sha256Hex(construirCadenaAlta(c));
}

export async function calcularHuellaAnulacion(c: CamposHuellaAnulacion): Promise<string> {
  return sha256Hex(construirCadenaAnulacion(c));
}

// ---------- QR de cotejo (modo VERI*FACTU) ----------

export type EntornoAeat = "produccion" | "pruebas";

const BASE_VALIDAR_QR: Record<EntornoAeat, string> = {
  produccion: "https://www2.agenciatributaria.gob.es/wlpl/TIKE-CONT/ValidarQR",
  pruebas: "https://prewww2.aeat.es/wlpl/TIKE-CONT/ValidarQR",
};

export interface DatosQrCotejo {
  nif: string;
  numSerie: string;
  fecha: string;
  importe: string;
}

export function construirUrlCotejoQr(datos: DatosQrCotejo, entorno: EntornoAeat = "produccion"): string {
  const base = BASE_VALIDAR_QR[entorno];
  const params = [
    `nif=${encodeURIComponent(datos.nif.trim())}`,
    `numserie=${encodeURIComponent(datos.numSerie.trim())}`,
    `fecha=${encodeURIComponent(datos.fecha.trim())}`,
    `importe=${encodeURIComponent(datos.importe.trim())}`,
  ].join("&");
  return `${base}?${params}`;
}

// ---------- Mapeo factura → campos de la huella ----------

export function formatearFechaExpedicion(fechaIso: string): string {
  const soloFecha = fechaIso.slice(0, 10);
  const partes = soloFecha.split("-");
  if (partes.length !== 3 || partes.some((p) => p === "")) {
    throw new Error(`Fecha no válida para Verifactu (se esperaba ISO YYYY-MM-DD): ${fechaIso}`);
  }
  const [anio, mes, dia] = partes;
  return `${dia}-${mes}-${anio}`;
}

export function formatearImporte(importe: number): string {
  if (!Number.isFinite(importe)) {
    throw new Error(`Importe no válido para Verifactu: ${importe}`);
  }
  return importe.toFixed(2);
}

export function determinarTipoFactura(nifCliente: string | null | undefined): "F1" | "F2" {
  return nifCliente && nifCliente.trim() !== "" ? "F1" : "F2";
}
