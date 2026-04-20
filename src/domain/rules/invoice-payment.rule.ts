export type InvoicePaymentAction = "create_transaction" | "delete_transaction";

export interface InvoicePaymentPayload<TInvoice> {
  isPaid: boolean;
  invoice: TInvoice;
  createTransaction: (invoice: TInvoice) => Promise<void>;
  deleteTransaction: (invoice: TInvoice) => Promise<void>;
}

export interface InvoicePaymentSideEffectResult {
  action: InvoicePaymentAction;
}

export function resolveInvoicePaymentAction(isPaid: boolean): InvoicePaymentAction {
  return isPaid ? "create_transaction" : "delete_transaction";
}

export async function applyInvoicePaymentSideEffects<TInvoice>(
  payload: InvoicePaymentPayload<TInvoice>,
): Promise<InvoicePaymentSideEffectResult> {
  const action = resolveInvoicePaymentAction(payload.isPaid);
  if (action === "create_transaction") {
    await payload.createTransaction(payload.invoice);
    return { action };
  }

  await payload.deleteTransaction(payload.invoice);
  return { action };
}
