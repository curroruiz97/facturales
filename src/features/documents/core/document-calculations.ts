import type { DocumentLine, DocumentSummary } from "../../../shared/types/domain";
import type { DocumentEditorState, DocumentLineDraft } from "./document-types";

export interface ParsedTaxCode {
  label: string;
  rate: number;
}

export interface DocumentTotalsSnapshot {
  summary: DocumentSummary;
  concepts: DocumentLine[];
}

function normalizeNumber(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value ?? 0));
  if (!Number.isFinite(parsed)) return 0;
  return parsed;
}

/** Round to 2 decimal places – avoids IEEE 754 floating-point drift in financial totals. */
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function parseTaxCode(code: string): ParsedTaxCode {
  const normalized = (code || "IVA_21").trim().toUpperCase();
  if (!normalized || normalized === "EXENTO") {
    return { label: "EXENTO", rate: 0 };
  }

  const [, rawRate = "0"] = normalized.split("_");
  const rate = normalizeNumber(rawRate);
  return { label: normalized, rate };
}

export function resolveRecargoRate(taxRate: number, applyRecargo: boolean): number {
  if (!applyRecargo) return 0;
  if (taxRate === 21) return 5.2;
  if (taxRate === 10) return 1.4;
  if (taxRate === 4) return 0.5;
  return 0;
}

export function toConceptLine(line: DocumentLineDraft, applyRecargo: boolean): DocumentLine {
  const quantity = normalizeNumber(line.quantity);
  const unitPrice = normalizeNumber(line.unitPrice);
  const discount = normalizeNumber(line.discount);
  const parsedTax = parseTaxCode(line.taxCode);
  const reRate = resolveRecargoRate(parsedTax.rate, applyRecargo);

  const conceptSubtotal = round2(quantity * unitPrice * (1 - discount / 100));
  const taxAmount = round2(conceptSubtotal * (parsedTax.rate / 100));
  const reAmount = round2(conceptSubtotal * (reRate / 100));

  return {
    description: line.description.trim() || "Producto/Servicio",
    quantity,
    unitPrice,
    discount,
    tax: parsedTax.rate,
    taxLabel: parsedTax.label,
    taxRate: Math.abs(parsedTax.rate),
    re: reRate,
    total: round2(conceptSubtotal + taxAmount + reAmount),
  };
}

export function calculateDocumentTotals(editor: DocumentEditorState): DocumentTotalsSnapshot {
  const concepts = editor.lines.map((line) => toConceptLine(line, editor.taxSettings.applyRecargoEquivalencia));

  let subtotal = 0;
  let taxBase = 0;
  let taxAmount = 0;
  let reAmount = 0;
  let maxTaxRate = 0;
  let maxReRate = 0;
  let lineDiscounts = 0;

  for (const line of concepts) {
    const rawSubtotal = round2(line.quantity * line.unitPrice);
    const lineDiscount = round2(rawSubtotal * ((line.discount || 0) / 100));
    const discountedSubtotal = round2(rawSubtotal - lineDiscount);

    subtotal += rawSubtotal;
    lineDiscounts += lineDiscount;
    taxBase += discountedSubtotal;
    taxAmount += round2(discountedSubtotal * ((line.tax || 0) / 100));
    reAmount += round2(discountedSubtotal * ((line.re || 0) / 100));

    if ((line.tax || 0) > maxTaxRate) {
      maxTaxRate = line.tax || 0;
    }
    if ((line.re || 0) > maxReRate) {
      maxReRate = line.re || 0;
    }
  }

  const expenses = round2(editor.expenses.reduce((acc, expense) => acc + normalizeNumber(expense.amount), 0));
  const generalDiscountRate = normalizeNumber(editor.taxSettings.generalDiscountRate);
  const generalDiscountAmount = round2(taxBase * (generalDiscountRate / 100));
  const discountMultiplier = 1 - generalDiscountRate / 100;

  const finalTaxBase = round2(taxBase * discountMultiplier);
  const finalTaxAmount = round2(taxAmount * discountMultiplier);
  const finalReAmount = round2(reAmount * discountMultiplier);
  const retentionRate = normalizeNumber(editor.taxSettings.retentionRate);
  const retentionAmount = round2(finalTaxBase * (retentionRate / 100));
  const total = round2(finalTaxBase + finalTaxAmount + finalReAmount + expenses - retentionAmount);
  const paid = normalizeNumber(editor.paidAmount);

  return {
    concepts,
    summary: {
      subtotal: round2(subtotal),
      discount: round2(lineDiscounts + generalDiscountAmount),
      taxBase: finalTaxBase,
      taxRate: maxTaxRate,
      taxAmount: finalTaxAmount,
      reRate: maxReRate,
      reAmount: finalReAmount,
      retentionRate,
      retentionAmount,
      expenses,
      total,
      paid: round2(paid),
      totalToPay: round2(total - paid),
    },
  };
}
