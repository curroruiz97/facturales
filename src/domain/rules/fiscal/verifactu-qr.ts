/**
 * Verifactu — construcción del contenido del código QR de cotejo (AEAT).
 *
 * Doc oficial: "Detalle de las especificaciones técnicas del código QR de la factura" (v0.5.0).
 * El QR codifica la URL del servicio de cotejo de la AEAT con 4 parámetros, EN ESTE ORDEN:
 *   nif, numserie, fecha, importe
 * Cada valor se codifica con URL-encoding (UTF-8); por ejemplo, un '&' dentro de la serie
 * se convierte en %26 (de lo contrario rompería el parseo de parámetros).
 *
 * Especificación VISUAL (se aplica al renderizar la imagen, no aquí):
 *   - Tamaño 30×30–40×40 mm, zona de silencio ≥ 2 mm.
 *   - Norma ISO/IEC 18004:2015, nivel de corrección de errores M.
 *   - Debajo del QR, el texto «VERI*FACTU» o «Factura verificable en la sede electrónica de la AEAT».
 */

export type EntornoAeat = "produccion" | "pruebas";

/** URLs base del servicio de cotejo para sistemas VERI*FACTU (con remisión). */
const BASE_VALIDAR_QR: Record<EntornoAeat, string> = {
  produccion: "https://www2.agenciatributaria.gob.es/wlpl/TIKE-CONT/ValidarQR",
  pruebas: "https://prewww2.aeat.es/wlpl/TIKE-CONT/ValidarQR",
};

export interface DatosQrCotejo {
  /** NIF del emisor. */
  nif: string;
  /** Número + serie de la factura. */
  numSerie: string;
  /** Fecha de expedición en formato DD-MM-AAAA. */
  fecha: string;
  /** Importe total con punto decimal (p. ej. "241.4"). */
  importe: string;
}

/**
 * Construye la URL de cotejo que se codifica dentro del QR (modalidad VERI*FACTU).
 * Cada valor se URL-encodea, de modo que caracteres reservados (p. ej. '&') quedan
 * como %26 y no rompen el parseo de los parámetros.
 */
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
