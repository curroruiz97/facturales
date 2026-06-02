import { describe, expect, it } from "vitest";
import {
  calcularHuellaAlta,
  calcularHuellaAnulacion,
  construirCadenaAlta,
  construirCadenaAnulacion,
  sha256Hex,
} from "../verifactu-huella";

/**
 * Vectores OFICIALES de la AEAT, tomados literalmente del documento
 * "Detalle de las especificaciones técnicas para generación de la huella o hash
 *  de los registros de facturación" (v0.1.2, 27/08/2024).
 *
 * Son la verdad absoluta: si estos tests pasan, nuestra huella es válida para la AEAT.
 */
describe("Verifactu huella — vectores oficiales AEAT", () => {
  it("RegistroAlta (primer registro): construye la cadena canónica exacta", () => {
    const cadena = construirCadenaAlta({
      idEmisorFactura: "89890001K",
      numSerieFactura: "12345678/G33",
      fechaExpedicionFactura: "01-01-2024",
      tipoFactura: "F1",
      cuotaTotal: "12.35",
      importeTotal: "123.45",
      huellaRegistroAnterior: "",
      fechaHoraHusoGenRegistro: "2024-01-01T19:20:30+01:00",
    });
    expect(cadena).toBe(
      "IDEmisorFactura=89890001K&NumSerieFactura=12345678/G33&FechaExpedicionFactura=01-01-2024&TipoFactura=F1&CuotaTotal=12.35&ImporteTotal=123.45&Huella=&FechaHoraHusoGenRegistro=2024-01-01T19:20:30+01:00",
    );
  });

  it("RegistroAlta (primer registro): huella SHA-256 = vector oficial", async () => {
    const huella = await calcularHuellaAlta({
      idEmisorFactura: "89890001K",
      numSerieFactura: "12345678/G33",
      fechaExpedicionFactura: "01-01-2024",
      tipoFactura: "F1",
      cuotaTotal: "12.35",
      importeTotal: "123.45",
      huellaRegistroAnterior: "",
      fechaHoraHusoGenRegistro: "2024-01-01T19:20:30+01:00",
    });
    expect(huella).toBe("3C464DAF61ACB827C65FDA19F352A4E3BDC2C640E9E9FC4CC058073F38F12F60");
  });

  it("RegistroAnulacion (encadenado): construye la cadena canónica exacta", () => {
    const cadena = construirCadenaAnulacion({
      idEmisorFacturaAnulada: "89890001K",
      numSerieFacturaAnulada: "12345679/G34",
      fechaExpedicionFacturaAnulada: "01-01-2024",
      huellaRegistroAnterior: "F7B94CFD8924EDFF273501B01EE5153E4CE8F259766F88CF6ACB8935802A2B97",
      fechaHoraHusoGenRegistro: "2024-01-01T19:20:40+01:00",
    });
    expect(cadena).toBe(
      "IDEmisorFacturaAnulada=89890001K&NumSerieFacturaAnulada=12345679/G34&FechaExpedicionFacturaAnulada=01-01-2024&Huella=F7B94CFD8924EDFF273501B01EE5153E4CE8F259766F88CF6ACB8935802A2B97&FechaHoraHusoGenRegistro=2024-01-01T19:20:40+01:00",
    );
  });

  it("RegistroAnulacion (encadenado): huella SHA-256 = vector oficial", async () => {
    const huella = await calcularHuellaAnulacion({
      idEmisorFacturaAnulada: "89890001K",
      numSerieFacturaAnulada: "12345679/G34",
      fechaExpedicionFacturaAnulada: "01-01-2024",
      huellaRegistroAnterior: "F7B94CFD8924EDFF273501B01EE5153E4CE8F259766F88CF6ACB8935802A2B97",
      fechaHoraHusoGenRegistro: "2024-01-01T19:20:40+01:00",
    });
    expect(huella).toBe("177547C0D57AC74748561D054A9CEC14B4C4EA23D1BEFD6F2E69E3A388F90C68");
  });
});

describe("Verifactu huella — reglas de formato y encadenamiento", () => {
  it("sha256Hex devuelve 64 caracteres hex en MAYÚSCULAS", async () => {
    const h = await sha256Hex("hola");
    expect(h).toMatch(/^[0-9A-F]{64}$/);
  });

  it("elimina los espacios al inicio y al final de cada valor (regla AEAT)", () => {
    const base = {
      idEmisorFactura: "89890001K",
      numSerieFactura: "12345678/G33",
      fechaExpedicionFactura: "01-01-2024",
      tipoFactura: "F1",
      cuotaTotal: "12.35",
      importeTotal: "123.45",
      huellaRegistroAnterior: "",
      fechaHoraHusoGenRegistro: "2024-01-01T19:20:30+01:00",
    } as const;
    const conEspacios = construirCadenaAlta({
      ...base,
      idEmisorFactura: "  89890001K  ",
      importeTotal: " 123.45 ",
    });
    expect(conEspacios).toBe(construirCadenaAlta(base));
  });

  it("el primer registro deja la huella anterior vacía (Huella=)", () => {
    const cadena = construirCadenaAlta({
      idEmisorFactura: "89890001K",
      numSerieFactura: "A1",
      fechaExpedicionFactura: "01-01-2024",
      tipoFactura: "F1",
      cuotaTotal: "0.00",
      importeTotal: "0.00",
      huellaRegistroAnterior: "",
      fechaHoraHusoGenRegistro: "2024-01-01T00:00:00+01:00",
    });
    expect(cadena).toContain("&Huella=&FechaHoraHusoGenRegistro=");
  });

  it("encadena: cambiar la huella anterior cambia la huella resultante", async () => {
    const campos = {
      idEmisorFactura: "89890001K",
      numSerieFactura: "A1",
      fechaExpedicionFactura: "01-01-2024",
      tipoFactura: "F1",
      cuotaTotal: "1.00",
      importeTotal: "6.00",
      fechaHoraHusoGenRegistro: "2024-01-01T10:00:00+01:00",
    } as const;
    const h1 = await calcularHuellaAlta({ ...campos, huellaRegistroAnterior: "" });
    const h2 = await calcularHuellaAlta({ ...campos, huellaRegistroAnterior: h1 });
    expect(h1).not.toBe(h2);
    // Determinista: misma entrada → misma huella.
    const h2bis = await calcularHuellaAlta({ ...campos, huellaRegistroAnterior: h1 });
    expect(h2bis).toBe(h2);
  });
});
