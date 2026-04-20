import { beforeEach, describe, expect, it, vi } from "vitest";
import { SupabaseInvoicesRepository } from "../invoices.repository";
import { getCurrentUserId, getSupabaseClient } from "../../supabase/client";
import type { Invoice } from "../../../shared/types/domain";

vi.mock("../../supabase/client", () => ({
  getCurrentUserId: vi.fn(),
  getSupabaseClient: vi.fn(),
}));

const mockedGetCurrentUserId = vi.mocked(getCurrentUserId);
const mockedGetSupabaseClient = vi.mocked(getSupabaseClient);

function buildInvoice(status: Invoice["status"], isPaid = false): Invoice {
  return {
    id: "inv-1",
    userId: "user-1",
    invoiceNumber: "F20260001",
    invoiceSeries: "A",
    clientId: "client-1",
    clientName: "Cliente Demo",
    issueDate: "2026-03-10",
    dueDate: "2026-03-20",
    subtotal: 100,
    taxAmount: 21,
    totalAmount: 121,
    currency: "EUR",
    status,
    isPaid,
    paidAt: isPaid ? "2026-03-10T12:00:00.000Z" : null,
    invoiceData: {
      issuer: {},
      client: {},
      invoice: {},
      concepts: [],
      expenses: [],
      taxSettings: {},
      paymentMethods: [],
      observations: "",
      summary: {
        subtotal: 100,
        discount: 0,
        taxBase: 100,
        taxRate: 21,
        taxAmount: 21,
        reRate: 0,
        reAmount: 0,
        retentionRate: 0,
        retentionAmount: 0,
        expenses: 0,
        total: 121,
        paid: isPaid ? 121 : 0,
        totalToPay: isPaid ? 0 : 121,
      },
    },
    createdAt: "2026-03-10T10:00:00.000Z",
    updatedAt: "2026-03-10T10:00:00.000Z",
  };
}

describe("invoices.repository", () => {
  let repository: SupabaseInvoicesRepository;

  beforeEach(() => {
    repository = new SupabaseInvoicesRepository();
    vi.clearAllMocks();
  });

  it("bloquea cambios de pago en facturas anuladas", async () => {
    mockedGetCurrentUserId.mockResolvedValue("user-1");
    vi.spyOn(repository, "getById").mockResolvedValue({
      success: true,
      data: buildInvoice("cancelled"),
    } as Awaited<ReturnType<SupabaseInvoicesRepository["getById"]>>);

    const result = await repository.togglePaid("inv-1", true);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("INVOICES_TOGGLE_PAID_CANCELLED");
    }
  });

  it("devuelve factura actual cuando ya esta emitida", async () => {
    const issuedInvoice = buildInvoice("issued");
    mockedGetCurrentUserId.mockResolvedValue("user-1");
    vi.spyOn(repository, "getById").mockResolvedValue({
      success: true,
      data: issuedInvoice,
    } as Awaited<ReturnType<SupabaseInvoicesRepository["getById"]>>);

    const result = await repository.emit("inv-1");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("issued");
      expect(result.data.id).toBe("inv-1");
    }
  });

  it("anula factura limpiando estado de pago", async () => {
    mockedGetCurrentUserId.mockResolvedValue("user-1");
    vi.spyOn(repository, "getById").mockResolvedValue({
      success: true,
      data: buildInvoice("issued", true),
    } as Awaited<ReturnType<SupabaseInvoicesRepository["getById"]>>);

    const updatedInvoiceRow = {
      id: "inv-1",
      user_id: "user-1",
      invoice_number: "F20260001",
      invoice_series: "A",
      client_id: "client-1",
      client_name: "Cliente Demo",
      issue_date: "2026-03-10",
      due_date: "2026-03-20",
      subtotal: 100,
      tax_amount: 21,
      total_amount: 121,
      currency: "EUR",
      status: "cancelled",
      is_paid: false,
      paid_at: null,
      invoice_data: buildInvoice("issued", true).invoiceData,
      created_at: "2026-03-10T10:00:00.000Z",
      updated_at: "2026-03-11T10:00:00.000Z",
    };

    const invoicesQuery = {
      eq: vi.fn(),
      select: vi.fn(),
      single: vi.fn(),
    };
    invoicesQuery.eq.mockReturnValue(invoicesQuery);
    invoicesQuery.select.mockReturnValue(invoicesQuery);
    invoicesQuery.single.mockResolvedValue({ data: updatedInvoiceRow, error: null });

    const update = vi.fn().mockReturnValue(invoicesQuery);

    const deleteQuery = {
      error: null,
      eq: vi.fn(),
    };
    deleteQuery.eq.mockReturnValue(deleteQuery);

    const from = vi.fn((table: string) => {
      if (table === "invoices") {
        return { update };
      }
      if (table === "transacciones") {
        return { delete: vi.fn().mockReturnValue(deleteQuery) };
      }
      return {};
    });

    mockedGetSupabaseClient.mockReturnValue({ from } as unknown as ReturnType<typeof getSupabaseClient>);

    const result = await repository.remove("inv-1");

    expect(result.success).toBe(true);
    expect(update).toHaveBeenCalledWith({
      status: "cancelled",
      is_paid: false,
      paid_at: null,
    });
  });
});

