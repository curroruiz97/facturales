/**
 * Facturae 3.2.2 — generación de la factura electrónica en formato estructurado.
 *
 * Produce un XML `fe:Facturae` (SchemaVersion 3.2.2) con la estructura mínima exigida:
 * FileHeader + Parties (Seller/Buyer) + Invoices (header, issue data, TaxesOutputs/Withheld,
 * InvoiceTotals, Items). Funciones puras y deterministas.
 *
 * La FIRMA electrónica (XAdES/XMLDSig → `.xsig`) NO se aplica aquí: requiere un certificado y se
 * realiza en una capa posterior. Este módulo entrega el XML estructurado sin firmar (`.xml`).
 *
 * Namespace 3.2.2: http://www.facturae.gob.es/formato/Versiones/Facturaev3_2_2.xml
 */

export type PersonTypeCode = "F" | "J"; // Física / Jurídica

export interface FacturaeParty {
  /** NIF/CIF. */
  taxId: string;
  /** Razón social (jurídica) o nombre completo (física). */
  name: string;
  /** Domicilio (calle y número). */
  address: string;
  postCode: string;
  town: string;
  province: string;
  /** Código de país ISO 3166-1 alfa-3. Por defecto ESP. */
  countryCode?: string;
}

export interface FacturaeTax {
  /** Código de impuesto (01 = IVA, 03 = IGIC, ...). */
  taxTypeCode: string;
  /** Tipo impositivo (p. ej. 21). */
  rate: number;
  /** Base imponible. */
  base: number;
  /** Cuota. */
  amount: number;
}

export interface FacturaeLine {
  description: string;
  quantity: number;
  /** Precio unitario sin impuestos. */
  unitPriceWithoutTax: number;
  /** Importe bruto de la línea (base, tras descuento). */
  grossAmount: number;
  taxTypeCode: string;
  taxRate: number;
}

export interface FacturaeInput {
  seller: FacturaeParty;
  buyer: FacturaeParty;
  invoiceNumber: string;
  seriesCode?: string;
  /** Fecha de expedición en ISO (YYYY-MM-DD). */
  issueDate: string;
  currency: string;
  lines: FacturaeLine[];
  /** IVA/IGIC/IPSI repercutido, agrupado por tipo. */
  taxesOutputs: FacturaeTax[];
  /** Retenciones (IRPF) — opcional. */
  taxesWithheld?: FacturaeTax[];
  /** Suma de bases imponibles. */
  totalGrossAmount: number;
  /** Total impuestos repercutidos. */
  totalTaxOutputs: number;
  /** Total retenciones. */
  totalTaxesWithheld: number;
  /** Importe total de la factura. */
  invoiceTotal: number;
}

const FACTURAE_NS = "http://www.facturae.gob.es/formato/Versiones/Facturaev3_2_2.xml";
const DSIG_NS = "http://www.w3.org/2000/09/xmldsig#";

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Importes con punto decimal y 2 decimales. */
function amt(n: number): string {
  return (Number.isFinite(n) ? n : 0).toFixed(2);
}

/** El CIF de personas jurídicas empieza por una de estas letras; el resto son personas físicas. */
export function inferPersonType(taxId: string): PersonTypeCode {
  const first = taxId.trim().toUpperCase().charAt(0);
  return "ABCDEFGHJNPQRSUVW".includes(first) ? "J" : "F";
}

function partyXml(tag: string, p: FacturaeParty): string {
  const type = inferPersonType(p.taxId);
  const country = (p.countryCode || "ESP").toUpperCase();
  const name = esc(p.name || "");
  let entity: string;
  if (type === "J") {
    entity = `      <LegalEntity>
        <CorporateName>${name}</CorporateName>
        <AddressInSpain>
          <Address>${esc(p.address || "")}</Address>
          <PostCode>${esc(p.postCode || "")}</PostCode>
          <Town>${esc(p.town || "")}</Town>
          <Province>${esc(p.province || "")}</Province>
          <CountryCode>${country}</CountryCode>
        </AddressInSpain>
      </LegalEntity>`;
  } else {
    // Persona física: separamos nombre / primer apellido de forma básica.
    const parts = (p.name || "").trim().split(/\s+/);
    const nombre = esc(parts[0] || p.name || "");
    const apellido = esc(parts.slice(1).join(" ") || parts[0] || "-");
    entity = `      <Individual>
        <Name>${nombre}</Name>
        <FirstSurname>${apellido}</FirstSurname>
        <AddressInSpain>
          <Address>${esc(p.address || "")}</Address>
          <PostCode>${esc(p.postCode || "")}</PostCode>
          <Town>${esc(p.town || "")}</Town>
          <Province>${esc(p.province || "")}</Province>
          <CountryCode>${country}</CountryCode>
        </AddressInSpain>
      </Individual>`;
  }
  return `    <${tag}>
      <TaxIdentification>
        <PersonTypeCode>${type}</PersonTypeCode>
        <ResidenceTypeCode>R</ResidenceTypeCode>
        <TaxIdentificationNumber>${esc(p.taxId || "")}</TaxIdentificationNumber>
      </TaxIdentification>
${entity}
    </${tag}>`;
}

