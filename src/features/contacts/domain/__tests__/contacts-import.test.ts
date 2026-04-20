import { describe, expect, it } from "vitest";
import { normalizeImportClientType, normalizeImportStatus, validateImportRow } from "../contacts-import";

describe("contacts-import", () => {
  it("normaliza estado de importacion", () => {
    expect(normalizeImportStatus("ACTIVO")).toBe("recurrente");
    expect(normalizeImportStatus("Puntual")).toBe("puntual");
    expect(normalizeImportStatus("")).toBe("recurrente");
  });

  it("normaliza tipo de cliente importado", () => {
    expect(normalizeImportClientType("empresa")).toBe("empresa");
    expect(normalizeImportClientType("freelance")).toBe("autonomo");
    expect(normalizeImportClientType("")).toBe("autonomo");
  });

  it("valida fila correcta", () => {
    const result = validateImportRow(
      {
        nombreRazonSocial: "Acme SL",
        identificador: "b12345678",
        email: "info@acme.com",
        telefono: "600000000",
        direccion: "Calle 1",
        codigoPostal: "28001",
        ciudad: "Madrid",
        provincia: "Madrid",
        pais: "Espana",
        diaFacturacion: "15",
        estado: "activo",
        tipoCliente: "empresa",
      },
      2,
    );

    expect(result.valid).toBe(true);
    expect(result.data.identificador).toBe("B12345678");
    expect(result.data.diaFacturacion).toBe(15);
    expect(result.data.estado).toBe("recurrente");
  });

  it("marca errores en fila invalida", () => {
    const result = validateImportRow(
      {
        nombreRazonSocial: "",
        identificador: "",
        email: "email-invalido",
        telefono: "",
        direccion: "",
        codigoPostal: "",
        ciudad: "",
        provincia: "",
        pais: "",
        diaFacturacion: "45",
        estado: "",
        tipoCliente: "",
      },
      4,
    );

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
  });
});

