import { describe, expect, it } from "vitest";
import { evaluateDocumentLimit, resolveDocumentUsageCounter } from "../document-limit.rule";

describe("document-limit.rule", () => {
  it("mapea facturas al contador invoicesMonth", () => {
    expect(resolveDocumentUsageCounter("invoice")).toBe("invoicesMonth");
  });

  it("mapea presupuestos al contador invoicesMonth para compatibilidad legacy", () => {
    expect(resolveDocumentUsageCounter("quote")).toBe("invoicesMonth");
  });

  it("permite crear documento cuando no se alcanza el limite", () => {
    const result = evaluateDocumentLimit(
      "invoice",
      { clients: 0, products: 0, invoicesMonth: 3, ocrMonth: 0 },
      { clients: 10, products: 10, invoicesMonth: 10, ocrMonth: 10 },
      "Starter",
    );

    expect(result.allowed).toBe(true);
    expect(result.current).toBe(3);
    expect(result.limit).toBe(10);
  });

  it("bloquea presupuestos cuando se alcanza el contador compartido de facturas", () => {
    const result = evaluateDocumentLimit(
      "quote",
      { clients: 0, products: 0, invoicesMonth: 10, ocrMonth: 0 },
      { clients: 10, products: 10, invoicesMonth: 10, ocrMonth: 10 },
      "Starter",
    );

    expect(result.allowed).toBe(false);
    expect(result.counter).toBe("invoicesMonth");
    expect(result.reason).toContain("10");
  });
});
