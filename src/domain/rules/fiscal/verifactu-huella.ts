/**
 * Verifactu — cálculo de la huella (hash) encadenada de los registros de facturación.
 *
 * Implementa el documento oficial de la AEAT:
 *   "Detalle de las especificaciones técnicas para generación de la huella o hash
 *    de los registros de facturación" (v0.1.2, 27/08/2024).
 *
 * Reglas implementadas:
 *  - Los campos se concatenan en el ORDEN EXACTO definido por la AEAT como
 *    `nombreCampo=valor&...`.
 *  - El nombre del campo es constante; se eliminan espacios al inicio/fin del valor.
 *  - Si un campo está vacío, se emite `nombre=` sin valor (caso típico: la huella
 *    del registro anterior en el PRIMER registro de la cadena).
 *  - La cadena se codifica en UTF-8 y se aplica SHA-256 (único algoritmo permitido,
 *    Lista L12). La salida es hexadecimal en MAYÚSCULAS (64 caracteres).
 *
 * El encadenamiento se logra pasando la huella del registro anterior en
 * `huellaRegistroAnterior`; en el primer registro de la cadena se pasa "".
 *
 * Verificado byte a byte contra los vectores oficiales de la AEAT
 * (ver `__tests__/verifactu-huella.test.ts`). No usa `Date`/`Math.random`:
 * la marca temporal se inyecta como dato (`fechaHoraHusoGenRegistro`).
 */

/** Campos del RegistroAlta que entran en la huella, en el orden EXACTO exigido por la AEAT. */
export interface CamposHuellaAlta {
  /** NIF del emisor de la factura. */
  idEmisorFactura: string;
  /** Número + serie de la factura. */
  numSerieFactura: string;
  /** Fecha de expedición en formato DD-MM-AAAA. */
  fechaExpedicionFactura: string;
  /** Tipo de factura (F1, F2, R1–R5, ...). */
  tipoFactura: string;
  /** Cuota total (p. ej. "12.35"). */
  cuotaTotal: string;
  /** Importe total (p. ej. "123.45"). */
  importeTotal: string;
  /** Huella del registro anterior; "" en el primer registro de la cadena. */
  huellaRegistroAnterior: string;
  /** Fecha/hora con huso de generación del registro (ISO 8601, p. ej. 2024-01-01T19:20:30+01:00). */
  fechaHoraHusoGenRegistro: string;
}

/** Campos del RegistroAnulacion que entran en la huella, en el orden EXACTO exigido por la AEAT. */
export interface CamposHuellaAnulacion {
  /** NIF del emisor de la factura anulada. */
  idEmisorFacturaAnulada: string;
  /** Número + serie de la factura anulada. */
  numSerieFacturaAnulada: string;
  /** Fecha de expedición de la factura anulada (DD-MM-AAAA). */
  fechaExpedicionFacturaAnulada: string;
  /** Huella del registro anterior; "" en el primer registro de la cadena. */
  huellaRegistroAnterior: string;
  /** Fecha/hora con huso de generación del registro (ISO 8601). */
  fechaHoraHusoGenRegistro: string;
}

/** Regla AEAT: se eliminan los espacios al inicio y al final de cada valor. */
function valor(v: string): string {
  return v.trim();
}

/** Construye la cadena canónica del RegistroAlta (pura, sin hashear). */
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

/** Construye la cadena canónica del RegistroAnulacion (pura, sin hashear). */
export function construirCadenaAnulacion(c: CamposHuellaAnulacion): string {
  return [
    `IDEmisorFacturaAnulada=${valor(c.idEmisorFacturaAnulada)}`,
    `NumSerieFacturaAnulada=${valor(c.numSerieFacturaAnulada)}`,
    `FechaExpedicionFacturaAnulada=${valor(c.fechaExpedicionFacturaAnulada)}`,
    `Huella=${valor(c.huellaRegistroAnterior)}`,
    `FechaHoraHusoGenRegistro=${valor(c.fechaHoraHusoGenRegistro)}`,
  ].join("&");
}

/** SHA-256 de una cadena UTF-8, devuelta en hexadecimal MAYÚSCULAS (64 caracteres). */
export async function sha256Hex(cadena: string): Promise<string> {
  const bytes = new TextEncoder().encode(cadena);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

/** Calcula la huella de un RegistroAlta encadenándola con la del registro anterior. */
export async function calcularHuellaAlta(c: CamposHuellaAlta): Promise<string> {
  return sha256Hex(construirCadenaAlta(c));
}

/** Calcula la huella de un RegistroAnulacion encadenándola con la del registro anterior. */
export async function calcularHuellaAnulacion(c: CamposHuellaAnulacion): Promise<string> {
  return sha256Hex(construirCadenaAnulacion(c));
}
