import Papa from "papaparse";
import * as XLSX from "xlsx";
import type { CreateClientInput } from "../../../services/repositories/clients.repository";

type ContactImportField =
  | "nombreRazonSocial"
  | "identificador"
  | "email"
  | "telefono"
  | "direccion"
  | "codigoPostal"
  | "ciudad"
  | "provincia"
  | "pais"
  | "diaFacturacion"
  | "estado"
  | "tipoCliente";

export interface ContactImportRowResult {
  rowIndex: number;
  valid: boolean;
  data: CreateClientInput;
  errors: string[];
}

export interface ContactsImportPreview {
  headerMap: Record<string, ContactImportField>;
  unmappedHeaders: string[];
  missingHeaders: ContactImportField[];
  validRows: ContactImportRowResult[];
  invalidRows: ContactImportRowResult[];
  totalRows: number;
}

const REQUIRED_FIELDS: ContactImportField[] = ["nombreRazonSocial", "identificador"];

const HEADER_ALIASES: Record<ContactImportField, string[]> = {
  nombreRazonSocial: [
    "nombre",
    "razon social",
    "razon_social",
    "razon social",
    "nombre razon social",
    "nombre_razon_social",
    "empresa",
    "cliente",
  ],
  identificador: ["identificador", "nif", "cif", "nif/cif", "nif_cif", "dni", "vat", "tax id", "tax_id"],
  email: ["email", "correo", "correo electronico", "mail", "e-mail"],
  telefono: ["telefono", "telefono movil", "movil", "phone", "tel", "celular"],
  direccion: ["direccion", "domicilio", "address", "calle"],
  codigoPostal: ["codigo postal", "codigo_postal", "cp", "postal", "zip"],
  ciudad: ["ciudad", "localidad", "municipio", "city", "poblacion"],
  provincia: ["provincia", "region", "state"],
  pais: ["pais", "country"],
  diaFacturacion: ["dia facturacion", "dia_facturacion", "billing day", "billing_day", "dia"],
  estado: ["estado", "status", "tipo estado"],
  tipoCliente: ["tipo cliente", "tipo_cliente", "client type", "tipo contacto", "tipo_contacto"],
};

const ESTADO_RECURRENTE = new Set(["recurrente", "recurrent", "activo", "active", "si", "yes"]);
const ESTADO_PUNTUAL = new Set(["puntual", "one-off", "inactivo", "inactive", "no", "oneoff"]);
const CLIENTE_EMPRESA = new Set(["empresa", "company", "sociedad"]);
const CLIENTE_AUTONOMO = new Set(["autonomo", "autonomo/a", "self-employed", "freelance", "persona"]);
const MAX_IMPORT_FILE_BYTES = 10 * 1024 * 1024;

function normalizeText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function mapHeader(header: string): ContactImportField | null {
  const normalized = normalizeText(header);
  const entries = Object.entries(HEADER_ALIASES) as Array<[ContactImportField, string[]]>;
  for (const [field, aliases] of entries) {
    if (aliases.some((alias) => normalizeText(alias) === normalized)) {
      return field;
    }
  }
  return null;
}

export function normalizeImportStatus(value: unknown): "recurrente" | "puntual" {
  const normalized = normalizeText(value);
  if (!normalized) return "recurrente";
  if (ESTADO_PUNTUAL.has(normalized)) return "puntual";
  if (ESTADO_RECURRENTE.has(normalized)) return "recurrente";
  return "recurrente";
}

export function normalizeImportClientType(value: unknown): "autonomo" | "empresa" {
  const normalized = normalizeText(value);
  if (!normalized) return "autonomo";
  if (CLIENTE_EMPRESA.has(normalized)) return "empresa";
  if (CLIENTE_AUTONOMO.has(normalized)) return "autonomo";
  return "autonomo";
}

function normalizeHeaderMap(headers: string[]): {
  headerMap: Record<string, ContactImportField>;
  unmappedHeaders: string[];
  missingHeaders: ContactImportField[];
} {
  const headerMap: Record<string, ContactImportField> = {};
  const assigned = new Set<ContactImportField>();
  const unmappedHeaders: string[] = [];

  for (const header of headers) {
    const field = mapHeader(header);
    if (!field || assigned.has(field)) {
      unmappedHeaders.push(header);
      continue;
    }
    headerMap[header] = field;
    assigned.add(field);
  }

  const missingHeaders = REQUIRED_FIELDS.filter((field) => !assigned.has(field));

  return { headerMap, unmappedHeaders, missingHeaders };
}

function readMappedValue(row: Record<string, unknown>, originalHeader: string): string {
  const value = row[originalHeader];
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

export function validateImportRow(row: Record<ContactImportField, string>, rowIndex: number): ContactImportRowResult {
  const errors: string[] = [];

  const nombreRazonSocial = row.nombreRazonSocial.trim();
  const identificador = row.identificador.trim().toUpperCase();

  if (!nombreRazonSocial) errors.push("Falta nombre o razón social");
  if (!identificador) errors.push("Falta identificador (NIF/CIF)");

  const email = row.email.trim() || null;
  if (email) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      errors.push(`Email inválido: ${email}`);
    }
  }

  const rawBillingDay = row.diaFacturacion.trim();
  let diaFacturacion: number | null = null;
  if (rawBillingDay) {
    const parsed = Number.parseInt(rawBillingDay, 10);
    if (Number.isNaN(parsed) || parsed < 1 || parsed > 31) {
      errors.push(`Día de facturación inválido: ${rawBillingDay}`);
    } else {
      diaFacturacion = parsed;
    }
  }

  const data: CreateClientInput = {
    nombreRazonSocial,
    identificador,
    email,
    telefono: row.telefono.trim() || null,
    direccion: row.direccion.trim() || null,
    codigoPostal: row.codigoPostal.trim() || null,
    ciudad: row.ciudad.trim() || null,
    provincia: row.provincia.trim() || null,
    pais: row.pais.trim() || null,
    diaFacturacion,
    estado: normalizeImportStatus(row.estado),
    tipoCliente: normalizeImportClientType(row.tipoCliente),
  };

  return {
    rowIndex,
    valid: errors.length === 0,
    data,
    errors,
  };
}

