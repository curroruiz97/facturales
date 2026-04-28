import { clientsRepository, invoicesRepository } from "../repositories";
import { invoiceSeriesService } from "../invoice-series/invoice-series.service";
import { businessInfoService } from "../business/business-info.service";
import { fail, ok, type ServiceResult } from "../../shared/types/service-result";
import type { InvoiceDraftPayload } from "../../shared/types/domain";
import { parseInvoicePdf } from "./pdf-parser";
import { parseInvoiceXlsx } from "./xlsx-parser";
import type { InvoiceImportSummary, ParsedInvoice } from "./types";

export type { ParsedInvoice, InvoiceImportSummary, ImportRow, ImportRowStatus } from "./types";

/**
 * Detecta el tipo de archivo y delega al parser correspondiente.
 */
export async function parseInvoiceFile(file: File): Promise<ParsedInvoice> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".pdf") || file.type === "application/pdf") {
    return parseInvoicePdf(file);
  }
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls") || file.type.includes("spreadsheet")) {
    return parseInvoiceXlsx(file);
  }
  throw new Error(`Formato no soportado: ${file.name}. Usa PDF o XLSX.`);
}

/**
 * Asegura que existe una serie con el código indicado para el usuario actual.
 * Si no existe, la crea. Devuelve el código de la serie (que se usa como
 * `invoice_series` en la factura).
 */
async function ensureSeriesExists(seriesCode: string): Promise<ServiceResult<string>> {
  const existingResult = await invoiceSeriesService.listMine();
  if (!existingResult.success) {
    return fail(existingResult.error.message, existingResult.error.code, existingResult.error.cause);
  }
  const found = existingResult.data.find(
    (s) => s.code.toUpperCase() === seriesCode.toUpperCase(),
  );
  if (found) return ok(found.code);

  // No existe: crear con configuración estándar (numeración manual / formato libre)
  const created = await invoiceSeriesService.create({
    code: seriesCode,
    description: `Serie ${seriesCode} (importada)`,
    invoiceNumberFormat: "custom",
    counterReset: "never",
    startNumber: 1,
    customFormat: "{series}-{number}",
  });
  if (!created.success) {
    return fail(created.error.message, created.error.code, created.error.cause);
  }
  return ok(created.data.code);
}

/**
 * Asegura que existe un cliente con el NIF/CIF indicado. Si no existe, lo crea
 * con los datos parseados. Devuelve el clientId.
 */
async function ensureClientExists(parsed: ParsedInvoice): Promise<ServiceResult<{ clientId: string; isNew: boolean }>> {
  if (!parsed.client.identifier) {
    return fail("El cliente no tiene NIF/CIF — no se puede crear automáticamente", "IMPORT_CLIENT_NIF_REQUIRED");
  }

  const lookup = await clientsRepository.findByLegacyIdentifier(parsed.client.identifier);
  if (!lookup.success) {
    return fail(lookup.error.message, lookup.error.code, lookup.error.cause);
  }
  if (lookup.data) {
    return ok({ clientId: lookup.data.id, isNew: false });
  }

  // Inferir tipo: si el NIF empieza por letra (B, A, etc.) → empresa; si es numérico+letra → autónomo
  const id = parsed.client.identifier.toUpperCase();
  const isCompany = /^[ABCDEFGHJNPQRSUVW]/.test(id);
  const tipoCliente: "autonomo" | "empresa" = isCompany ? "empresa" : "autonomo";

  const created = await clientsRepository.create({
    nombreRazonSocial: parsed.client.name,
    identificador: parsed.client.identifier,
    tipoCliente,
    direccion: parsed.client.address || null,
    codigoPostal: parsed.client.postalCode || null,
    ciudad: parsed.client.city || null,
    provincia: parsed.client.province || null,
    pais: "España",
    estado: "puntual",
  });
  if (!created.success) {
    return fail(created.error.message, created.error.code, created.error.cause);
  }
  return ok({ clientId: created.data.id, isNew: true });
}

/**
 * Construye el `invoiceData` (JSONB) a partir de un ParsedInvoice y los datos
 * fiscales del usuario emisor.
 */
