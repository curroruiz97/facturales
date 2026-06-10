/**
 * Puente entre el editor de documentos y el generador Facturae 3.2.2 del dominio.
 *
 * Mapea el estado del editor (DocumentEditorState) + los totales calculados a la entrada
 * tipada `FacturaeInput`, construye el XML estructurado y ofrece una descarga en el navegador.
 *
 * La firma `.xsig` (XAdES) NO se aplica aquí — requiere certificado. Se descarga el XML sin firmar.
 */
import type { DocumentEditorState, DocumentParty } from "../core/document-types";
import {
  construirFacturaeXml,
  type FacturaeInput,
  type FacturaeLine,
  type FacturaeParty,
  type FacturaeTax,
} from "../../../domain/rules/fiscal/facturae";

/** Totales necesarios para la cabecera fiscal del Facturae. */
export interface FacturaeTotalsInput {
  taxBase: number;
  retentionRate: number;
  retentionAmount: number;
  total: number;
}

/** Códigos L1 de Facturae: 01=IVA, 02=IPSI, 03=IGIC, 04=IRPF. */
const KIND_TO_FACTURAE: Record<string, string> = { IVA: "01", IPSI: "02", IGIC: "03", IRPF: "04" };

/** Leyenda de exención (RD 1619/2012 art. 6.1.j admite "indicación de que la operación está exenta"). */
export const EXEMPTION_LEGEND = "Operación exenta de IVA (Ley 37/1992 del IVA).";

function parseTaxCode(taxCode: string): { kind: string; rate: number } {
  if (!taxCode || taxCode === "EXENTO") return { kind: "IVA", rate: 0 };
  const [kind, rawRate] = taxCode.split("_");
  const rate = Number.parseFloat(rawRate ?? "0");
  return { kind: kind || "IVA", rate: Number.isFinite(rate) ? rate : 0 };
}

/** Lee un campo opcional (town/province) que el editor aún no captura, sin romper el tipado. */
function optionalField(p: DocumentParty, key: string): string {
  const rec = p as unknown as Record<string, unknown>;
  const value = rec[key];
  return typeof value === "string" ? value : "";
}

function partyFrom(p: DocumentParty): FacturaeParty {
  return {
    taxId: p.nif || "",
    name: p.name || "",
    address: p.address || "",
    postCode: p.postalCode || "",
    town: optionalField(p, "town"),
    province: optionalField(p, "province"),
  };
}

export function buildFacturaeInput(
  editor: DocumentEditorState,
  totals: FacturaeTotalsInput,
  documentNumber: string,
): FacturaeInput {
  const lines: FacturaeLine[] = [];
  const outputs = new Map<string, FacturaeTax>();

  for (const line of editor.lines) {
    const { kind, rate } = parseTaxCode(line.taxCode);
    const sub = line.quantity * line.unitPrice;
    const base = sub - sub * (line.discount / 100);
    // El IRPF a nivel de línea es una retención (no se repercute): lo modelamos como 0% de salida.
    const isWithholding = kind === "IRPF";
    const outputRate = isWithholding ? 0 : rate;
    const code = isWithholding ? "01" : (KIND_TO_FACTURAE[kind] ?? "01");
    lines.push({
      description: line.description || "Producto/Servicio",
      quantity: line.quantity,
      unitPriceWithoutTax: line.unitPrice,
      grossAmount: base,
      taxTypeCode: code,
      taxRate: outputRate,
    });
    if (!isWithholding) {
      const key = `${code}|${outputRate}`;
      const cuota = base * (outputRate / 100);
      const prev = outputs.get(key);
      if (prev) {
        prev.base += base;
        prev.amount += cuota;
      } else {
        outputs.set(key, { taxTypeCode: code, rate: outputRate, base, amount: cuota });
      }
    }
  }

  // Gastos suplidos: líneas exentas (no devengan IVA).
  for (const expense of editor.expenses) {
    lines.push({
      description: `Gastos suplidos: ${expense.description || "Gasto suplido"}`,
      quantity: 1,
      unitPriceWithoutTax: expense.amount,
      grossAmount: expense.amount,
      taxTypeCode: "01",
      taxRate: 0,
    });
  }

  const taxesOutputs = [...outputs.values()];
  const totalTaxOutputs = taxesOutputs.reduce((sum, t) => sum + t.amount, 0);
  const totalGrossAmount = lines.reduce((sum, l) => sum + l.grossAmount, 0);

  const taxesWithheld: FacturaeTax[] = [];
  if (totals.retentionAmount > 0) {
    taxesWithheld.push({
      taxTypeCode: "04",
      rate: totals.retentionRate,
      base: totals.taxBase,
      amount: totals.retentionAmount,
    });
  }

  const hasExempt = editor.lines.some((l) => (l.taxCode || "").toUpperCase() === "EXENTO");

  return {
    seller: partyFrom(editor.issuer),
    buyer: partyFrom(editor.client),
    invoiceNumber: documentNumber,
    seriesCode: editor.meta.series || undefined,
    issueDate: editor.meta.issueDate || "",
    currency: editor.meta.currency || "EUR",
    lines,
    taxesOutputs,
    taxesWithheld,
    totalGrossAmount,
    totalTaxOutputs,
    totalTaxesWithheld: totals.retentionAmount > 0 ? totals.retentionAmount : 0,
    invoiceTotal: totals.total,
    legalLiterals: hasExempt ? [EXEMPTION_LEGEND] : undefined,
  };
}

export function buildFacturaeXml(
  editor: DocumentEditorState,
  totals: FacturaeTotalsInput,
  documentNumber: string,
): string {
  return construirFacturaeXml(buildFacturaeInput(editor, totals, documentNumber));
}

/** Descarga el XML Facturae como fichero en el navegador. */
export function downloadFacturaeXml(
  editor: DocumentEditorState,
  totals: FacturaeTotalsInput,
  documentNumber: string,
  filename: string,
): void {
  const xml = buildFacturaeXml(editor, totals, documentNumber);
  const blob = new Blob([xml], { type: "application/xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
