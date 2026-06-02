import { describe, expect, it } from "vitest";
import { construirUrlCotejoQr } from "../verifactu-qr";

describe("Verifactu QR — vector oficial AEAT", () => {
  it("codifica el '&' interno de la serie como %26 (ejemplo oficial)", () => {
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

  it("mantiene el orden de parámetros nif, numserie, fecha, importe", () => {
    const url = construirUrlCotejoQr({ nif: "B12345678", numSerie: "FA1", fecha: "15-03-2026", importe: "100.00" });
    expect(url).toBe(
      "https://www2.agenciatributaria.gob.es/wlpl/TIKE-CONT/ValidarQR?nif=B12345678&numserie=FA1&fecha=15-03-2026&importe=100.00",
    );
  });

  it("usa el host de PRUEBAS cuando entorno = 'pruebas'", () => {
    const url = construirUrlCotejoQr(
      { nif: "B12345678", numSerie: "FA1", fecha: "15-03-2026", importe: "100.00" },
      "pruebas",
    );
    expect(url.startsWith("https://prewww2.aeat.es/wlpl/TIKE-CONT/ValidarQR?")).toBe(true);
  });

  it("recorta espacios al inicio/fin de los valores", () => {
    const url = construirUrlCotejoQr({ nif: " B12345678 ", numSerie: " FA1 ", fecha: " 15-03-2026 ", importe: " 100.00 " });
    expect(url).toContain("nif=B12345678&numserie=FA1&fecha=15-03-2026&importe=100.00");
  });
});