function mapRawRows(
  rows: Record<string, unknown>[],
  headerMap: Record<string, ContactImportField>,
): { validRows: ContactImportRowResult[]; invalidRows: ContactImportRowResult[] } {
  const validRows: ContactImportRowResult[] = [];
  const invalidRows: ContactImportRowResult[] = [];

  rows.forEach((rawRow, index) => {
    const mappedRow: Record<ContactImportField, string> = {
      nombreRazonSocial: "",
      identificador: "",
      email: "",
      telefono: "",
      direccion: "",
      codigoPostal: "",
      ciudad: "",
      provincia: "",
      pais: "",
      diaFacturacion: "",
      estado: "",
      tipoCliente: "",
    };

    Object.entries(headerMap).forEach(([originalHeader, field]) => {
      mappedRow[field] = readMappedValue(rawRow, originalHeader);
    });

    const result = validateImportRow(mappedRow, index + 2);
    if (result.valid) validRows.push(result);
    else invalidRows.push(result);
  });

  return { validRows, invalidRows };
}

function parseCsvFile(file: File): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          const critical = results.errors.find((error) => error.type !== "FieldMismatch");
          if (critical) {
            reject(new Error(`Error al parsear CSV: ${critical.message}`));
            return;
          }
        }
        resolve(results.data ?? []);
      },
      error: (error) => reject(new Error(`Error al leer CSV: ${error.message}`)),
    });
  });
}

async function parseXlsxFile(file: File): Promise<Record<string, unknown>[]> {
  const content = await file.arrayBuffer();
  const workbook = XLSX.read(content, { type: "array" });
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) return [];
  const sheet = workbook.Sheets[firstSheet];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  return rows;
}

async function parseImportFile(file: File): Promise<{ headers: string[]; rows: Record<string, unknown>[] }> {
  if (file.size <= 0) {
    throw new Error("El archivo está vacío.");
  }
  if (file.size > MAX_IMPORT_FILE_BYTES) {
    throw new Error("El archivo supera el tamaño máximo de 10 MB.");
  }

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (extension === "csv") {
    const rows = await parseCsvFile(file);
    const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
    return { headers, rows };
  }

  if (extension === "xlsx" || extension === "xls") {
    const rows = await parseXlsxFile(file);
    const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
    return { headers, rows };
  }

  throw new Error("Formato no soportado. Usa CSV o XLSX.");
}

export async function processContactsImportFile(file: File): Promise<ContactsImportPreview> {
  const parsed = await parseImportFile(file);
  const normalizedHeaders = normalizeHeaderMap(parsed.headers);
  if (normalizedHeaders.missingHeaders.length > 0) {
    throw new Error(`Faltan columnas obligatorias: ${normalizedHeaders.missingHeaders.join(", ")}`);
  }

  const mapped = mapRawRows(parsed.rows, normalizedHeaders.headerMap);

  return {
    headerMap: normalizedHeaders.headerMap,
    unmappedHeaders: normalizedHeaders.unmappedHeaders,
    missingHeaders: normalizedHeaders.missingHeaders,
    validRows: mapped.validRows,
    invalidRows: mapped.invalidRows,
    totalRows: parsed.rows.length,
  };
}

export interface ContactsCsvRow {
  nombreRazonSocial: string;
  identificador: string;
  tipoCliente: string;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  ciudad: string | null;
  provincia: string | null;
  codigoPostal: string | null;
  pais: string | null;
  diaFacturacion: number | null;
  estado: string;
  totalFacturado: number;
}

export function buildContactsCsv(rows: ContactsCsvRow[]): string {
  const headers = [
    "Nombre / Razón Social",
    "NIF/CIF",
    "Tipo Cliente",
    "Email",
    "Teléfono",
    "Dirección",
    "Ciudad",
    "Provincia",
    "Código Postal",
    "País",
    "Día Facturación",
    "Estado",
    "Total Facturado",
  ];

  const serialized = rows.map((row) => {
    const cells = [
      row.nombreRazonSocial,
      row.identificador,
      row.tipoCliente,
      row.email ?? "",
      row.telefono ?? "",
      row.direccion ?? "",
      row.ciudad ?? "",
      row.provincia ?? "",
      row.codigoPostal ?? "",
      row.pais ?? "",
      row.diaFacturacion ?? "",
      row.estado,
      row.totalFacturado.toFixed(2),
    ];

    return cells
      .map((cell) => {
        const escaped = String(cell).replace(/"/g, "\"\"");
        return `"${escaped}"`;
      })
      .join(",");
  });

  return `\uFEFF${headers.join(",")}\n${serialized.join("\n")}`;
}
