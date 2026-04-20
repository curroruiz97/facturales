import { describe, expect, it } from "vitest";
import { calculateDocumentTotals, parseTaxCode, resolveRecargoRate, toConceptLine } from "../document-calculations";
import { createEmptyDocumentEditor } from "../document-mappers";

describe("document-calculations", () => {
  it("parsea codigos fiscales incluyendo EXENTO e IRPF negativo", () => {
    expect(parseTaxCode("EXENTO")).toEqual({ label: "EXENTO", rate: 0 });
    expect(parseTaxCode("IVA_21")).toEqual({ label: "IVA_21", rate: 21 });
    expect(parseTaxCode("IRPF_-2")).toEqual({ label: "IRPF_-2", rate: -2 });
  });

  it("aplica recargo de equivalencia en IVA 21/10/4", () => {
    expect(resolveRecargoRate(21, true)).toBe(5.2);
    expect(resolveRecargoRate(10, true)).toBe(1.4);
    expect(resolveRecargoRate(4, true)).toBe(0.5);
    expect(resolveRecargoRate(7, true)).toBe(0);
    expect(resolveRecargoRate(21, false)).toBe(0);
  });

  it("calcula el total de una linea con descuento e impuesto", () => {
    const concept = toConceptLine(
      {
        id: "line-1",
        description: "Servicio",
        quantity: 2,
        unitPrice: 100,
        discount: 10,
        taxCode: "IVA_21",
      },
      false,
    );

    expect(concept.total).toBeCloseTo(217.8);
  });

  it("calcula resumen completo con descuento general, retencion y suplidos", () => {
    const editor = createEmptyDocumentEditor("invoice");
    editor.lines = [
      {
        id: "line-1",
        description: "Consultoria",
        quantity: 2,
        unitPrice: 100,
        discount: 10,
        taxCode: "IVA_21",
      },
    ];
    editor.expenses = [{ id: "exp-1", description: "Dietas", amount: 20 }];
    editor.taxSettings.generalDiscountRate = 5;
    editor.taxSettings.retentionRate = 15;
    editor.paidAmount = 50;

    const { summary } = calculateDocumentTotals(editor);
    expect(summary.subtotal).toBeCloseTo(200);
    expect(summary.discount).toBeCloseTo(29);
    expect(summary.taxBase).toBeCloseTo(171);
    expect(summary.taxAmount).toBeCloseTo(35.91);
    expect(summary.retentionAmount).toBeCloseTo(25.65);
    expect(summary.total).toBeCloseTo(201.26);
    expect(summary.totalToPay).toBeCloseTo(151.26);
  });

  it("redondea correctamente cálculos con céntimos problemáticos (IEEE 754)", () => {
    const editor = createEmptyDocumentEditor("invoice");
    editor.lines = [
      {
        id: "line-1",
        description: "Producto A",
        quantity: 3,
        unitPrice: 19.99,
        discount: 0,
        taxCode: "IVA_21",
      },
    ];
    const { summary } = calculateDocumentTotals(editor);
    // 3 * 19.99 = 59.97 -> tax 21% = 12.5937 -> round to 12.59
    expect(summary.taxBase).toBe(59.97);
    expect(summary.taxAmount).toBe(12.59);
    expect(summary.total).toBe(72.56);
    // Verify no floating-point drift (e.g. 72.5637000000001)
    expect(String(summary.total)).toMatch(/^\d+\.\d{1,2}$/);
  });

  it("redondea con descuento general y retención simultáneos", () => {
    const editor = createEmptyDocumentEditor("invoice");
    editor.lines = [
      {
        id: "line-1",
        description: "Servicio",
        quantity: 1,
        unitPrice: 333.33,
        discount: 0,
        taxCode: "IVA_21",
      },
    ];
    editor.taxSettings.generalDiscountRate = 10;
    editor.taxSettings.retentionRate = 15;

    const { summary } = calculateDocumentTotals(editor);
    // All values must be exact 2-decimal numbers
    expect(Number.isFinite(summary.total)).toBe(true);
    expect(Math.round(summary.total * 100)).toBe(Math.round(summary.total * 100));
  });

  it("soporta lineas con impuesto negativo", () => {
    const editor = createEmptyDocumentEditor("quote");
    editor.lines = [
      {
        id: "line-1",
        description: "Linea IRPF",
        quantity: 1,
        unitPrice: 1000,
        discount: 0,
        taxCode: "IRPF_-2",
      },
    ];

    const { summary } = calculateDocumentTotals(editor);
    expect(summary.taxAmount).toBeCloseTo(-20);
    expect(summary.total).toBeCloseTo(980);
  });
});
