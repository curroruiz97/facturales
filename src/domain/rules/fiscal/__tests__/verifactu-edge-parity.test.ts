import { describe, expect, it } from "vitest";
// Importa el fichero AUTORITATIVO del servidor (Edge Function) y lo valida con los mismos
// vectores oficiales de la AEAT. Así garantizamos que la lógica server-side no diverge.
import {
  calcularHuellaAlta,
  calcularHuellaAnulacion,
  construirUrlCotejoQr,
} from "../../../../../supabase/functions/_shared/verifactu";

describe("Verifactu (server _shared) — paridad con vectores oficiales AEAT", () => {
  it("huella RegistroAlta (primer registro) = vector oficial", async () => {
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

  it("huella RegistroAnulacion (encadenado) = vector oficial", async () => {
    const huella = await calcularHuellaAnulacion({
      idEmisorFacturaAnulada: "89890001K",
      numSerieFacturaAnulada: "12345679/G34",
      fechaExpedicionFacturaAnulada: "01-01-2024",
      huellaRegistroAnterior: "F7B94CFD8924EDFF273501B01EE5153E4CE8F259766F88CF6ACB8935802A2B97",
      fechaHoraHusoGenRegistro: "2024-01-01T19:20:40+01:00",
    });
    expect(huella).toBe("177547C0D57AC74748561D054A9CEC14B4C4EA23D1BEFD6F2E69E3A388F90C68");
  });

  it("URL de cotejo QR = ejemplo oficial (con %26)", () => {
    const url = construirUrlCotejoQr({
      nif: "89890001K",
      numSerie: "12345678&G33",
      fecha: "01-01-2024",
      importe: "241.4",
    });
    expect(url).toBe(
      "https://www2.agenciatributaria.gob.es/wlpl/TIKE-CONT/ValidarQR?nif=89890001K&numserie=12345678%26G33&fecha=01-01-2024&importe=241.4",
    );
  });
});
