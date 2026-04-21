import JSZip from "jszip";
import {
  clientsRepository,
  invoicesRepository,
  productsRepository,
  quotesRepository,
  transactionsRepository,
} from "../repositories";
import { invoiceSeriesService } from "../invoice-series/invoice-series.service";
import { businessInfoService } from "../business/business-info.service";
import { fail, ok, type ServiceResult } from "../../shared/types/service-result";

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = typeof value === "string" ? value : JSON.stringify(value);
  return `"${str.replace(/"/g, '""')}"`;
}

function buildCsv<T>(rows: T[], columns: Array<{ header: string; get: (row: T) => unknown }>): string {
  const headerLine = columns.map((col) => csvEscape(col.header)).join(",");
  const bodyLines = rows.map((row) => columns.map((col) => csvEscape(col.get(row))).join(","));
  return `\uFEFF${headerLine}\n${bodyLines.join("\n")}`;
}

export interface DataExportResult {
  blob: Blob;
  filename: string;
}

/**
 * Genera un ZIP con todos los datos del usuario (contactos, productos, facturas,
 * presupuestos, gastos/ingresos, series y datos fiscales). Reutiliza los repositorios
 * que ya filtran por `user_id` vía RLS, así que cada usuario obtiene solo sus datos.
 */
export async function exportAllDataAsZip(): Promise<ServiceResult<DataExportResult>> {
  try {
    const [clientsResult, productsResult, invoicesResult, quotesResult, transactionsResult, seriesResult, businessResult] = await Promise.all([
      clientsRepository.list(""),
      productsRepository.list(""),
      invoicesRepository.list({}),
      quotesRepository.list({}),
      transactionsRepository.list({}),
      invoiceSeriesService.listMine(),
      businessInfoService.getMine(),
    ]);

    if (!clientsResult.success) return fail(clientsResult.error.message, clientsResult.error.code);
    if (!productsResult.success) return fail(productsResult.error.message, productsResult.error.code);
    if (!invoicesResult.success) return fail(invoicesResult.error.message, invoicesResult.error.code);
    if (!quotesResult.success) return fail(quotesResult.error.message, quotesResult.error.code);
    if (!transactionsResult.success) return fail(transactionsResult.error.message, transactionsResult.error.code);
    if (!seriesResult.success) return fail(seriesResult.error.message, seriesResult.error.code);
    if (!businessResult.success) return fail(businessResult.error.message, businessResult.error.code);

    const zip = new JSZip();

    zip.file(
      "contactos.csv",
      buildCsv(clientsResult.data, [
        { header: "Nombre / Razón Social", get: (c) => c.nombreRazonSocial },
        { header: "NIF/CIF", get: (c) => c.identificador },
        { header: "Tipo cliente", get: (c) => c.tipoCliente },
        { header: "Email", get: (c) => c.email },
        { header: "Teléfono", get: (c) => c.telefono },
        { header: "Dirección", get: (c) => c.direccion },
        { header: "Código Postal", get: (c) => c.codigoPostal },
        { header: "Ciudad", get: (c) => c.ciudad },
        { header: "Provincia", get: (c) => c.provincia },
        { header: "País", get: (c) => c.pais },
        { header: "Día facturación", get: (c) => c.diaFacturacion },
        { header: "Estado", get: (c) => c.estado },
      ]),
    );

    zip.file(
      "productos.csv",
      buildCsv(productsResult.data, [
        { header: "Nombre", get: (p) => p.nombre },
        { header: "Referencia", get: (p) => p.referencia },
        { header: "Descripción", get: (p) => p.descripcion },
        { header: "Precio compra", get: (p) => p.precioCompra },
        { header: "Precio venta", get: (p) => p.precioVenta },
        { header: "Impuesto", get: (p) => p.impuesto },
        { header: "Descuento", get: (p) => p.descuento },
      ]),
    );

    zip.file(
      "facturas.csv",
      buildCsv(invoicesResult.data, [
        { header: "Número", get: (i) => i.invoiceNumber },
        { header: "Serie", get: (i) => i.invoiceSeries },
        { header: "Cliente", get: (i) => i.clientName },
        { header: "Fecha emisión", get: (i) => i.issueDate },
        { header: "Fecha vencimiento", get: (i) => i.dueDate },
        { header: "Estado", get: (i) => i.status },
        { header: "Pagada", get: (i) => (i.isPaid ? "Sí" : "No") },
        { header: "Subtotal", get: (i) => i.subtotal },
        { header: "IVA", get: (i) => i.taxAmount },
        { header: "Total", get: (i) => i.totalAmount },
        { header: "Moneda", get: (i) => i.currency },
      ]),
    );

    zip.file(
      "presupuestos.csv",
      buildCsv(quotesResult.data, [
        { header: "Número", get: (q) => q.quoteNumber },
        { header: "Serie", get: (q) => q.quoteSeries },
        { header: "Cliente", get: (q) => q.clientName },
        { header: "Fecha emisión", get: (q) => q.issueDate },
        { header: "Vencimiento", get: (q) => q.dueDate },
        { header: "Estado", get: (q) => q.status },
        { header: "Subtotal", get: (q) => q.subtotal },
        { header: "IVA", get: (q) => q.taxAmount },
        { header: "Total", get: (q) => q.totalAmount },
        { header: "Moneda", get: (q) => q.currency },
      ]),
    );

    zip.file(
      "transacciones.csv",
      buildCsv(transactionsResult.data, [
        { header: "Fecha", get: (t) => t.fecha },
        { header: "Tipo", get: (t) => t.tipo },
        { header: "Concepto", get: (t) => t.concepto },
        { header: "Categoría", get: (t) => t.categoria },
        { header: "Cliente ID", get: (t) => t.clienteId },
        { header: "Importe", get: (t) => t.importe },
        { header: "IVA %", get: (t) => t.ivaPorcentaje },
        { header: "IRPF %", get: (t) => t.irpfPorcentaje },
        { header: "Factura ID", get: (t) => t.invoiceId },
        { header: "Observaciones", get: (t) => t.observaciones },
      ]),
    );

    zip.file(
      "series.csv",
      buildCsv(seriesResult.data, [
        { header: "Código", get: (s) => s.code },
        { header: "Descripción", get: (s) => s.description },
        { header: "Formato", get: (s) => s.invoiceNumberFormat },
        { header: "Reset contador", get: (s) => s.counterReset },
        { header: "Número inicial", get: (s) => s.startNumber },
        { header: "Número actual", get: (s) => s.currentNumber },
      ]),
    );

    zip.file(
      "datos-fiscales.json",
      JSON.stringify(businessResult.data ?? {}, null, 2),
    );

    zip.file(
      "LEEME.txt",
      `Export de datos de Facturales\n` +
        `Fecha: ${new Date().toISOString()}\n\n` +
        `Este archivo contiene un export completo de tus datos:\n` +
        `- contactos.csv: clientes / contactos\n` +
        `- productos.csv: catálogo de productos y servicios\n` +
        `- facturas.csv: facturas emitidas, borradores y anuladas\n` +
        `- presupuestos.csv: presupuestos emitidos y borradores\n` +
        `- transacciones.csv: ingresos y gastos registrados\n` +
        `- series.csv: series de numeración configuradas\n` +
        `- datos-fiscales.json: configuración fiscal de tu empresa\n\n` +
        `Los archivos CSV usan codificación UTF-8 con BOM y el separador coma.\n` +
        `Puedes abrirlos directamente con Excel, Google Sheets o LibreOffice.\n`,
    );

    const blob = await zip.generateAsync({ type: "blob" });
    const filename = `facturales-backup-${new Date().toISOString().slice(0, 10)}.zip`;
    return ok({ blob, filename });
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "Error generando el ZIP de datos",
      "DATA_EXPORT_ERROR",
      error,
    );
  }
}
