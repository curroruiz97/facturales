import { describe, expect, it } from "vitest";
import {
  calculateProductMargin,
  calculateProductPvp,
  normalizeProductNumber,
  resolveProductTaxRate,
} from "../product-pricing";

describe("product-pricing", () => {
  it("resuelve tasas por codigo legacy", () => {
    expect(resolveProductTaxRate("IVA_21")).toBe(21);
    expect(resolveProductTaxRate("IGIC_13.5")).toBe(13.5);
    expect(resolveProductTaxRate("EXENTO")).toBe(0);
  });

  it("acepta tasa numerica como string para compatibilidad de datos antiguos", () => {
    expect(resolveProductTaxRate("21")).toBe(21);
    expect(resolveProductTaxRate("9.5")).toBe(9.5);
  });

  it("calcula PVP con impuesto", () => {
    expect(calculateProductPvp(100, "IVA_21")).toBe(121);
    expect(calculateProductPvp(100, "IGIC_7")).toBe(107);
  });

  it("calcula margen y respeta caso de precio de venta cero", () => {
    expect(calculateProductMargin(70, 100)).toBeCloseTo(30, 5);
    expect(calculateProductMargin(70, 0)).toBeNull();
  });

  it("normaliza entradas numericas de formulario", () => {
    expect(normalizeProductNumber("12,5")).toBe(12.5);
    expect(normalizeProductNumber("foo", 7)).toBe(7);
  });
});

