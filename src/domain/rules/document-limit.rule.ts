import type { PlanLimits, PlanUsage } from "../../shared/types/domain";

export type DocumentKind = "invoice" | "quote";
export type DocumentUsageCounter = "invoicesMonth";

export interface DocumentLimitEvaluation {
  allowed: boolean;
  current: number;
  limit: number;
  counter: DocumentUsageCounter;
  reason?: string;
}

const DOCUMENT_COUNTER_BY_KIND: Record<DocumentKind, DocumentUsageCounter> = {
  invoice: "invoicesMonth",
  quote: "invoicesMonth",
};

export function resolveDocumentUsageCounter(kind: DocumentKind): DocumentUsageCounter {
  return DOCUMENT_COUNTER_BY_KIND[kind];
}

export function evaluateDocumentLimit(
  kind: DocumentKind,
  usage: PlanUsage,
  limits: PlanLimits,
  planName: string,
): DocumentLimitEvaluation {
  const counter = resolveDocumentUsageCounter(kind);
  const current = usage[counter];
  const limit = limits[counter];

  if (limit === Number.POSITIVE_INFINITY) {
    return { allowed: true, current, limit, counter };
  }

  if (current >= limit) {
    return {
      allowed: false,
      current,
      limit,
      counter,
      reason: `Has alcanzado el limite de ${limit} documentos/mes del plan ${planName}.`,
    };
  }

  return { allowed: true, current, limit, counter };
}
