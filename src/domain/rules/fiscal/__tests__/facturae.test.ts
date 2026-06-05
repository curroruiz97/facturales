import { describe, expect, it } from "vitest";
import { construirFacturaeXml, inferPersonType, type FacturaeInput } from "../facturae";

const SAMPLE: FacturaeInput = {
  seller: {
    taxId: "B12345678",
    name: "Mi Empresa SL",
    address: "Calle Mayor 1",
    postCode: "28001",
    town: "Madrid",
    province: "Madrid",
  },
  buyer: {
    taxId: "12345678Z",
    name: "Juan Pérez",
    address: "Calle Sol 2",
    postCode: "08001",
    town: "Barcelona",
    province: "Barcelona",
  },
  invoiceNumber: "A-2026-00001",
  seriesCode: "A",
  issueDate: "2026-03-15",
  currency: "EUR",
  lines: [
    { description: "Servicio de consultoría", quantity: 1, unitPriceWithoutTax: 100, grossAmount: 100, taxTypeCode: "01", taxRate: 21 },
  ],
  taxesOutputs: [{ taxTypeCode: "01", rate: 21, base: 100, amount: 21 }],
  taxesWithheld: [],
  totalGrossAmount: 100,
  totalTaxOutputs: 21,
  totalTaxesWithheld: 0,
  invoiceTotal: 121,
};

describe("Facturae 3.2.2", () => {
  it("infiere el tipo de persona (CIF jurídica vs NIF física)", () => {
    expect(inferPersonType("B12345678")).toBe("J");
    expect(inferPersonType("A11111111")).toBe("J");
    expect(inferPersonType("12345678Z")).toBe("F");
    expect(inferPersonType("X1234567L")).toBe("F");
  });

  it("genera un XML fe:Facturae con SchemaVersion 3.2.2 y los datos clave", () => {
    const xml = construirFacturaeXml(SAMPLE);
    expect(xml).toContain("<fe:Facturae");
    expect(xml).toContain('xmlns:fe="http://www.facturae.gob.es/formato/Versiones/Facturaev3_2_2.xml"');
    expect(xml).toContain("<SchemaVersion>3.2.2</SchemaVersion>");
    // Vendedor (jurídica) y comprador (física)
    expect(xml).toContain("<TaxIdentificationNumber>B12345678</TaxIdentificationNumber>");
    expect(xml).toContain("<CorporateName>Mi Empresa SL</CorporateName>");
    expect(xml).toContain("<TaxIdentificationNumber>12345678Z</TaxIdentificationNumber>");
    expect(xml).toContain("<Individual>");
    // Factura
    expect(xml).toContain("<InvoiceNumber>A-2026-00001</InvoiceNumber>");
    expect(xml).toContain("<IssueDate>2026-03-15</IssueDate>");
    expect(xml).toContain("<TaxRate>21.00</TaxRate>");
    expect(xml).toContain("<InvoiceTotal>121.00</InvoiceTotal>");
    expect(xml).toContain("Servicio de consultoría");
  });

  it("escapa caracteres XML peligrosos en los textos", () => {
    const xml = construirFacturaeXml({
      ...SAMPLE,
      seller: { ...SAMPLE.seller, name: "Tom & Jerry <SL>" },
    });
    expect(xml).toContain("Tom &amp; Jerry &lt;SL&gt;");
    expect(xml).not.toContain("Tom & Jerry <SL>");
  });
});
