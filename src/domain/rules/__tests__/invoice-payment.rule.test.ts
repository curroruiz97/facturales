import { describe, expect, it, vi } from "vitest";
import { applyInvoicePaymentSideEffects, resolveInvoicePaymentAction } from "../invoice-payment.rule";

describe("invoice-payment.rule", () => {
  it("resuelve accion create_transaction cuando la factura queda pagada", () => {
    expect(resolveInvoicePaymentAction(true)).toBe("create_transaction");
  });

  it("resuelve accion delete_transaction cuando la factura queda no pagada", () => {
    expect(resolveInvoicePaymentAction(false)).toBe("delete_transaction");
  });

  it("ejecuta createTransaction cuando isPaid=true", async () => {
    const createTransaction = vi.fn(async () => undefined);
    const deleteTransaction = vi.fn(async () => undefined);

    const result = await applyInvoicePaymentSideEffects({
      isPaid: true,
      invoice: { id: "inv-001" },
      createTransaction,
      deleteTransaction,
    });

    expect(result.action).toBe("create_transaction");
    expect(createTransaction).toHaveBeenCalledTimes(1);
    expect(deleteTransaction).not.toHaveBeenCalled();
  });

  it("ejecuta deleteTransaction cuando isPaid=false", async () => {
    const createTransaction = vi.fn(async () => undefined);
    const deleteTransaction = vi.fn(async () => undefined);

    const result = await applyInvoicePaymentSideEffects({
      isPaid: false,
      invoice: { id: "inv-001" },
      createTransaction,
      deleteTransaction,
    });

    expect(result.action).toBe("delete_transaction");
    expect(createTransaction).not.toHaveBeenCalled();
    expect(deleteTransaction).toHaveBeenCalledWith({ id: "inv-001" });
  });
});
