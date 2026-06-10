/**
 * Lectura de una factura electrónica Facturae (recepción, KD §1.5).
 *
 * Extrae los campos clave de un XML `fe:Facturae` (proveedor, número, fecha, importes) para
 * registrar una factura RECIBIDA. Es el inverso de `facturae.ts` (emisión).
 *
 * Extracción tolerante por nombre local de etiqueta (admite prefijos de namespace), sin depender
 * de DOMParser, para que funcione igual en navegador y en tests.
 */

export interface ParsedFacturae {
  supplierName: string;
  supplierNif: string;
  buyerNif: string;
  invoiceNumber: string;
  /** Fecha de expedición (normalmente YYYY-MM-DD). */
  issueDate: string;
  currency: string;
  total: number;
  taxAmount: number;
}

function decodeEntities(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();
}

/** Devuelve el contenido (sin recortar etiquetas internas) de la primera etiqueta con ese nombre local. */
function firstTag(xml: string, local: string): string | null {
  const re = new RegExp(`<(?:[\\w.-]+:)?${local}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[\\w.-]+:)?${local}>`, "i");
  const m = re.exec(xml);
  return m ? m[1] : null;
}

/** Igual que firstTag pero decodifica entidades y elimina cualquier etiqueta interna (texto plano). */
function firstText(xml: string, local: string): string {
  const raw = firstTag(xml, local);
  if (raw === null) return "";
  return decodeEntities(raw.replace(/<[^>]*>/g, "").trim());
}

function parseAmount(value: string): number {
  if (!value) return 0;
  // Facturae usa punto decimal; por robustez admitimos coma como decimal si no hay punto.
  const normalized = value.includes(".") ? value.replace(/,/g, "") : value.replace(",", ".");
  const n = Number.parseFloat(normalized);
  return Number.isFinite(n) ? n : 0;
}

function partyName(block: string): string {
  const corporate = firstText(block, "CorporateName");
  if (corporate) return corporate;
  const name = firstText(block, "Name");
  const first = firstText(block, "FirstSurname");
  const second = firstText(block, "SecondSurname");
  return [name, first, second].filter(Boolean).join(" ").trim();
}

/**
 * Analiza un XML Facturae. Devuelve null si no parece un Facturae válido
 * (sin raíz fe:Facturae o sin número de factura).
 */
export function parseFacturaeXml(xml: string): ParsedFacturae | null {
  if (!xml || !/Facturae/i.test(xml)) return null;

  const sellerBlock = firstTag(xml, "SellerParty") ?? "";
  const buyerBlock = firstTag(xml, "BuyerParty") ?? "";

  const invoiceNumber = firstText(xml, "InvoiceNumber");
  const seriesCode = firstText(xml, "InvoiceSeriesCode");
  if (!invoiceNumber) return null;
  // La serie solo se antepone si el número no la incluye ya (evita duplicar "A" + "A-2026-...").
  const fullNumber = seriesCode && !invoiceNumber.startsWith(seriesCode) ? `${seriesCode}${invoiceNumber}` : invoiceNumber;

  return {
    supplierName: partyName(sellerBlock),
    supplierNif: firstText(sellerBlock, "TaxIdentificationNumber"),
    buyerNif: firstText(buyerBlock, "TaxIdentificationNumber"),
    invoiceNumber: fullNumber,
    issueDate: firstText(xml, "IssueDate"),
    currency: firstText(xml, "InvoiceCurrencyCode") || "EUR",
    total: parseAmount(firstText(xml, "InvoiceTotal")),
    taxAmount: parseAmount(firstText(xml, "TotalTaxOutputs")),
  };
}
