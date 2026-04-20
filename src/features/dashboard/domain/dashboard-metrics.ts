import type { Quote, Transaction } from "../../../shared/types/domain";

export type DashboardPeriod = "month" | "Q1" | "Q2" | "Q3" | "Q4" | "year";

export interface DashboardDateRange {
  start: string;
  end: string;
  comparisonLabel: string;
}

export interface DashboardTotals {
  income: number;
  expenses: number;
  balance: number;
  transactions: number;
}

export interface DashboardSeriesPoint {
  label: string;
  income: number;
  expenses: number;
}

const MONTH_NAMES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const MONTH_NAMES_FULL = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function toISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseISODate(value: string): Date {
  const [year, month, day] = value.split("-").map((part) => Number.parseInt(part, 10));
  return new Date(year, month - 1, day);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function monthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function monthEnd(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function quarterStart(year: number, quarter: 1 | 2 | 3 | 4): Date {
  const monthByQuarter: Record<1 | 2 | 3 | 4, number> = {
    1: 0,
    2: 3,
    3: 6,
    4: 9,
  };
  return new Date(year, monthByQuarter[quarter], 1);
}

function quarterEnd(year: number, quarter: 1 | 2 | 3 | 4): Date {
  const start = quarterStart(year, quarter);
  return new Date(start.getFullYear(), start.getMonth() + 3, 0);
}

function yearStart(date: Date): Date {
  return new Date(date.getFullYear(), 0, 1);
}

function yearEnd(date: Date): Date {
  return new Date(date.getFullYear(), 11, 31);
}

function resolveQuarter(period: DashboardPeriod): 1 | 2 | 3 | 4 {
  if (period === "Q1") return 1;
  if (period === "Q2") return 2;
  if (period === "Q3") return 3;
  return 4;
}

export function resolvePeriodRange(referenceDate: Date, period: DashboardPeriod): DashboardDateRange {
  if (period === "month") {
    const previousMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 1, 1);
    return {
      start: toISO(monthStart(referenceDate)),
      end: toISO(monthEnd(referenceDate)),
      comparisonLabel: MONTH_NAMES_FULL[previousMonth.getMonth()],
    };
  }

  if (period === "year") {
    const previousYear = referenceDate.getFullYear() - 1;
    return {
      start: toISO(yearStart(referenceDate)),
      end: toISO(yearEnd(referenceDate)),
      comparisonLabel: `Año ${previousYear}`,
    };
  }

  const quarter = resolveQuarter(period);
  const previousYear = referenceDate.getFullYear() - 1;
  return {
    start: toISO(quarterStart(referenceDate.getFullYear(), quarter)),
    end: toISO(quarterEnd(referenceDate.getFullYear(), quarter)),
    comparisonLabel: `T${quarter} ${previousYear}`,
  };
}

export function resolvePreviousPeriodRange(referenceDate: Date, period: DashboardPeriod): DashboardDateRange {
  if (period === "month") {
    const previousReference = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 1, 1);
    return {
      start: toISO(monthStart(previousReference)),
      end: toISO(monthEnd(previousReference)),
      comparisonLabel: "Período anterior",
    };
  }

  if (period === "year") {
    const previousYear = new Date(referenceDate.getFullYear() - 1, 0, 1);
    return {
      start: toISO(yearStart(previousYear)),
      end: toISO(yearEnd(previousYear)),
      comparisonLabel: "Período anterior",
    };
  }

  const quarter = resolveQuarter(period);
  const previousYear = referenceDate.getFullYear() - 1;
  return {
    start: toISO(quarterStart(previousYear, quarter)),
    end: toISO(quarterEnd(previousYear, quarter)),
    comparisonLabel: "Período anterior",
  };
}

export function isDateWithinRange(dateISO: string, range: DashboardDateRange): boolean {
  return dateISO >= range.start && dateISO <= range.end;
}

export function calculateTotals(transactions: Transaction[], range: DashboardDateRange): DashboardTotals {
  const totals = transactions.reduce(
    (acc, transaction) => {
      if (!isDateWithinRange(transaction.fecha, range)) return acc;
      if (transaction.tipo === "ingreso") acc.income += transaction.importe;
      else acc.expenses += transaction.importe;
      acc.transactions += 1;
      return acc;
    },
    {
      income: 0,
      expenses: 0,
      transactions: 0,
    },
  );

  return {
    income: totals.income,
    expenses: totals.expenses,
    balance: totals.income - totals.expenses,
    transactions: totals.transactions,
  };
}

export function calculateVariation(current: number, previous: number): number {
  if (previous === 0 && current === 0) return 0;
  if (previous === 0) return 100;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function countIssuedDocumentsInRange<TDocument extends Pick<Quote, "issueDate" | "status">>(
  documents: TDocument[],
  range: DashboardDateRange,
): number {
  return documents.filter((document) => document.status === "issued" && isDateWithinRange(document.issueDate, range)).length;
}

export function buildSeries(
  transactions: Transaction[],
  range: DashboardDateRange,
  period: DashboardPeriod,
): DashboardSeriesPoint[] {
  if (period === "month") {
    const start = parseISODate(range.start);
    const end = parseISODate(range.end);
    const bucketStarts = [1, 8, 15, 22, 29];
    const buckets = bucketStarts.map((dayStart, index) => {
      const bucketStart = new Date(start.getFullYear(), start.getMonth(), dayStart);
      const nextDayStart = bucketStarts[index + 1] ?? 32;
      const bucketEnd = addDays(new Date(start.getFullYear(), start.getMonth(), nextDayStart), -1);
      const clampedEnd = bucketEnd > end ? end : bucketEnd;
      const isLast = index === bucketStarts.length - 1;
      return {
        label: isLast ? `${dayStart}-` : `${dayStart}-${clampedEnd.getDate()}`,
        start: toISO(bucketStart),
        end: toISO(clampedEnd),
      };
    }).filter((bucket) => bucket.start <= bucket.end);

    return buckets.map((bucket) => {
      let income = 0;
      let expenses = 0;
      for (const transaction of transactions) {
        if (transaction.fecha < bucket.start || transaction.fecha > bucket.end) continue;
        if (transaction.tipo === "ingreso") income += transaction.importe;
        else expenses += transaction.importe;
      }
      return {
        label: bucket.label,
        income,
        expenses,
      };
    });
  }

  const startDate = parseISODate(range.start);
  const endDate = parseISODate(range.end);
  const buckets: Array<{ label: string; year: number; month: number }> = [];
  const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  while (cursor <= endDate) {
    buckets.push({
      label: MONTH_NAMES[cursor.getMonth()],
      year: cursor.getFullYear(),
      month: cursor.getMonth(),
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return buckets.map((bucket) => {
    let income = 0;
    let expenses = 0;
    for (const transaction of transactions) {
      const date = parseISODate(transaction.fecha);
      if (date.getFullYear() !== bucket.year || date.getMonth() !== bucket.month) continue;
      if (transaction.tipo === "ingreso") income += transaction.importe;
      else expenses += transaction.importe;
    }
    return {
      label: bucket.label,
      income,
      expenses,
    };
  });
}

