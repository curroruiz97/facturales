import * as XLSX from "xlsx";
import type { ParsedInvoice } from "./types";
import { extractInvoiceFromText } from "./text-extractor";

/**
 * Parsea un archivo XLSX de factura. La estructura típica es una grid donde
 * cada celda contiene un fragmento ("Factura:" en A1, "ADG-2602" en B1, etc.).
 *
 * Para reutilizar el extractor de texto, convertimos la hoja a un texto donde
 * cada fila es una línea con celdas separadas por espacios. Las fechas vienen
 * como serial numérico de Excel; intentamos detectarlas y pasarlas al extractor.
 */
export async function parseInvoiceXlsx(file: File): Promise<ParsedInvoice> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: "array", cellDates: false });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error(`El archivo ${file.name} no tiene ninguna hoja.`);
  }
  const sheet = workbook.Sheets[firstSheetName];

  const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false, defval: "" });

  // Buscar el serial Excel de la fecha. Normalmente está en la fila que contiene
  // "Fecha" como primera celda.
  let excelDateSerial: number | null = null;
  for (const row of aoa) {
    if (!Array.isArray(row) || row.length < 2) continue;
    const first = String(row[0] ?? "").trim();
    if (/^Fecha\b/i.test(first)) {
      const second = row[1];
      if (typeof second === "number" && Number.isFinite(second)) {
        excelDateSerial = second;
        break;
      }
      // Si no es un serial, dejamos que el extractor lea la fecha del texto.
    }
  }

  // Construir texto: cada fila es una línea con las celdas separadas por espacios
  // (después de filtrar vacías). Conservamos el orden original.
  const lines: string[] = [];
  for (const row of aoa) {
    if (!Array.isArray(row)) continue;
    const cells = row
      .map((cell, idx) => {
        if (cell === null || cell === undefined || cell === "") return "";
        // Si es la celda de fecha y la hemos detectado como serial, la excluimos
        // del texto para no introducir el número confuso (el extractor usa
        // excelDateSerial directamente).
        if (excelDateSerial !== null && typeof cell === "number" && cell === excelDateSerial) {
          return "";
        }
        return String(cell).trim();
      })
      .filter((c) => c.length > 0);
    if (cells.length > 0) {
      lines.push(cells.join("   "));
    }
  }

  const text = lines.join("\n");
  return extractInvoiceFromText({
    text,
    excelDateSerial,
    fileName: file.name,
    fileKind: "xlsx",
  });
}
