/**
 * Verifactu — construcción de los campos del registro a partir de los datos de una factura.
 *
 * Convierte el modelo de la app (fecha ISO, importes numéricos) al formato EXACTO que exige
 * la AEAT para la huella, y compone los campos en el tipo `CamposHuellaAlta`.
 *
 * Funciones puras y deterministas (la marca temporal se inyecta como dato, no se usa `Date`).
 */

import type { CamposHuellaAlta, CamposHuellaAnulacion } from "./verifactu-huella";

/** Convierte una fecha ISO (`YYYY-MM-DD` o `YYYY-MM-DDT...`) al formato AEAT `DD-MM-AAAA`. */
export function formatearFechaExpedicion(fechaIso: string): string {
  const soloFecha = fechaIso.slice(0, 10);
  const partes = soloFecha.split("-");
  if (partes.length !== 3 || partes.some((p) => p === "")) {
    throw new Error(`Fecha no válida para Verifactu (se esperaba ISO YYYY-MM-DD): ${fechaIso}`);
  }
  const [anio, mes, dia] = partes;
  return `${dia}-${mes}-${anio}`;
}

/** Formatea un importe a string con punto decimal y 2 decimales (p. ej. 123.4 → "123.40"). */
export function formatearImporte(importe: number): string {
  if (!Number.isFinite(importe)) {
    throw new Error(`Importe no válido para Verifactu: ${importe}`);
  }
  return importe.toFixed(2);
}

/** F1 (factura completa) si hay NIF de cliente; F2 (simplificada) si no lo hay. */
export function determinarTipoFactura(nifCliente: string | null | undefined): "F1" | "F2" {
  return nifCliente && nifCliente.trim() !== "" ? "F1" : "F2";
}

/** Datos mínimos de una factura emitida necesarios para construir el registro de alta. */
export interface DatosFacturaParaRegistro {
  /** NIF del emisor. */
  nifEmisor: string;
  /** Número + serie de la factura (ya asignado al emitir). */
  numeroFactura: string;
  /** Fecha de expedición en ISO (`YYYY-MM-DD`). */
  fechaExpedicionIso: string;
  /** Tipo de factura (F1, F2, R1...). */
  tipoFactura: string;
  /** Cuota total de impuestos. */
  cuotaTotal: number;
  /** Importe total de la factura. */
  importeTotal: number;
  /** Huella del registro anterior de la cadena ("" si es el primero). */
  huellaRegistroAnterior: string;
  /** Marca temporal de generación con huso (ISO 8601). La inyecta el servidor en la emisión. */
  fechaHoraHusoGenRegistro: string;
}

/** Construye los campos de la huella de un RegistroAlta a partir de los datos de la factura. */
export function construirCamposHuellaAlta(d: DatosFacturaParaRegistro): CamposHuellaAlta {
  return {
    idEmisorFactura: d.nifEmisor,
    numSerieFactura: d.numeroFactura,
    fechaExpedicionFactura: formatearFechaExpedicion(d.fechaExpedicionIso),
    tipoFactura: d.tipoFactura,
    cuotaTotal: formatearImporte(d.cuotaTotal),
    importeTotal: formatearImporte(d.importeTotal),
    huellaRegistroAnterior: d.huellaRegistroAnterior,
    fechaHoraHusoGenRegistro: d.fechaHoraHusoGenRegistro,
  };
}

/** Datos mínimos para construir el registro de anulación de una factura. */
export interface DatosAnulacionParaRegistro {
  nifEmisor: string;
  numeroFactura: string;
  fechaExpedicionIso: string;
  huellaRegistroAnterior: string;
  fechaHoraHusoGenRegistro: string;
}

/** Construye los campos de la huella de un RegistroAnulacion. */
export function construirCamposHuellaAnulacion(d: DatosAnulacionParaRegistro): CamposHuellaAnulacion {
  return {
    idEmisorFacturaAnulada: d.nifEmisor,
    numSerieFacturaAnulada: d.numeroFactura,
    fechaExpedicionFacturaAnulada: formatearFechaExpedicion(d.fechaExpedicionIso),
    huellaRegistroAnterior: d.huellaRegistroAnterior,
    fechaHoraHusoGenRegistro: d.fechaHoraHusoGenRegistro,
  };
}
