import { describe, expect, it } from "vitest";
import type { DocumentEditorState } from "../../core/document-types";
import { buildFacturaeInput, buildFacturaeXml } from "../document-facturae";

function makeEditor(overrides: Partial<DocumentEditorState> = {}): DocumentEditorState {
  return {
    kind: "invoice",
    issuer: { name: "Mi Empresa SL", nif: "B12345678", email: "a@b.es", address: "Calle Mayor 1", postalCode: "28001" },
    client: { name: "Cliente SA", nif: "A87654321", email: "c@d.es", address: "Av. Sol 2", postalCode: "08001", clientId: null },
    meta: {
      series: "A",
      number: "A-2026-00001",
      reference: "",
      issueDate: "2026-03-15",
      dueDate: "2026-04-15",
      operationDate: "",
      paymentTerms: "30",
      currency: "EUR",
    },
    lines: [
      { id: "1", description: "Servicio A", quantity: 2, unitPrice: 100, discount: 0, taxCode: "IVA_21" },
      { id: "2", description: "Servicio B", quantity: 1, unitPrice: 200, discount: 0, taxCode: "IVA_21" },
      { id: "3", description: "Producto reducido", quantity: 1, unitPrice: 50, discount: 0, taxCode: "IVA_10" },
    ],
    expenses: [],
    paymentMethods: [],
    taxSettings: { taxType: "iva", applyRecargoEquivalencia: false, retentionRate: 0, generalDiscountRate: 0 },
    paidAmount: 0,
    observations: "",
    ...overrides,
  };
}

const TOTALS = { taxBase: 450, retentionRate: 0, retentionAmount: 0, total: 539.5 };

describe("document-facturae (mapeo editor → Facturae)", () => {
  it("agrupa el IVA por tipo (21% y 10%) y suma bases/cuotas", () => {
    const input = buildFacturaeInput(makeEditor(), TOTALS, "A-2026-00001");
    const iva21 = input.taxesOutputs.find((t) => t.rate === 21);
    const iva10 = input.taxesOutputs.find((t) => t.rate === 10);
    expect(iva21).toBeDefined();
    expect(iva21?.base).toBe(400); // 200 + 200
    expect(iva21?.amount).toBeCloseTo(84, 2);
    expect(iva10?.base).toBe(50);
    expect(iva10?.amount).toBeCloseTo(5, 2);
    expect(input.totalGrossAmount).toBe(450);
    expect(input.totalTaxOutputs).toBeCloseTo(89, 2);
  });

  it("incluye la retención IRPF como TaxesWithheld cuando procede", () => {
    const input = buildFacturaeInput(
      makeEditor(),
      { taxBase: 450, retentionRate: 15, retentionAmount: 67.5, total: 471.5 },
      "A-2026-00001",
    );
    expect(input.taxesWithheld).toHaveLength(1);
    expect(input.taxesWithheld?.[0]).toMatchObject({ taxTypeCode: "04", rate: 15, amount: 67.5 });
    expect(input.totalTaxesWithheld).toBe(67.5);
  });

  it("añade los gastos suplidos como líneas exentas", () => {
    const editor = makeEditor({ expenses: [{ id: "e1", description: "Tasa", amount: 30 }] });
    const input = buildFacturaeInput(editor, TOTALS, "A-2026-00001");
    const suplido = input.lines.find((l) => l.description.includes("Gastos suplidos"));
    expect(suplido).toBeDefined();
    expect(suplido?.taxRate).toBe(0);
    expect(suplido?.grossAmount).toBe(30);
  });

  it("añade la leyenda de exención cuando hay líneas exentas (RD 1619/2012)", () => {
    const editor = makeEditor({
      lines: [{ id: "x", description: "Servicio exento", quantity: 1, unitPrice: 100, discount: 0, taxCode: "EXENTO" }],
    });
    const input = buildFacturaeInput(editor, { taxBase: 100, retentionRate: 0, retentionAmount: 0, total: 100 }, "A-1");
    expect(input.legalLiterals).toBeDefined();
    expect(input.legalLiterals?.[0]).toContain("exenta");
    const xml = buildFacturaeXml(editor, { taxBase: 100, retentionRate: 0, retentionAmount: 0, total: 100 }, "A-1");
    expect(xml).toContain("<AdditionalData>");
    expect(xml).toContain("<InvoiceAdditionalInformation>");
    expect(xml).toContain("exenta de IVA");
  });

  it("NO añade leyenda de exención si no hay líneas exentas", () => {
    const input = buildFacturaeInput(makeEditor(), TOTALS, "A-1");
    expect(input.legalLiterals).toBeUndefined();
    expect(buildFacturaeXml(makeEditor(), TOTALS, "A-1")).not.toContain("<AdditionalData>");
  });

  it("produce un XML fe:Facturae descargable con los datos del emisor y receptor", () => {
    const xml = buildFacturaeXml(makeEditor(), TOTALS, "A-2026-00001");
    expect(xml).toContain("<fe:Facturae");
    expect(xml).toContain("<SchemaVersion>3.2.2</SchemaVersion>");
    expect(xml).toContain("<TaxIdentificationNumber>B12345678</TaxIdentificationNumber>");
    expect(xml).toContain("<TaxIdentificationNumber>A87654321</TaxIdentificationNumber>");
    expect(xml).toContain("<InvoiceNumber>A-2026-00001</InvoiceNumber>");
  });
});
