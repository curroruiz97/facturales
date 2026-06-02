import { describe, expect, it } from "vitest";
import { calcularHuellaAlta } from "../verifactu-huella";
import {
  construirCamposHuellaAlta,
  determinarTipoFactura,
  formatearFechaExpedicion,
  formatearImporte,
} from "../verifactu-registro";

describe("Verifactu registro — formato de campos", () => {
  it("formatea la fecha ISO a DD-MM-AAAA", () => {
    expect(formatearFechaExpedicion("2024-01-01")).toBe("01-01-2024");
    expect(formatearFechaExpedicion("2026-03-15T10:20:30+01:00")).toBe("15-03-2026");
  });

  it("lanza si la fecha no es ISO válida", () => {
    expect(() => formatearFechaExpedicion("01/01/2024")).toThrow();
  });

  it("formatea importes a 2 decimales con punto", () => {
    expect(formatearImporte(123.4)).toBe("123.40");
    expect(formatearImporte(12.35)).toBe("12.35");
    expect(formatearImporte(0)).toBe("0.00");
  });

  it("lanza si el importe no es finito", () => {
    expect(() => formatearImporte(Number.NaN)).toThrow();
  });

  it("determina F1 con NIF de cliente y F2 sin él", () => {
    expect(determinarTipoFactura("B12345678")).toBe("F1");
    expect(determinarTipoFactura("")).toBe("F2");
    expect(determinarTipoFactura(null)).toBe("F2");
    expect(determinarTipoFactura("   ")).toBe("F2");
  });
});

describe("Verifactu registro — integración con la huella (vector oficial AEAT)", () => {
  it("construir campos desde datos de factura + calcular huella reproduce el vector oficial", async () => {
    // Datos equivalentes al primer registro del ejemplo oficial de la AEAT,
    // pero partiendo del modelo de la app (fecha ISO, importes numéricos).
    const campos = construirCamposHuellaAlta({
      nifEmisor: "89890001K",
      numeroFactura: "12345678/G33",
      fechaExpedicionIso: "2024-01-01",
      tipoFactura: "F1",
      cuotaTotal: 12.35,
      importeTotal: 123.45,
      huellaRegistroAnterior: "",
      fechaHoraHusoGenRegistro: "2024-01-01T19:20:30+01:00",
    });

    expect(campos.fechaExpedicionFactura).toBe("01-01-2024");
    expect(campos.cuotaTotal).toBe("12.35");
    expect(campos.importeTotal).toBe("123.45");

    const huella = await calcularHuellaAlta(campos);
    expect(huella).toBe("3C464DAF61ACB827C65FDA19F352A4E3BDC2C640E9E9FC4CC058073F38F12F60");
  });
});
