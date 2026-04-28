export type BillingPlan = "none" | "starter" | "pro" | "business";
export type BillingInterval = "monthly" | "yearly";

export type ClientStatus = "activo" | "inactivo" | "recurrente" | "puntual";
export type ClientKind = "autonomo" | "empresa";

export interface Client {
  id: string;
  userId: string;
  nombreRazonSocial: string;
  identificador: string;
  tipoCliente: ClientKind;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  codigoPostal: string | null;
  ciudad: string | null;
  provincia?: string | null;
  pais: string | null;
  diaFacturacion: number | null;
  estado: ClientStatus;
  createdAt: string;
  updatedAt: string;
}

export type TransactionType = "gasto" | "ingreso";

export type TransactionCategory =
  | "material_oficina"
  | "servicios_profesionales"
  | "suministros"
  | "alquiler"
  | "transporte"
  | "marketing"
  | "otros"
  | "factura";

export interface Transaction {
  id: string;
  userId: string;
  clienteId: string | null;
  importe: number;
  concepto: string;
  fecha: string;
  categoria: TransactionCategory;
  tipo: TransactionType;
  observaciones: string | null;
  ivaPorcentaje: number | null;
  irpfPorcentaje: number | null;
  /** Si el gasto es deducible fiscalmente (default true). Solo se filtra cuando tipo === "gasto". */
  deducible: boolean;
  invoiceId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  userId: string;
  nombre: string;
  referencia: string | null;
  descripcion: string | null;
  precioCompra: number | null;
  precioVenta: number;
  impuesto: string;
  descuento: number;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentLine {
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  tax: number;
  taxLabel?: string;
  taxRate?: number;
  re?: number;
  total: number;
}

export interface PaymentMethod {
  type: "transferencia" | "bizum" | "efectivo" | "domiciliacion" | "contrareembolso" | "otro";
  iban?: string;
  phone?: string;
  label?: string;
}

export interface DocumentSummary {
  subtotal: number;
  discount: number;
  taxBase: number;
  taxRate: number;
  taxAmount: number;
  reRate: number;
  reAmount: number;
  retentionRate: number;
  retentionAmount: number;
  expenses: number;
  total: number;
  paid: number;
  totalToPay: number;
}

export interface InvoiceDraftPayload {
  issuer: Record<string, unknown>;
  client: Record<string, unknown>;
  invoice: Record<string, unknown>;
  concepts: DocumentLine[];
  expenses: Array<{ description: string; amount: number }>;
  taxSettings: Record<string, unknown>;
  dates?: Record<string, unknown>;
  payment?: Record<string, unknown>;
  adjustments?: Record<string, unknown>;
  options?: Record<string, unknown>;
  paymentMethods: PaymentMethod[];
  observations: string;
  summary: DocumentSummary;
}

export interface QuoteDraftPayload {
  issuer: Record<string, unknown>;
  client: Record<string, unknown>;
  quote: Record<string, unknown>;
  concepts: DocumentLine[];
  expenses: Array<{ description: string; amount: number }>;
  taxSettings: Record<string, unknown>;
  dates?: Record<string, unknown>;
  payment?: Record<string, unknown>;
  adjustments?: Record<string, unknown>;
  options?: Record<string, unknown>;
  paymentMethods: PaymentMethod[];
  observations: string;
  summary: DocumentSummary;
}

export type InvoiceStatus = "draft" | "issued" | "cancelled";
export type QuoteStatus = "draft" | "issued" | "cancelled";

export interface Invoice {
  id: string;
  userId: string;
  invoiceNumber: string | null;
  invoiceSeries: string;
  clientId: string | null;
  clientName: string;
  issueDate: string;
  dueDate: string | null;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  status: InvoiceStatus;
  isPaid: boolean;
  paidAt: string | null;
  invoiceData: InvoiceDraftPayload;
  createdAt: string;
  updatedAt: string;
}

export interface Quote {
  id: string;
  userId: string;
  quoteNumber: string | null;
  quoteSeries: string;
  clientId: string | null;
  clientName: string;
  issueDate: string;
  dueDate: string | null;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  status: QuoteStatus;
  isPaid: boolean;
  paidAt: string | null;
  quoteData: QuoteDraftPayload;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceDraft extends Invoice {
  status: "draft";
}

export interface IssuedInvoice extends Invoice {
  status: "issued";
  invoiceNumber: string;
}

export interface QuoteDraft extends Quote {
  status: "draft";
}

export interface PlanUsage {
  clients: number;
  products: number;
  invoicesMonth: number;
  ocrMonth: number;
}

export interface PlanLimits {
  clients: number;
  products: number;
  invoicesMonth: number;
  ocrMonth: number;
}

export interface BillingUsageSnapshot {
  plan: BillingPlan;
  planName: string;
  limits: PlanLimits;
  usage: PlanUsage;
}

export interface OnboardingProgress {
  userId: string;
  step1BusinessInfo: boolean;
  step2FirstClient: boolean;
  step3CustomizeInvoice: boolean;
  step4FirstInvoice: boolean;
  createdAt?: string;
  updatedAt?: string;
}
