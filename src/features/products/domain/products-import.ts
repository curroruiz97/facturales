import Papa from "papaparse";
import * as XLSX from "xlsx";
import type { CreateProductInput } from "../../../services/repositories/products.repository";
import { PRODUCT_TAX_OPTIONS, normalizeProductNumber } from "./product-pricing";

type ProductImportField =
  | "nombre"
  | "referencia"
  | "descripcion"
  | "precioCompra"
  | "precioVenta"
  | "impuesto"
  | "descuento";

export interface ProductImportRowResult {
  rowIndex: number;
  valid: boolean;
  data: CreateProductInput;
  errors: string[];
}

export interface ProductsImportPreview {
  headerMap: Record<string, ProductImportField>;
  unmappedHeaders: string[];
  missingHeaders: ProductImportField[];
  validRows: ProductImportRowResult[];
  invalidRows: ProductImportRowResult[];
  totalRows: number;
}

const REQUIRED_FIELDS: ProductImportField[] = ["nombre", "precioVenta"];

const HEADER_ALIASES: Record<ProductImportField, string[]> = {
  nombre: ["nombre", "producto", "name", "articulo", "servicio", "concepto"],
  referencia: ["referencia", "ref", "sku", "codigo", "reference"],
  descripcion: ["descripcion", "description", "detalle", "detalles"],
  precioCompra: [
    "precio compra",
    "precio_compra",
    "coste",
    "cost",
    "purchase price",
    "precio coste",
    "precio_coste",
  ],
  precioVenta: [
    "precio venta",
    "precio_venta",
    "precio",
    "price",
    "sale price",
    "pvp sin iva",
    "pvp_sin_iva",
  ],
  impuesto: ["impuesto", "iva", "tax", "tipo impuesto", "tipo_impuesto"],
  descuento: ["descuento", "discount", "dto", "%descuento"],
};

const MAX_IMPORT_FILE_BYTES = 10 * 1024 * 1024;

const TAX_CODES_BY_NORMALIZED_LABEL: Map<string, string> = (() => {
  const map = new Map<string, string>();
  for (const option of PRODUCT_TAX_OPTIONS) {
    map.set(normalizeText(option.code), option.code);
    map.set(normalizeText(option.label), option.code);
    map.set(normalizeText(String(option.rate)), option.code);
  }
  return map;
})();

function normalizeText(value: unknown): string {
  if (typeof value !== "string" && typeof value !== "number") return "";
  return String(value)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function mapHeader(header: string): ProductImportField | null {
  const normalized = normalizeText(header);
  const entries = Object.entries(HEADER_ALIASES) as Array<[ProductImportField, string[]]>;
  for (const [field, aliases] of entries) {
    if (aliases.some((alias) => normalizeText(alias) === normalized)) {
      return field;
    }
  }
  return null;
}

function normalizeHeaderMap(headers: string[]): {
  headerMap: Record<string, ProductImportField>;
  unmappedHeaders: string[];
  missingHeaders: ProductImportField[];
} {
  const headerMap: Record<string, ProductImportField> = {};
  const assigned = new Set<ProductImportField>();
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

export function normalizeImportTaxCode(value: unknown): string {
  const normalized = normalizeText(value);
  if (!normalized) return "IVA_21";
  const mapped = TAX_CODES_BY_NORMALIZED_LABEL.get(normalized);
  if (mapped) return mapped;
  const stripped = normalized.replace(/[^0-9.,]/g, "").replace(",", ".");
  const mappedStripped = TAX_CODES_BY_NORMALIZED_LABEL.get(stripped);
  if (mappedStripped) return mappedStripped;
  return "IVA_21";
}

export function validateImportRow(row: Record<ProductImportField, string>, rowIndex: number): ProductImportRowResult {
  const errors: string[] = [];
  const nombre = row.nombre.trim();
  if (!nombre) errors.push("Falta nombre del producto");

  const rawPrecioVenta = row.precioVenta.trim();
  if (!rawPrecioVenta) errors.push("Falta precio de venta");
  const precioVenta = normalizeProductNumber(rawPrecioVenta, Number.NaN);
  if (rawPrecioVenta && (!Number.isFinite(precioVenta) || precioVenta < 0)) {
    errors.push(`Precio de venta inválido: ${rawPrecioVenta}`);
  }

  const rawPrecioCompra = row.precioCompra.trim();
  let precioCompra: number | null = null;
  if (rawPrecioCompra) {
    const parsed = normalizeProductNumber(rawPrecioCompra, Number.NaN);
    if (!Number.isFinite(parsed) || parsed < 0) {
      errors.push(`Precio de compra inválido: ${rawPrecioCompra}`);
    } else {
      precioCompra = parsed;
    }
  }

  const rawDescuento = row.descuento.trim();
  let descuento = 0;
  if (rawDescuento) {
    const parsed = normalizeProductNumber(rawDescuento, Number.NaN);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
      errors.push(`Descuento inválido: ${rawDescuento}`);
    } else {
      descuento = parsed;
    }
  }

  const data: CreateProductInput = {
    nombre,
    referencia: row.referencia.trim() || null,
    descripcion: row.descripcion.trim() || null,
    precioCompra,
    precioVenta: Number.isFinite(precioVenta) ? precioVenta : 0,
    impuesto: normalizeImportTaxCode(row.impuesto),
    descuento,
  };

  return { rowIndex, valid: errors.length === 0, data, errors };
}

function mapRawRows(
  rows: Record<string, unknown>[],
  headerMap: Record<string, ProductImportField>,
): { validRows: ProductImportRowResult[]; invalidRows: ProductImportRowResult[] } {
  const validRows: ProductImportRowResult[] = [];
  const invalidRows: ProductImportRowResult[] = [];

  rows.forEach((rawRow, index) => {
    const mappedRow: Record<ProductImportField, string> = {
      nombre: "",
      referencia: "",
      descripcion: "",
      precioCompra: "",
      precioVenta: "",
      impuesto: "",
      descuento: "",
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
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
}

async function parseImportFile(file: File): Promise<{ headers: string[]; rows: Record<string, unknown>[] }> {
  if (file.size <= 0) throw new Error("El archivo está vacío.");
  if (file.size > MAX_IMPORT_FILE_BYTES) throw new Error("El archivo supera el tamaño máximo de 10 MB.");

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

export async function processProductsImportFile(file: File): Promise<ProductsImportPreview> {
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

export interface ProductsCsvRow {
  nombre: string;
  referencia: string | null;
  descripcion: string | null;
  precioCompra: number | null;
  precioVenta: number;
  impuesto: string;
  descuento: number;
}

export function buildProductsCsv(rows: ProductsCsvRow[]): string {
  const headers = [
    "Nombre",
    "Referencia",
    "Descripción",
    "Precio Compra",
    "Precio Venta",
    "Impuesto",
    "Descuento",
  ];

  const serialized = rows.map((row) => {
    const cells = [
      row.nombre,
      row.referencia ?? "",
      row.descripcion ?? "",
      row.precioCompra ?? "",
      row.precioVenta,
      row.impuesto,
      row.descuento,
    ];

    return cells
      .map((cell) => {
        const escaped = String(cell).replace(/"/g, '""');
        return `"${escaped}"`;
      })
      .join(",");
  });

  return `\uFEFF${headers.join(",")}\n${serialized.join("\n")}`;
}
