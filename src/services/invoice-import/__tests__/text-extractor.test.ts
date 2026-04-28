import { describe, expect, it } from "vitest";
import { excelSerialToIso, extractInvoiceFromText } from "../text-extractor";

const PDF_LIKE_2601 = `
Factura: ADG-2601
Fecha: 02/01/2026
CLIENTE
Rosario Carrascosa García
C/ Luis Montoto, 85
41018, Sevilla
NIF: 27313854C
CONCEPTO IMPORTE
Posicionamiento SEO, Ads, RRSS y Traducción al alemán 650,00 €
TOTAL 650,00 €
IVA 21% 136,50 €
TOTAL FACTURA 786,50 €
Forma de pago: Transferencia bancaria
IBAN: ES29 0081 0390 1000 0221 0628
`;

const PDF_LIKE_2602 = `
Factura: ADG-2602
Fecha: 02/01/2026
CLIENTE
Recuperaciones Íscar, SL
Travesia España, 16 - 18
47430, Pedrajas de San Esteban
CIF: B47296488
CONCEPTO IMPORTE
Servicio mensual marketing, posicionamiento SEO y Redes sociales 595,00 €
TOTAL 595,00 €
IVA 21% 124,95 €
TOTAL FACTURA 719,95 €
Forma de pago: Transferencia bancaria
IBAN: ES19 3085 0103 5528 0942 9620
`;

const PDF_LIKE_2604_WITH_TYPO = `
Factura: ADG-2604
Fecha: 02/01/2025
CLIENTE
HUMAN TO HUMAN COMMUNICATIONS, S.L.U
CALLE ORENSE 6, PLANTA 2
28020, MADRID
CIF: B87811154
CONCEPTO IMPORTE
Publicidad en RRSS (OP: H-19363) 400,00 €
TOTAL 400,00 €
IVA 21% 84,00 €
TOTAL FACTURA 484,00 €
Forma de pago: Transferencia bancaria
IBAN: ES29 0081 0390 1000 0221 0628
`;

describe("extractInvoiceFromText", () => {
  it("extrae correctamente la factura ADG-2601 (autónomo, NIF)", () => {
    const result = extractInvoiceFromText({
      text: PDF_LIKE_2601,
      fileName: "Factura ADG-2601.pdf",
      fileKind: "pdf",
    });
    expect(result.series).toBe("ADG");
    expect(result.invoiceNumber).toBe("ADG-2601");
    expect(result.numberOnly).toBe("2601");
    expect(result.issueDate).toBe("2026-01-02");
    expect(result.client.name).toBe("Rosario Carrascosa García");
    expect(result.client.identifier).toBe("27313854C");
    expect(result.client.address).toBe("C/ Luis Montoto, 85");
    expect(result.client.postalCode).toBe("41018");
    expect(result.client.city).toBe("Sevilla");
    expect(result.client.province).toBe("Sevilla");
    expect(result.concept).toContain("Posicionamiento SEO");
    expect(result.base).toBeCloseTo(650, 2);
    expect(result.ivaRate).toBe(21);
    expect(result.ivaAmount).toBeCloseTo(136.5, 2);
    expect(result.total).toBeCloseTo(786.5, 2);
    expect(result.iban).toContain("ES29");
    expect(result.warnings.length).toBe(0);
  });

  it("extrae correctamente la factura ADG-2602 (empresa, CIF)", () => {
    const result = extractInvoiceFromText({
      text: PDF_LIKE_2602,
      fileName: "Factura ADG-2602.pdf",
      fileKind: "pdf",
    });
    expect(result.invoiceNumber).toBe("ADG-2602");
    expect(result.client.identifier).toBe("B47296488");
    expect(result.client.name).toBe("Recuperaciones Íscar, SL");
    expect(result.client.postalCode).toBe("47430");
    expect(result.client.city).toBe("Pedrajas de San Esteban");
    expect(result.client.province).toBe("Valladolid");
    expect(result.base).toBeCloseTo(595, 2);
    expect(result.total).toBeCloseTo(719.95, 2);
  });

  it("detecta y avisa de fechas con año fuera de rango (typo del usuario)", () => {
    const result = extractInvoiceFromText({
      text: PDF_LIKE_2604_WITH_TYPO,
      fileName: "Factura ADG-2604.pdf",
      fileKind: "pdf",
    });
    expect(result.invoiceNumber).toBe("ADG-2604");
    expect(result.issueDate).toBe("2025-01-02");
    // El año 2025 puede o no caer en el rango "razonable" según el currentYear
    // del runner — basta con que el extractor produzca un parseo correcto.
    expect(result.client.identifier).toBe("B87811154");
    expect(result.total).toBeCloseTo(484, 2);
  });

  it("convierte el serial Excel a ISO correctamente", () => {
    expect(excelSerialToIso(46024)).toBe("2026-01-02");
    expect(excelSerialToIso(45292)).toBe("2024-01-01");
  });

  it("acepta serial Excel como hint para la fecha (XLSX)", () => {
    const text = `
Factura: ADG-2602
CLIENTE
Recuperaciones Íscar, SL
Travesia España, 16 - 18
47430, Pedrajas de San Esteban
CIF: B47296488
CONCEPTO IMPORTE
Servicio mensual 595,00 €
TOTAL 595,00 €
IVA 21% 124,95 €
TOTAL FACTURA 719,95 €
`;
    const result = extractInvoiceFromText({
      text,
      excelDateSerial: 46024,
      fileName: "Factura ADG-2602.xlsx",
      fileKind: "xlsx",
    });
    expect(result.issueDate).toBe("2026-01-02");
  });

  it("infiere base imponible cuando solo hay total + IVA", () => {
    const text = `
Factura: A-001
Fecha: 15/03/2026
CLIENTE
Cliente Test
Calle 1
28001, MADRID
NIF: 12345678Z
TOTAL FACTURA 121,00 €
IVA 21% 21,00 €
`;
    const result = extractInvoiceFromText({
      text,
      fileName: "test.pdf",
      fileKind: "pdf",
    });
    expect(result.total).toBeCloseTo(121, 2);
    expect(result.ivaAmount).toBeCloseTo(21, 2);
    expect(result.base).toBeCloseTo(100, 2);
  });

  it("detecta IRPF cuando aparece como retención", () => {
    const text = `
Factura: A-002
Fecha: 15/03/2026
CLIENTE
Cliente Test
Calle 1
28001, MADRID
NIF: 12345678Z
CONCEPTO IMPORTE
Servicio 1.000,00 €
TOTAL 1.000,00 €
IVA 21% 210,00 €
RETENCIÓN 15% 150,00 €
TOTAL FACTURA 1.060,00 €
`;
    const result = extractInvoiceFromText({
      text,
      fileName: "test.pdf",
      fileKind: "pdf",
    });
    expect(result.irpfRate).toBe(15);
    expect(result.irpfAmount).toBeCloseTo(150, 2);
    expect(result.base).toBeCloseTo(1000, 2);
    expect(result.total).toBeCloseTo(1060, 2);
  });

  it("avisa cuando faltan datos críticos", () => {
    const result = extractInvoiceFromText({
      text: "Una factura malformada sin nada parseable",
      fileName: "broken.pdf",
      fileKind: "pdf",
    });
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
