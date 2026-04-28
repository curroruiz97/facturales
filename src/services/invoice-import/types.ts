/**
 * Datos extraídos de una factura previamente emitida (PDF o XLSX).
 * Estructura intermedia antes de persistirla en la base de datos.
 */
export interface ParsedInvoice {
  /** Nombre del archivo origen (para mostrar al usuario). */
  fileName: string;
  /** Tipo de archivo origen. */
  fileKind: "pdf" | "xlsx";
  /** Serie de facturación (ej. "ADG", "A", "FAC2026"). Inferida del prefijo del número. */
  series: string;
  /** Número COMPLETO de la factura (ej. "ADG-2601"). Se respeta tal cual al persistir. */
  invoiceNumber: string;
  /** Solo la parte numérica (ej. "2601"). Para detectar duplicados. */
  numberOnly: string;
  /** Fecha de emisión en formato ISO (YYYY-MM-DD). */
  issueDate: string;
  /** Cliente extraído del bloque CLIENTE. */
  client: ParsedClient;
  /** Concepto / descripción del servicio (puede ser multilínea). */
  concept: string;
  /** Base imponible (subtotal sin IVA). */
  base: number;
  /** Tipo de IVA en porcentaje (ej. 21). 0 si exento. */
  ivaRate: number;
  /** Cuota de IVA en €. */
  ivaAmount: number;
  /** Tipo de IRPF si aplica (porcentaje). null si no hay retención. */
  irpfRate: number | null;
  /** Cuota de IRPF retenida en €. null si no aplica. */
  irpfAmount: number | null;
  /** Total final pagado (= base + IVA − IRPF). */
  total: number;
  /** IBAN del emisor si está presente. */
  iban: string | null;
  /** Avisos detectados durante el parseo (ej. "Fecha posiblemente errónea"). */
  warnings: string[];
  /** Texto crudo extraído (debug). */
  rawText: string;
}

export interface ParsedClient {
  name: string;
  /** NIF/CIF normalizado en mayúsculas. */
  identifier: string;
  address: string;
  postalCode: string;
  city: string;
  /** Detectada por código postal o explícita en el PDF. null si no se pudo. */
  province: string | null;
}

export interface InvoiceImportSummary {
  imported: number;
  skipped: number;
  failed: number;
  duplicates: string[]; // números de factura duplicados omitidos
  errors: Array<{ fileName: string; message: string }>;
}

export type ImportRowStatus =
  | "pending" // pendiente de procesar
  | "parsing" // analizando archivo
  | "parsed" // analizado correctamente, listo para importar
  | "duplicate" // ya existe una factura con ese número
  | "importing" // siendo persistido
  | "imported" // creado correctamente
  | "error"; // error en parseo o persistencia

export interface ImportRow {
  fileName: string;
  fileSize: number;
  status: ImportRowStatus;
  parsed: ParsedInvoice | null;
  errorMessage: string | null;
}
