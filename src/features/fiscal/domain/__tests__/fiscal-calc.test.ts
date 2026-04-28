import { describe, expect, it } from "vitest";
import {
  calcGastosBase,
  calcIVASoportado,
  calcModelo130,
  calcModelo303,
  type TransactionFiscalRow,
} from "../fiscal-calc";

describe("calcIVASoportado", () => {
  it("calcula la cuota IVA correctamente cuando hay IRPF (caso real del usuario)", () => {
    // Factura: base 1900€, IVA 21% (399€), IRPF 15% (285€), total 2014€.
    // Antes del fix daba 349,54€ (asumía base = 2014/1.21).
    const gastos: TransactionFiscalRow[] = [{ importe: 2014, ivaPorcentaje: 21, irpfPorcentaje: 15 }];
    expect(calcIVASoportado(gastos)).toBeCloseTo(399, 2);
  });

  it("no-regresión: sin IRPF, mismo resultado que la fórmula antigua", () => {
    const gastos: TransactionFiscalRow[] = [{ importe: 121, ivaPorcentaje: 21, irpfPorcentaje: null }];
    expect(calcIVASoportado(gastos)).toBeCloseTo(21, 2);
  });

  it("ignora gastos sin IVA", () => {
    const gastos: TransactionFiscalRow[] = [{ importe: 100, ivaPorcentaje: null, irpfPorcentaje: null }];
    expect(calcIVASoportado(gastos)).toBe(0);
  });

  it("suma correctamente una mezcla de gastos con/sin IRPF", () => {
    const gastos: TransactionFiscalRow[] = [
      { importe: 2014, ivaPorcentaje: 21, irpfPorcentaje: 15 }, // → 399 IVA
      { importe: 121, ivaPorcentaje: 21, irpfPorcentaje: null }, // → 21 IVA
      { importe: 100, ivaPorcentaje: null, irpfPorcentaje: null }, // → 0 IVA
    ];
    expect(calcIVASoportado(gastos)).toBeCloseTo(420, 2);
  });

  it("array vacío devuelve 0", () => {
    expect(calcIVASoportado([])).toBe(0);
  });
});

describe("calcGastosBase", () => {
  it("calcula la base correctamente cuando hay IRPF (caso real del usuario)", () => {
    // Factura: base 1900€. Antes del fix daba 1664,46€ (asumía base = 2014/1.21).
    const gastos: TransactionFiscalRow[] = [{ importe: 2014, ivaPorcentaje: 21, irpfPorcentaje: 15 }];
    expect(calcGastosBase(gastos)).toBeCloseTo(1900, 2);
  });

  it("no-regresión: sin IRPF, mismo resultado que la fórmula antigua", () => {
    const gastos: TransactionFiscalRow[] = [{ importe: 121, ivaPorcentaje: 21, irpfPorcentaje: null }];
    expect(calcGastosBase(gastos)).toBeCloseTo(100, 2);
  });

  it("trata gasto sin impuestos como base = importe", () => {
    const gastos: TransactionFiscalRow[] = [{ importe: 100, ivaPorcentaje: null, irpfPorcentaje: null }];
    expect(calcGastosBase(gastos)).toBe(100);
  });

  it("suma correctamente una mezcla de gastos", () => {
    const gastos: TransactionFiscalRow[] = [
      { importe: 2014, ivaPorcentaje: 21, irpfPorcentaje: 15 }, // base 1900
      { importe: 121, ivaPorcentaje: 21, irpfPorcentaje: null }, // base 100
      { importe: 50, ivaPorcentaje: null, irpfPorcentaje: null }, // base 50
    ];
    expect(calcGastosBase(gastos)).toBeCloseTo(2050, 2);
  });
});

describe("calcModelo303", () => {
  it("calcula el resultado a ingresar/compensar", () => {
    expect(calcModelo303(500, 200)).toEqual({
      repercutido: 500,
      soportado: 200,
      resultado: 300,
      label: "A ingresar:",
    });

    expect(calcModelo303(100, 250)).toEqual({
      repercutido: 100,
      soportado: 250,
      resultado: -150,
      label: "A compensar:",
    });
  });
});

describe("calcModelo130", () => {
  it("calcula el beneficio neto correctamente", () => {
    expect(calcModelo130(5000, 1900, 750)).toEqual({
      ingresos: 5000,
      gastos: 1900,
      retenciones: 750,
      beneficioNeto: 3100,
    });
  });
});
