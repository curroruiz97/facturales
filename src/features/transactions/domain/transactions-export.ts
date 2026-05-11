import * as XLSX from "xlsx";
import { calculateExpenseBreakdown } from "./transaction-amounts";
import { formatTransactionCategory, formatTransactionType, type TransactionLedgerItem } from "./transactions-domain";

/**
 * Mapea una transacción a una fila plana con TODOS los campos disponibles.
 * Esta forma se usa tanto para CSV como para Excel — un único punto de verdad
 * sobre qué se exporta y con qué orden/nombre de columnas.
 */
function toExportRow(transaction: TransactionLedgerItem): Record<string, string | number | null> {
  const breakdown = calculateExpenseBreakdown(transaction.importe, transaction.ivaPorcentaje, transaction.irpfPorcentaje);
  const isExpense = transaction.tipo === "gasto";
  return {
    "ID": transaction.id,
    "Fecha": transaction.fecha,
    "Concepto": transaction.concepto,
    "Categoría": formatTransactionCategory(transaction.categoria),
    "Tipo": formatTransactionType(transaction.tipo),
    "Importe total (€)": Number(transaction.importe.toFixed(2)),
    "IVA %": transaction.ivaPorcentaje ?? "",
    "Cuota IVA (€)": isExpense && transaction.ivaPorcentaje !== null ? Number(breakdown.cuotaIva.toFixed(2)) : "",
    "IRPF %": transaction.irpfPorcentaje ?? "",
    "Cuota IRPF (€)": isExpense && transaction.irpfPorcentaje !== null ? Number(breakdown.cuotaIrpf.toFixed(2)) : "",
    "Base imponible (€)": isExpense && (transaction.ivaPorcentaje !== null || transaction.irpfPorcentaje !== null)
      ? Number(breakdown.base.toFixed(2))
      : "",
    "Cliente / Contacto": transaction.clientName ?? "",
    "NIF / Identificador": transaction.clientIdentifier ?? "",
    "ID de cliente": transaction.clienteId ?? "",
    "Referencia bancaria": transaction.referenciaBancaria ?? "",
    "Observaciones": transaction.observaciones ?? "",
    "Deducible fiscalmente": transaction.deducible ? "Sí" : "No",
    "Origen": transaction.origin === "invoice" ? "Generada desde factura" : "Manual",
    "ID factura asociada": transaction.invoiceId ?? "",
    "Bloqueada por factura": transaction.lockedByInvoice ? "Sí" : "No",
    "Creada en": transaction.createdAt,
    "Actualizada en": transaction.updatedAt,
  };
}

/**
 * Escapa un valor para CSV RFC-4180: envuelve en comillas dobles si contiene
 * coma, punto y coma, salto de línea o la propia comilla, y duplica las
 * comillas internas.
 */
function escapeCsvCell(value: string | number | null): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",;\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Construye un CSV (separador `;`, compatible con Excel español) con todos los
 * campos de las transacciones. Incluye BOM UTF-8 para que Excel reconozca las
 * tildes y los símbolos como € correctamente al abrir el archivo.
 */
export function buildTransactionsCsv(transactions: TransactionLedgerItem[]): string {
  if (transactions.length === 0) return "";
  const rows = transactions.map(toExportRow);
  const headers = Object.keys(rows[0]);
  const headerLine = headers.map(escapeCsvCell).join(";");
  const dataLines = rows.map((row) => headers.map((h) => escapeCsvCell(row[h])).join(";"));
  return "﻿" + [headerLine, ...dataLines].join("\r\n");
}

/**
 * Construye un workbook Excel (xlsx) con todos los campos de las transacciones.
 * Devuelve un ArrayBuffer listo para descargar como Blob.
 */
export function buildTransactionsXlsx(transactions: TransactionLedgerItem[]): ArrayBuffer {
  const rows = transactions.map(toExportRow);
  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Ajustar anchos de columna en base al contenido (mínimo 12, máximo 50).
  if (rows.length > 0) {
    const headers = Object.keys(rows[0]);
    worksheet["!cols"] = headers.map((header) => {
      const maxLen = rows.reduce((acc, row) => {
        const v = row[header];
        const len = v === null || v === undefined ? 0 : String(v).length;
        return len > acc ? len : acc;
      }, header.length);
      return { wch: Math.min(50, Math.max(12, maxLen + 2)) };
    });
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Transacciones");
  return XLSX.write(workbook, { type: "array", bookType: "xlsx" });
}

/**
 * Sugerencia de nombre de archivo con fecha actual (YYYY-MM-DD).
 */
export function buildExportFilename(extension: "csv" | "xlsx"): string {
  const today = new Date().toISOString().slice(0, 10);
  return `transacciones_${today}.${extension}`;
}
