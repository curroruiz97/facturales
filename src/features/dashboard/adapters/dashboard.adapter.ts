import { contactsAdapter } from "../../contacts/adapters/contacts.adapter";
import { transactionsAdapter } from "../../transactions/adapters/transactions.adapter";
import {
  buildSeries,
  calculateTotals,
  calculateVariation,
  resolvePeriodRange,
  resolvePreviousPeriodRange,
  type DashboardDateRange,
  type DashboardPeriod,
  type DashboardSeriesPoint,
} from "../domain/dashboard-metrics";
import { invoicesRepository, quotesRepository } from "../../../services/repositories";
import { fail, ok, type ServiceResult } from "../../../shared/types/service-result";
import type { Quote } from "../../../shared/types/domain";
import type { ClientFinancialSnapshot } from "../../contacts/adapters/contacts.adapter";
import type { TransactionLedgerItem } from "../../transactions/adapters/transactions.adapter";

export interface DashboardKpiSnapshot {
  income: number;
  expenses: number;
  balance: number;
  incomeDelta: number;
  expensesDelta: number;
  balanceDelta: number;
}

export interface DashboardDocumentSnapshot {
  issuedInvoices: number;
  unpaidInvoices: number;
  issuedQuotes: number;
}

export interface DashboardSnapshot {
  period: DashboardPeriod;
  range: DashboardDateRange;
  previousRange: DashboardDateRange;
  comparisonLabel: string;
  kpis: DashboardKpiSnapshot;
  documents: DashboardDocumentSnapshot;
  series: DashboardSeriesPoint[];
  contacts: ClientFinancialSnapshot[];
  recentContacts: ClientFinancialSnapshot[];
  recentTransactions: TransactionLedgerItem[];
}

export interface DashboardAdapter {
  loadSnapshot(period: DashboardPeriod, referenceDate?: Date): Promise<ServiceResult<DashboardSnapshot>>;
}

function isDateInRange(dateISO: string, range: DashboardDateRange): boolean {
  return dateISO >= range.start && dateISO <= range.end;
}

function countIssuedQuotes(quotes: Quote[], range: DashboardDateRange): number {
  return quotes.filter((quote) => quote.status === "issued" && isDateInRange(quote.issueDate, range)).length;
}

function sortByUpdatedAtDesc<T extends { updatedAt: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function sortTransactionsByDateDesc(transactions: TransactionLedgerItem[]): TransactionLedgerItem[] {
  return [...transactions].sort((a, b) => b.fecha.localeCompare(a.fecha));
}

export class DefaultDashboardAdapter implements DashboardAdapter {
  async loadSnapshot(period: DashboardPeriod, referenceDate = new Date()): Promise<ServiceResult<DashboardSnapshot>> {
    const [transactionsResult, contactsResult, invoicesResult, quotesResult] = await Promise.all([
      transactionsAdapter.loadTransactions({ tipo: "all", categoria: "all" }),
      contactsAdapter.loadContacts(""),
      invoicesRepository.list({}),
      quotesRepository.list({}),
    ]);

    if (!transactionsResult.success) {
      return fail(transactionsResult.error.message, transactionsResult.error.code, transactionsResult.error.cause);
    }
    if (!contactsResult.success) {
      return fail(contactsResult.error.message, contactsResult.error.code, contactsResult.error.cause);
    }
    if (!invoicesResult.success) {
      return fail(invoicesResult.error.message, invoicesResult.error.code, invoicesResult.error.cause);
    }
    if (!quotesResult.success) {
      return fail(quotesResult.error.message, quotesResult.error.code, quotesResult.error.cause);
    }

    const range = resolvePeriodRange(referenceDate, period);
    const previousRange = resolvePreviousPeriodRange(referenceDate, period);

    const currentTotals = calculateTotals(transactionsResult.data, range);
    const previousTotals = calculateTotals(transactionsResult.data, previousRange);

    const kpis: DashboardKpiSnapshot = {
      income: currentTotals.income,
      expenses: currentTotals.expenses,
      balance: currentTotals.balance,
      incomeDelta: calculateVariation(currentTotals.income, previousTotals.income),
      expensesDelta: calculateVariation(currentTotals.expenses, previousTotals.expenses),
      balanceDelta: calculateVariation(currentTotals.balance, previousTotals.balance),
    };

    const issuedInvoices = invoicesResult.data.filter(
      (invoice) => invoice.status === "issued" && isDateInRange(invoice.issueDate, range),
    );
    const documents: DashboardDocumentSnapshot = {
      issuedInvoices: issuedInvoices.length,
      unpaidInvoices: issuedInvoices.filter((invoice) => !invoice.isPaid).length,
      issuedQuotes: countIssuedQuotes(quotesResult.data, range),
    };

    const series = buildSeries(transactionsResult.data, range, period);

    const contacts = sortByUpdatedAtDesc(contactsResult.data);
    const recentContacts = contacts.slice(0, 6);
    const recentTransactions = sortTransactionsByDateDesc(
      transactionsResult.data.filter((transaction) => isDateInRange(transaction.fecha, range)),
    ).slice(0, 8);

    return ok({
      period,
      range,
      previousRange,
      comparisonLabel: range.comparisonLabel,
      kpis,
      documents,
      series,
      contacts,
      recentContacts,
      recentTransactions,
    });
  }
}

export const dashboardAdapter = new DefaultDashboardAdapter();