async function buildInvoiceData(parsed: ParsedInvoice): Promise<InvoiceDraftPayload> {
  const businessResult = await businessInfoService.getMine();
  const issuer = businessResult.success && businessResult.data
    ? {
        name: businessResult.data.nombreFiscal,
        nif: businessResult.data.nifCif,
        address: businessResult.data.direccionFacturacion,
        postalCode: businessResult.data.codigoPostal,
        city: businessResult.data.ciudad,
        province: businessResult.data.provincia,
        country: businessResult.data.pais ?? "España",
        email: "",
        phone: businessResult.data.telefono,
      }
    : {
        name: "",
        nif: "",
        address: "",
        postalCode: "",
        city: "",
        province: "",
        country: "España",
      };

  const taxRate = parsed.ivaRate;
  const taxBase = parsed.base;
  const taxAmount = parsed.ivaAmount;
  const retentionRate = parsed.irpfRate ?? 0;
  const retentionAmount = parsed.irpfAmount ?? 0;
  const total = parsed.total;

  // El sistema espera taxLabel en formato "IVA_21" (con guión bajo) para que
  // parseTaxCode pueda dividirlo correctamente y obtener la rate. Si usamos
  // "IVA 21%" se interpreta como rate 0 y se pierde el IVA al recalcular.
  const concept = {
    description: parsed.concept,
    quantity: 1,
    unitPrice: taxBase,
    discount: 0,
    tax: taxRate,
    taxLabel: taxRate > 0 ? `IVA_${taxRate}` : "EXENTO",
    taxRate,
    re: 0,
    total: taxBase + taxAmount,
  };

  return {
    issuer,
    client: {
      name: parsed.client.name,
      nif: parsed.client.identifier,
      email: "",
      address: parsed.client.address,
      postalCode: parsed.client.postalCode,
      city: parsed.client.city,
      province: parsed.client.province ?? "",
    },
    invoice: {
      series: parsed.series,
      number: parsed.invoiceNumber,
      reference: "",
      issueDate: parsed.issueDate,
      dueDate: parsed.issueDate,
      operationDate: parsed.issueDate,
      paymentTerms: "",
    },
    concepts: [concept],
    expenses: [],
    taxSettings: {
      taxType: "iva",
      retentionRate,
      applyRE: false,
    },
    dates: {
      issue: parsed.issueDate,
      due: parsed.issueDate,
      operation: parsed.issueDate,
    },
    payment: {
      terms: "",
    },
    adjustments: {
      discount: 0,
      withholding: retentionRate,
    },
    options: {
      recargoEquivalencia: false,
    },
    paymentMethods: parsed.iban
      ? [{ type: "transferencia", iban: parsed.iban, label: "Transferencia bancaria" }]
      : [],
    observations: parsed.fileKind === "pdf"
      ? `Factura importada desde ${parsed.fileName}`
      : `Factura importada desde Excel ${parsed.fileName}`,
    summary: {
      subtotal: taxBase,
      discount: 0,
      taxBase,
      taxRate,
      taxAmount,
      reRate: 0,
      reAmount: 0,
      retentionRate,
      retentionAmount,
      expenses: 0,
      total,
      paid: 0,
      totalToPay: total,
    },
  };
}

/**
 * Importa una factura: asegura serie, cliente, crea borrador con número exacto
 * del original y la emite.
 */
export async function importParsedInvoice(parsed: ParsedInvoice): Promise<ServiceResult<{ invoiceId: string; clientCreated: boolean }>> {
  if (!parsed.invoiceNumber) {
    return fail("Falta el número de factura tras el parseo", "IMPORT_NUMBER_REQUIRED");
  }
  if (!parsed.issueDate) {
    return fail("Falta la fecha de emisión tras el parseo", "IMPORT_DATE_REQUIRED");
  }
  if (!parsed.client.name) {
    return fail("Falta el nombre del cliente tras el parseo", "IMPORT_CLIENT_NAME_REQUIRED");
  }

  // 1. Asegurar serie
  const seriesResult = await ensureSeriesExists(parsed.series);
  if (!seriesResult.success) {
    return fail(seriesResult.error.message, seriesResult.error.code, seriesResult.error.cause);
  }

  // 2. Asegurar cliente
  const clientResult = await ensureClientExists(parsed);
  if (!clientResult.success) {
    return fail(clientResult.error.message, clientResult.error.code, clientResult.error.cause);
  }

  // 3. Construir invoiceData
  const invoiceData = await buildInvoiceData(parsed);

  // 4. Crear factura como draft con el número exacto del PDF (si especificas
  //    `invoiceNumber` el trigger NO sobrescribe el valor)
  const taxAmountSigned = parsed.ivaAmount - (parsed.irpfAmount ?? 0);
  const created = await invoicesRepository.create({
    invoiceNumber: parsed.invoiceNumber,
    invoiceSeries: seriesResult.data,
    clientId: clientResult.data.clientId,
    clientName: parsed.client.name,
    issueDate: parsed.issueDate,
    dueDate: parsed.issueDate,
    subtotal: parsed.base,
    taxAmount: taxAmountSigned,
    totalAmount: parsed.total,
    currency: "EUR",
    invoiceData,
  });
  if (!created.success) {
    return fail(created.error.message, created.error.code, created.error.cause);
  }

  // 5. Emitir (status: draft → issued)
  const emitted = await invoicesRepository.emit(created.data.id);
  if (!emitted.success) {
    // Si fallo la emisión, intentamos limpiar el borrador para no dejar basura
    await invoicesRepository.remove(created.data.id);
    return fail(emitted.error.message, emitted.error.code, emitted.error.cause);
  }

  return ok({ invoiceId: emitted.data.id, clientCreated: clientResult.data.isNew });
}

/**
 * Importa varias facturas en serie. Devuelve un resumen con el resultado.
 */
export async function importParsedInvoices(
  parsedList: ParsedInvoice[],
  onProgress?: (index: number, total: number, parsed: ParsedInvoice, success: boolean, message?: string) => void,
): Promise<InvoiceImportSummary> {
  const summary: InvoiceImportSummary = {
    imported: 0,
    skipped: 0,
    failed: 0,
    duplicates: [],
    errors: [],
  };

  for (let i = 0; i < parsedList.length; i++) {
    const parsed = parsedList[i];
    const result = await importParsedInvoice(parsed);
    if (result.success) {
      summary.imported += 1;
      onProgress?.(i, parsedList.length, parsed, true);
    } else {
      // Detectar duplicados (constraint UNIQUE en invoice_number)
      const msg = result.error.message ?? "";
      if (/duplicate|UNIQUE|invoice_number/i.test(msg)) {
        summary.duplicates.push(parsed.invoiceNumber);
        summary.skipped += 1;
        onProgress?.(i, parsedList.length, parsed, false, "Duplicado");
      } else {
        summary.failed += 1;
        summary.errors.push({ fileName: parsed.fileName, message: msg });
        onProgress?.(i, parsedList.length, parsed, false, msg);
      }
    }
  }

  return summary;
}
