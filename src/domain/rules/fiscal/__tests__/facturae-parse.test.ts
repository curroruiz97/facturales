import { describe, expect, it } from "vitest";
import { construirFacturaeXml, type FacturaeInput } from "../facturae";
import { parseFacturaeXml } from "../facturae-parse";

const SAMPLE: FacturaeInput = {
  seller: { taxId: "B12345678", name: "Proveedora SL", address: "Calle Mayor 1", postCode: "28001", town: "Madrid", province: "Madrid" },
  buyer: { taxId: "12345678Z", name: "Cliente Físico", address: "Calle Sol 2", postCode: "08001", town: "Barcelona", province: "Barcelona" },
  invoiceNumber: "A-2026-00042",
  seriesCode: "A",
  issueDate: "2026-03-15",
  currency: "EUR",
  lines: [{ description: "Servicio", quantity: 1, unitPriceWithoutTax: 100, grossAmount: 100, taxTypeCode: "01", taxRate: 21 }],
  taxesOutputs: [{ taxTypeCode: "01", rate: 21, base: 100, amount: 21 }],
  taxesWithheld: [],
  totalGrossAmount: 100,
  totalTaxOutputs: 21,
  totalTaxesWithheld: 0,
  invoiceTotal: 121,
};

describe("parseFacturaeXml (recepción)", () => {
  it("hace round-trip: lo generado por construirFacturaeXml se vuelve a leer", () => {
    const xml = construirFacturaeXml(SAMPLE);
    const parsed = parseFacturaeXml(xml);
    expect(parsed).not.toBeNull();
    expect(parsed?.supplierName).toBe("Proveedora SL");
    expect(parsed?.supplierNif).toBe("B12345678");
    expect(parsed?.buyerNif).toBe("12345678Z");
    expect(parsed?.invoiceNumber).toBe("A-2026-00042"); // no duplica la serie ya incluida
    expect(parsed?.issueDate).toBe("2026-03-15");
    expect(parsed?.currency).toBe("EUR");
    expect(parsed?.total).toBeCloseTo(121, 2);
    expect(parsed?.taxAmount).toBeCloseTo(21, 2);
  });

  it("tolera prefijos de namespace en las etiquetas internas", () => {
    const xml = `<?xml version="1.0"?>
<fe:Facturae xmlns:fe="http://www.facturae.gob.es/formato/Versiones/Facturaev3_2_2.xml">
  <Parties>
    <SellerParty><TaxIdentification><fe:TaxIdentificationNumber>B99999999</fe:TaxIdentificationNumber></TaxIdentification>
      <LegalEntity><fe:CorporateName>Otra Proveedora SA</fe:CorporateName></LegalEntity></SellerParty>
    <BuyerParty><TaxIdentification><TaxIdentificationNumber>X1234567L</TaxIdentificationNumber></TaxIdentification></BuyerParty>
  </Parties>
  <Invoices><Invoice>
    <InvoiceHeader><fe:InvoiceNumber>2026/77</fe:InvoiceNumber></InvoiceHeader>
    <InvoiceIssueData><IssueDate>2026-01-09</IssueDate><InvoiceCurrencyCode>EUR</InvoiceCurrencyCode></InvoiceIssueData>
    <InvoiceTotals><TotalTaxOutputs>52.50</TotalTaxOutputs><InvoiceTotal>302.50</InvoiceTotal></InvoiceTotals>
  </Invoice></Invoices>
</fe:Facturae>`;
    const parsed = parseFacturaeXml(xml);
    expect(parsed?.supplierNif).toBe("B99999999");
    expect(parsed?.supplierName).toBe("Otra Proveedora SA");
    expect(parsed?.invoiceNumber).toBe("2026/77");
    expect(parsed?.total).toBeCloseTo(302.5, 2);
  });

  it("devuelve null si no es un Facturae", () => {
    expect(parseFacturaeXml("<html><body>no soy una factura</body></html>")).toBeNull();
    expect(parseFacturaeXml("")).toBeNull();
  });
});
