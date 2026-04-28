import { describe, expect, it } from "vitest";
import type { Transaction } from "../../../../shared/types/domain";
import {
  buildSeries,
  calculateTotals,
  calculateVariation,
  resolvePeriodRange,
  resolvePreviousPeriodRange,
} from "../dashboard-metrics";

function buildTransaction(overrides: Partial<Transaction>): Transaction {
  return {
    id: "tx-1",
    userId: "user-1",
    clienteId: null,
    importe: 100,
    concepto: "Concepto",
    fecha: "2026-03-01",
    categoria: "otros",
    tipo: "ingreso",
    observaciones: null,
    ivaPorcentaje: null,
    irpfPorcentaje: null,
    deducible: true,
    invoiceId: null,
    createdAt: "2026-03-01T10:00:00.000Z",
    updatedAt: "2026-03-01T10:00:00.000Z",
    ...overrides,
  };
}

describe("dashboard-metrics", () => {
  it("resuelve rango mensual y su rango anterior", () => {
    const reference = new Date("2026-03-11T12:00:00.000Z");
    const current = resolvePeriodRange(reference, "month");
    const previous = resolvePreviousPeriodRange(reference, "month");

    expect(current.start).toBe("2026-03-01");
    expect(current.end).toBe("2026-03-31");
    expect(previous.start).toBe("2026-02-01");
    expect(previous.end).toBe("2026-02-28");
  });

  it("calcula totales de ingresos, gastos y balance", () => {
    const range = resolvePeriodRange(new Date("2026-03-11T12:00:00.000Z"), "month");
    const transactions: Transaction[] = [
      buildTransaction({ tipo: "ingreso", importe: 1000, fecha: "2026-03-02" }),
      buildTransaction({ id: "tx-2", tipo: "gasto", importe: 250, fecha: "2026-03-10" }),
      buildTransaction({ id: "tx-3", tipo: "ingreso", importe: 300, fecha: "2026-02-27" }),
    ];

    const totals = calculateTotals(transactions, range);
    expect(totals.income).toBe(1000);
    expect(totals.expenses).toBe(250);
    expect(totals.balance).toBe(750);
    expect(totals.transactions).toBe(2);
  });

  it("calcula variaciones con base cero de forma controlada", () => {
    expect(calculateVariation(0, 0)).toBe(0);
    expect(calculateVariation(50, 0)).toBe(100);
    expect(calculateVariation(75, 100)).toBeCloseTo(-25);
  });

  it("genera serie mensual por semanas para la vista de mes", () => {
    const range = resolvePeriodRange(new Date("2026-03-11T12:00:00.000Z"), "month");
    const transactions: Transaction[] = [
      buildTransaction({ tipo: "ingreso", importe: 100, fecha: "2026-03-03" }),
      buildTransaction({ id: "tx-2", tipo: "gasto", importe: 50, fecha: "2026-03-09" }),
      buildTransaction({ id: "tx-3", tipo: "ingreso", importe: 75, fecha: "2026-03-30" }),
    ];
    const series = buildSeries(transactions, range, "month");

    expect(series).toHaveLength(5);
    expect(series[0].income).toBe(100);
    expect(series[1].expenses).toBe(50);
    expect(series[4].income).toBe(75);
  });

  it("genera serie por meses para trimestre y ano", () => {
    const range = resolvePeriodRange(new Date("2026-08-20T12:00:00.000Z"), "Q3");
    const transactions: Transaction[] = [
      buildTransaction({ fecha: "2026-07-10", tipo: "ingreso", importe: 120 }),
      buildTransaction({ id: "tx-2", fecha: "2026-08-11", tipo: "gasto", importe: 30 }),
      buildTransaction({ id: "tx-3", fecha: "2026-09-12", tipo: "ingreso", importe: 90 }),
    ];
    const series = buildSeries(transactions, range, "Q3");

    expect(series.map((item) => item.label)).toEqual(["Jul", "Ago", "Sep"]);
    expect(series[0].income).toBe(120);
    expect(series[1].expenses).toBe(30);
    expect(series[2].income).toBe(90);
  });
});
