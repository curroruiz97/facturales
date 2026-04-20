import type { PaymentMethod } from "../../../shared/types/domain";

export type DocumentKind = "invoice" | "quote";

export interface DocumentParty {
  name: string;
  nif: string;
  email: string;
  address: string;
  postalCode: string;
}

export interface DocumentMeta {
  series: string;
  number: string;
  reference: string;
  issueDate: string;
  dueDate: string;
  operationDate: string;
  paymentTerms: string;
  currency: string;
}

export interface DocumentLineDraft {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxCode: string;
}

export interface DocumentExpenseDraft {
  id: string;
  description: string;
  amount: number;
}

export interface DocumentPaymentMethodDraft {
  id: string;
  type: PaymentMethod["type"];
  iban: string;
  phone: string;
  label: string;
}

export interface DocumentTaxSettingsDraft {
  taxType: "iva" | "igic" | "ipsi";
  applyRecargoEquivalencia: boolean;
  retentionRate: number;
  generalDiscountRate: number;
}

export interface DocumentEditorState {
  kind: DocumentKind;
  issuer: DocumentParty;
  client: DocumentParty & {
    clientId: string | null;
  };
  meta: DocumentMeta;
  lines: DocumentLineDraft[];
  expenses: DocumentExpenseDraft[];
  paymentMethods: DocumentPaymentMethodDraft[];
  taxSettings: DocumentTaxSettingsDraft;
  paidAmount: number;
  observations: string;
}

export const DOCUMENT_TAX_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "IVA_21", label: "IVA 21%" },
  { value: "IVA_10", label: "IVA 10%" },
  { value: "IVA_4", label: "IVA 4%" },
  { value: "IGIC_9.5", label: "IGIC 9.5%" },
  { value: "IGIC_7", label: "IGIC 7%" },
  { value: "IPSI_0.5", label: "IPSI 0.5%" },
  { value: "IRPF_-2", label: "IRPF -2%" },
  { value: "EXENTO", label: "Exento" },
];

export const PAYMENT_METHOD_OPTIONS: Array<{ value: PaymentMethod["type"]; label: string }> = [
  { value: "transferencia", label: "Transferencia" },
  { value: "bizum", label: "Bizum" },
  { value: "efectivo", label: "Efectivo" },
  { value: "domiciliacion", label: "Domiciliacion" },
  { value: "contrareembolso", label: "Contrareembolso" },
  { value: "otro", label: "Otro" },
];
