import { describe, expect, it } from "vitest";
import {
  calcGastosBase,
  calcIVASoportado,
  calcModelo130,
  calcModelo130Detail,
  calcModelo303,
  calcPagosAnterioresAcumulados,
  type Modelo130PeriodAggregates,
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

describe("calcModelo130Detail", () => {
  it("aplica el 7% de difícil justificación con tope 2000€", () => {
    // Ingresos 50.000, gastos 5.000 → rendimiento 45.000
    // 7% de 45.000 = 3.150 → topado a 2.000
    const detail = calcModelo130Detail(50000, 5000, 0, {
      applyDifficultJustification: true,
      pagosAnteriores: 0,
    });
    expect(detail.rendimientoNetoPrevio).toBe(45000);
    expect(detail.difJustificacionImporte).toBe(2000); // tope
    expect(detail.difJustificacionAplicada).toBe(true);
    expect(detail.rendimientoNeto).toBe(43000);
    expect(detail.pagoAcumulado).toBeCloseTo(8600, 2); // 20% de 43000
  });

  it("aplica el 7% sin alcanzar el tope cuando el rendimiento es bajo", () => {
    // Ingresos 5.000, gastos 1.000 → rendimiento 4.000
    // 7% de 4.000 = 280 (no alcanza tope 2000)
    const detail = calcModelo130Detail(5000, 1000, 0, {
      applyDifficultJustification: true,
      pagosAnteriores: 0,
    });
    expect(detail.rendimientoNetoPrevio).toBe(4000);
    expect(detail.difJustificacionImporte).toBeCloseTo(280, 2);
    expect(detail.rendimientoNeto).toBeCloseTo(3720, 2);
  });

  it("NO aplica difícil justificación cuando se desactiva", () => {
    const detail = calcModelo130Detail(5000, 1000, 0, {
      applyDifficultJustification: false,
      pagosAnteriores: 0,
    });
    expect(detail.difJustificacionImporte).toBe(0);
    expect(detail.difJustificacionAplicada).toBe(false);
    expect(detail.rendimientoNeto).toBe(4000); // sin reducción
    expect(detail.pagoAcumulado).toBe(800); // 20% de 4000
  });

  it("NO aplica difícil justificación cuando hay pérdidas", () => {
    // Ingresos 1.000, gastos 5.000 → rendimiento -4.000 (no aplica DJ)
    const detail = calcModelo130Detail(1000, 5000, 0, {
      applyDifficultJustification: true,
      pagosAnteriores: 0,
    });
    expect(detail.difJustificacionImporte).toBe(0);
    expect(detail.rendimientoNeto).toBe(0); // negativo se trunca a 0
    expect(detail.pagoAcumulado).toBe(0);
    expect(detail.resultado).toBe(0);
  });

  it("resta retenciones al pago acumulado", () => {
    // Rendimiento 5.000, sin DJ → pago 1.000
    // Retenciones acumuladas: 600 → pago neto 400
    const detail = calcModelo130Detail(5000, 0, 600, {
      applyDifficultJustification: false,
      pagosAnteriores: 0,
    });
    expect(detail.pagoAcumulado).toBe(1000);
    expect(detail.pagoAcumuladoMenosRetenciones).toBe(400);
    expect(detail.resultado).toBe(400);
    expect(detail.label).toBe("A ingresar:");
  });

  it("resta los pagos a cuenta de trimestres anteriores", () => {
    // Rendimiento acumulado YTD 8.000 → pago acumulado 1.600 (sin DJ, sin retenciones)
    // Pagos anteriores 1.000 → resultado del trimestre = 600
    const detail = calcModelo130Detail(8000, 0, 0, {
      applyDifficultJustification: false,
      pagosAnteriores: 1000,
    });
    expect(detail.pagoAcumulado).toBe(1600);
    expect(detail.resultado).toBe(600);
  });

  it("resultado 0 cuando las retenciones cubren todo el pago", () => {
    // Pago 1.000, retenciones 1.500 → no se paga nada (no hay devolución en Modelo 130)
    const detail = calcModelo130Detail(5000, 0, 1500, {
      applyDifficultJustification: false,
      pagosAnteriores: 0,
    });
    expect(detail.pagoAcumuladoMenosRetenciones).toBe(0);
    expect(detail.resultado).toBe(0);
    expect(detail.label).toBe("Sin pago a cuenta:");
  });
});

describe("calcPagosAnterioresAcumulados", () => {
  it("calcula correctamente el acumulado de pagos previos T1+T2 cuando estamos en T3", () => {
    // T1 YTD: ingresos 3000, gastos 0 → pago = 600 (sin DJ)
    // T2 YTD: ingresos 6000, gastos 0 → pago acumulado 1200 - 600 ya pagado = 600
    // Total pagos anteriores al T3 = 600 + 600 = 1200
    const aggregates: Modelo130PeriodAggregates[] = [
      { ingresosBase: 3000, gastosBase: 0, retenciones: 0 },
      { ingresosBase: 6000, gastosBase: 0, retenciones: 0 },
    ];
    const pagos = calcPagosAnterioresAcumulados(aggregates, false);
    expect(pagos).toBeCloseTo(1200, 2);
  });

  it("cuando T1 cubre todo y luego viene una pérdida, no devuelve nada", () => {
    // T1 YTD: rendimiento 5000 → pago 1000
    // T2 YTD: rendimiento -2000 (pérdida acumulada) → pago_acumulado = 0, pero ya se pagaron 1000
    // El cálculo correcto: max(0, 0 - 1000) = 0. Modelo 130 no devuelve.
    const aggregates: Modelo130PeriodAggregates[] = [
      { ingresosBase: 5000, gastosBase: 0, retenciones: 0 }, // T1
      { ingresosBase: 5000, gastosBase: 7000, retenciones: 0 }, // T2 con pérdida
    ];
    const pagos = calcPagosAnterioresAcumulados(aggregates, false);
    // T1 paga 1000, T2 paga 0 → total 1000
    expect(pagos).toBeCloseTo(1000, 2);
  });

  it("array vacío devuelve 0 (estamos en T1 o año natural)", () => {
    expect(calcPagosAnterioresAcumulados([], false)).toBe(0);
  });
});

describe("calcGastosBase con flag deducible", () => {
  it("excluye gastos no deducibles del cálculo", () => {
    const gastos: TransactionFiscalRow[] = [
      { importe: 100, ivaPorcentaje: null, irpfPorcentaje: null, deducible: true },
      { importe: 200, ivaPorcentaje: null, irpfPorcentaje: null, deducible: false }, // multa, no deducible
      { importe: 50, ivaPorcentaje: null, irpfPorcentaje: null }, // sin flag = true por defecto
    ];
    expect(calcGastosBase(gastos)).toBe(150); // 100 + 50, ignorando 200
  });
});

describe("calcIVASoportado con flag deducible", () => {
  it("excluye gastos no deducibles", () => {
    const gastos: TransactionFiscalRow[] = [
      { importe: 121, ivaPorcentaje: 21, irpfPorcentaje: null, deducible: true }, // 21€ IVA
      { importe: 121, ivaPorcentaje: 21, irpfPorcentaje: null, deducible: false }, // ignorado
    ];
    expect(calcIVASoportado(gastos)).toBeCloseTo(21, 2);
  });
});