function taxesXml(tag: string, taxes: FacturaeTax[]): string {
  if (!taxes.length) return "";
  const rows = taxes
    .map(
      (t) => `        <Tax>
          <TaxTypeCode>${esc(t.taxTypeCode)}</TaxTypeCode>
          <TaxRate>${amt(t.rate)}</TaxRate>
          <TaxableBase><TotalAmount>${amt(t.base)}</TotalAmount></TaxableBase>
          <TaxAmount><TotalAmount>${amt(t.amount)}</TotalAmount></TaxAmount>
        </Tax>`,
    )
    .join("\n");
  return `      <${tag}>
${rows}
      </${tag}>`;
}

function lineXml(l: FacturaeLine): string {
  return `        <InvoiceLine>
          <ItemDescription>${esc(l.description || "")}</ItemDescription>
          <Quantity>${amt(l.quantity)}</Quantity>
          <UnitOfMeasure>01</UnitOfMeasure>
          <UnitPriceWithoutTax>${amt(l.unitPriceWithoutTax)}</UnitPriceWithoutTax>
          <TotalCost>${amt(l.grossAmount)}</TotalCost>
          <GrossAmount>${amt(l.grossAmount)}</GrossAmount>
          <TaxesOutputs>
            <Tax>
              <TaxTypeCode>${esc(l.taxTypeCode)}</TaxTypeCode>
              <TaxRate>${amt(l.taxRate)}</TaxRate>
              <TaxableBase><TotalAmount>${amt(l.grossAmount)}</TotalAmount></TaxableBase>
              <TaxAmount><TotalAmount>${amt(l.grossAmount * (l.taxRate / 100))}</TotalAmount></TaxAmount>
            </Tax>
          </TaxesOutputs>
        </InvoiceLine>`;
}

export function construirFacturaeXml(input: FacturaeInput): string {
  const currency = (input.currency || "EUR").toUpperCase();
  const withheld = input.taxesWithheld ?? [];
  const taxOutputsBlock = taxesXml("TaxesOutputs", input.taxesOutputs);
  const taxWithheldBlock = withheld.length ? "\n" + taxesXml("TaxesWithheld", withheld) : "";
  const seriesBlock = input.seriesCode ? `        <InvoiceSeriesCode>${esc(input.seriesCode)}</InvoiceSeriesCode>\n` : "";
  const lines = input.lines.map(lineXml).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<fe:Facturae xmlns:fe="${FACTURAE_NS}" xmlns:ds="${DSIG_NS}">
  <FileHeader>
    <SchemaVersion>3.2.2</SchemaVersion>
    <Modality>I</Modality>
    <InvoiceIssuerType>EM</InvoiceIssuerType>
    <Batch>
      <BatchIdentifier>${esc(input.invoiceNumber)}</BatchIdentifier>
      <InvoicesCount>1</InvoicesCount>
      <TotalInvoicesAmount><TotalAmount>${amt(input.invoiceTotal)}</TotalAmount></TotalInvoicesAmount>
      <TotalOutstandingAmount><TotalAmount>${amt(input.invoiceTotal)}</TotalAmount></TotalOutstandingAmount>
      <TotalExecutableAmount><TotalAmount>${amt(input.invoiceTotal)}</TotalAmount></TotalExecutableAmount>
      <InvoiceCurrencyCode>${currency}</InvoiceCurrencyCode>
    </Batch>
  </FileHeader>
  <Parties>
${partyXml("SellerParty", input.seller)}
${partyXml("BuyerParty", input.buyer)}
  </Parties>
  <Invoices>
    <Invoice>
      <InvoiceHeader>
        <InvoiceNumber>${esc(input.invoiceNumber)}</InvoiceNumber>
${seriesBlock}        <InvoiceDocumentType>FC</InvoiceDocumentType>
        <InvoiceClass>OO</InvoiceClass>
      </InvoiceHeader>
      <InvoiceIssueData>
        <IssueDate>${esc(input.issueDate)}</IssueDate>
        <InvoiceCurrencyCode>${currency}</InvoiceCurrencyCode>
        <TaxCurrencyCode>${currency}</TaxCurrencyCode>
        <LanguageName>es</LanguageName>
      </InvoiceIssueData>
${taxOutputsBlock}${taxWithheldBlock}
      <InvoiceTotals>
        <TotalGrossAmount>${amt(input.totalGrossAmount)}</TotalGrossAmount>
        <TotalGrossAmountBeforeTaxes>${amt(input.totalGrossAmount)}</TotalGrossAmountBeforeTaxes>
        <TotalTaxOutputs>${amt(input.totalTaxOutputs)}</TotalTaxOutputs>
        <TotalTaxesWithheld>${amt(input.totalTaxesWithheld)}</TotalTaxesWithheld>
        <InvoiceTotal>${amt(input.invoiceTotal)}</InvoiceTotal>
        <TotalOutstandingAmount>${amt(input.invoiceTotal)}</TotalOutstandingAmount>
        <TotalExecutableAmount>${amt(input.invoiceTotal)}</TotalExecutableAmount>
      </InvoiceTotals>
      <Items>
${lines}
      </Items>
    </Invoice>
  </Invoices>
</fe:Facturae>`;
}
