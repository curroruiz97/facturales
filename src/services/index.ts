import { accessLogService } from "./access-log/access-log.service";
import { authService } from "./auth/auth.service";
import { billingLimitsService } from "./billing-limits/billing-limits.service";
import { businessInfoService } from "./business/business-info.service";
import { invoiceSeriesService } from "./invoice-series/invoice-series.service";
import { onboardingService } from "./onboarding/onboarding.service";
import { expenseOcrService } from "./ocr/expense-ocr.service";
import { getSupabaseClient, waitForLegacySupabaseAuthReady } from "./supabase/client";
import { supportTicketService } from "./support/support-ticket.service";
import { clientsRepository, invoicesRepository, productsRepository, quotesRepository, transactionsRepository } from "./repositories";

export const facturalesServices = {
  supabase: {
    getClient: getSupabaseClient,
    waitForAuthReady: waitForLegacySupabaseAuthReady,
  },
  auth: authService,
  billingLimits: billingLimitsService,
  businessInfo: businessInfoService,
  invoiceSeries: invoiceSeriesService,
  onboarding: onboardingService,
  accessLog: accessLogService,
  support: supportTicketService,
  ocr: expenseOcrService,
  repositories: {
    clients: clientsRepository,
    transactions: transactionsRepository,
    products: productsRepository,
    invoices: invoicesRepository,
    quotes: quotesRepository,
  },
} as const;

export type FacturalesServices = typeof facturalesServices;
