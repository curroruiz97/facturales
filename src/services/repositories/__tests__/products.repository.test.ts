import { beforeEach, describe, expect, it, vi } from "vitest";
import { SupabaseProductsRepository } from "../products.repository";
import { getCurrentUserId, getSupabaseClient } from "../../supabase/client";

vi.mock("../../supabase/client", () => ({
  getCurrentUserId: vi.fn(),
  getSupabaseClient: vi.fn(),
}));

const mockedGetCurrentUserId = vi.mocked(getCurrentUserId);
const mockedGetSupabaseClient = vi.mocked(getSupabaseClient);

describe("products.repository", () => {
  let repository: SupabaseProductsRepository;

  beforeEach(() => {
    repository = new SupabaseProductsRepository();
    vi.clearAllMocks();
  });

  it("aplica impuesto por defecto IVA_21 al crear producto", async () => {
    mockedGetCurrentUserId.mockResolvedValue("user-1");

    const single = vi.fn().mockResolvedValue({
      data: {
        id: "prod-1",
        user_id: "user-1",
        nombre: "Servicio",
        referencia: null,
        descripcion: null,
        precio_compra: 0,
        precio_venta: 100,
        impuesto: "IVA_21",
        descuento: 0,
        created_at: "2026-03-11T00:00:00.000Z",
        updated_at: "2026-03-11T00:00:00.000Z",
      },
      error: null,
    });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    const from = vi.fn().mockReturnValue({ insert });

    mockedGetSupabaseClient.mockReturnValue({ from } as unknown as ReturnType<typeof getSupabaseClient>);

    await repository.create({
      nombre: "Servicio",
      precioVenta: 100,
    });

    const insertedRow = insert.mock.calls[0][0][0];
    expect(insertedRow.impuesto).toBe("IVA_21");
  });

  it("protege update por user_id", async () => {
    mockedGetCurrentUserId.mockResolvedValue("user-42");

    const query = {
      eq: vi.fn(),
      select: vi.fn(),
      single: vi.fn(),
    };
    query.eq.mockReturnValue(query);
    query.select.mockReturnValue(query);
    query.single.mockResolvedValue({
      data: {
        id: "prod-1",
        user_id: "user-42",
        nombre: "Producto actualizado",
        referencia: null,
        descripcion: null,
        precio_compra: 10,
        precio_venta: 50,
        impuesto: "IVA_21",
        descuento: 0,
        created_at: "2026-03-11T00:00:00.000Z",
        updated_at: "2026-03-11T00:00:00.000Z",
      },
      error: null,
    });

    const from = vi.fn().mockReturnValue({
      update: vi.fn().mockReturnValue(query),
    });
    mockedGetSupabaseClient.mockReturnValue({ from } as unknown as ReturnType<typeof getSupabaseClient>);

    const result = await repository.update("prod-1", { nombre: "Producto actualizado" });

    expect(result.success).toBe(true);
    expect(query.eq).toHaveBeenCalledWith("id", "prod-1");
    expect(query.eq).toHaveBeenCalledWith("user_id", "user-42");
  });

  it("protege remove por user_id", async () => {
    mockedGetCurrentUserId.mockResolvedValue("user-99");

    const query = {
      error: null,
      eq: vi.fn(),
    };
    query.eq.mockReturnValue(query);

    const from = vi.fn().mockReturnValue({
      delete: vi.fn().mockReturnValue(query),
    });
    mockedGetSupabaseClient.mockReturnValue({ from } as unknown as ReturnType<typeof getSupabaseClient>);

    const result = await repository.remove("prod-7");

    expect(result.success).toBe(true);
    expect(query.eq).toHaveBeenCalledWith("id", "prod-7");
    expect(query.eq).toHaveBeenCalledWith("user_id", "user-99");
  });

  it("bloquea update cuando no hay usuario autenticado", async () => {
    mockedGetCurrentUserId.mockResolvedValue(null);

    const result = await repository.update("prod-2", { nombre: "Producto" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("AUTH_REQUIRED");
    }
  });
});

