import { describe, expect, it } from "vitest";
import { calculateExpenseBreakdown } from "../transaction-amounts";

describe("calculateExpenseBreakdown", () => {
  it("calcula correctamente una factura con IVA 21% e IRPF 15% (caso real del usuario)", () => {
    // Factura: base 1900€, IVA 399€ (21%), IRPF retenido 285€ (15%), total 2014€
    const result = calculateExpenseBreakdown(2014, 21, 15);
    expect(result.base).toBeCloseTo(1900, 2);
    expect(result.cuotaIva).toBeCloseTo(399, 2);
    expect(result.cuotaIrpf).toBeCloseTo(285, 2);
    expect(result.total).toBe(2014);
  });

  it("calcula sin IRPF (solo IVA 21%) — compatible con la fórmula vieja", () => {
    const result = calculateExpenseBreakdown(121, 21, null);
    expect(result.base).toBeCloseTo(100, 2);
    expect(result.cuotaIva).toBeCloseTo(21, 2);
    expect(result.cuotaIrpf).toBe(0);
    expect(result.total).toBe(121);
  });

  it("calcula con IRPF pero sin IVA (caso poco común)", () => {
    const result = calculateExpenseBreakdown(85, null, 15);
    expect(result.base).toBeCloseTo(100, 2);
    expect(result.cuotaIva).toBe(0);
    expect(result.cuotaIrpf).toBeCloseTo(15, 2);
    expect(result.total).toBe(85);
  });

  it("trata gasto sin impuestos como base = total", () => {
    const result = calculateExpenseBreakdown(100, null, null);
    expect(result.base).toBe(100);
    expect(result.cuotaIva).toBe(0);
    expect(result.cuotaIrpf).toBe(0);
    expect(result.total).toBe(100);
  });

  it("trata IVA 0% e IRPF 0% como sin impuestos", () => {
    const result = calculateExpenseBreakdown(100, 0, 0);
    expect(result.base).toBe(100);
    expect(result.cuotaIva).toBe(0);
    expect(result.cuotaIrpf).toBe(0);
    expect(result.total).toBe(100);
  });

  it("devuelve todo a 0 cuando el total es 0", () => {
    const result = calculateExpenseBreakdown(0, 21, 15);
    expect(result.base).toBe(0);
    expect(result.cuotaIva).toBe(0);
    expect(result.cuotaIrpf).toBe(0);
    expect(result.total).toBe(0);
  });

  it("devuelve todo a 0 cuando el total es negativo", () => {
    const result = calculateExpenseBreakdown(-100, 21, 15);
    expect(result.base).toBe(0);
    expect(result.cuotaIva).toBe(0);
    expect(result.cuotaIrpf).toBe(0);
    expect(result.total).toBe(0);
  });

  it("devuelve todo a 0 cuando el total no es finito", () => {
    const result = calculateExpenseBreakdown(Number.NaN, 21, 15);
    expect(result.total).toBe(0);
  });

  it("degrada a base = total cuando el divisor sería <= 0 (ej. IRPF 100% sin IVA)", () => {
    const result = calculateExpenseBreakdown(100, null, 100);
    expect(result.base).toBe(100);
    expect(result.cuotaIva).toBe(0);
    expect(result.cuotaIrpf).toBe(0);
    expect(result.total).toBe(100);
  });

  it("ignora porcentajes no finitos (NaN) tratándolos como 0", () => {
    const result = calculateExpenseBreakdown(121, Number.NaN, null);
    expect(result.base).toBe(121);
    expect(result.cuotaIva).toBe(0);
    expect(result.total).toBe(121);
  });

  it("identidad: base * (1 + iva%/100 - irpf%/100) ≈ total", () => {
    const result = calculateExpenseBreakdown(2014, 21, 15);
    const reconstructed = result.base * (1 + 21 / 100 - 15 / 100);
    expect(reconstructed).toBeCloseTo(result.total, 2);
  });
});
