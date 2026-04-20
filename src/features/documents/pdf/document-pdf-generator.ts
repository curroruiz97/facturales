import { jsPDF } from "jspdf";
import type { DocumentEditorState } from "../core/document-types";

interface PdfTotals {
  subtotal: number;
  discount: number;
  taxBase: number;
  taxAmount: number;
  reAmount: number;
  retentionAmount: number;
  expenses: number;
  total: number;
  totalToPay: number;
}

interface GeneratePdfOptions {
  editor: DocumentEditorState;
  totals: PdfTotals;
  documentNumber: string;
  brandColor?: string;
  logoDataUrl?: string;
}

const SUPPORTED_CURRENCIES: ReadonlySet<string> = new Set([
  "EUR", "USD", "GBP", "CHF", "JPY", "CAD", "AUD", "SEK", "NOK", "DKK",
  "PLN", "CZK", "HUF", "RON", "BGN", "HRK", "ISK", "MXN", "BRL", "ARS",
  "CLP", "COP", "PEN", "UYU", "CNY", "INR", "KRW", "SGD", "HKD", "NZD",
]);

function fmtCurrency(amount: number, currency: string): string {
  const upper = (currency || "").toUpperCase().trim();
  const cur = SUPPORTED_CURRENCIES.has(upper) ? upper : "EUR";
  try {
    return new Intl.NumberFormat("es-ES", { style: "currency", currency: cur, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount || 0);
  } catch {
    return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount || 0);
  }
}

function hexToRgb(hex: string): [number, number, number] {
  const safe = /^#?[0-9a-fA-F]{6}$/.test(hex) ? hex : "#22C55E";
  const h = safe.replace("#", "");
  return [
    Number.parseInt(h.substring(0, 2), 16),
    Number.parseInt(h.substring(2, 4), 16),
    Number.parseInt(h.substring(4, 6), 16),
  ];
}

function paymentTermsLabel(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!normalized || normalized === "immediate") return "Pago inmediato";
  if (normalized === "15") return "15 días";
  if (normalized === "30") return "30 días";
  if (normalized === "60") return "60 días";
  if (normalized === "90") return "90 días";
  return value;
}

function taxLabelFromCode(taxCode: string): string {
  if (!taxCode || taxCode === "EXENTO") return "Exento";
  const [kind, rawRate] = taxCode.split("_");
  const rate = Number.parseFloat(rawRate ?? "0");
  if (!Number.isFinite(rate)) return taxCode;
  const formattedRate = Number.isInteger(rate) ? String(rate) : String(rate).replace(".", ",");
  if (kind === "IVA") return `IVA ${formattedRate}%`;
  if (kind === "IGIC") return `IGIC ${formattedRate}%`;
  if (kind === "IPSI") return `IPSI ${formattedRate}%`;
  if (kind === "IRPF") return `IRPF ${formattedRate}%`;
  return taxCode;
}

function getInitials(name: string): string {
  const cleaned = name.trim();
  if (!cleaned) return "SE";
  const parts = cleaned.split(/\s+/).slice(0, 2);
  return parts.map((part) => part.slice(0, 1).toUpperCase()).join("");
}

function drawLogoOrFallback(
  doc: jsPDF,
  logoDataUrl: string | undefined,
  issuerName: string,
  margin: number,
  currentY: number,
  brandColor: [number, number, number],
): void {
  if (logoDataUrl) {
    try {
      const format = logoDataUrl.includes("image/jpeg") || logoDataUrl.includes("image/jpg") ? "JPEG" : "PNG";
      doc.addImage(logoDataUrl, format, margin, currentY + 2, 45, 20);
      return;
    } catch {
      // Fallback below.
    }
  }

  doc.setFillColor(brandColor[0], brandColor[1], brandColor[2]);
  doc.roundedRect(margin, currentY, 28, 28, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(getInitials(issuerName), margin + 14, currentY + 18, { align: "center" });
}

export function generateDocumentPdf(options: GeneratePdfOptions): jsPDF {
  const { editor, totals, documentNumber, brandColor = "#22C55E", logoDataUrl } = options;
  const cur = editor.meta.currency || "EUR";
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 20;
  const footerHeight = 15;
  const maxY = pageHeight - margin - footerHeight;
  let y = 20;

  const [br, bg, bb] = hexToRgb(brandColor);

  const safeDocNumber = documentNumber || (editor.kind === "invoice" ? "Factura" : "Presupuesto");
  const allRows: Array<{ description: string; quantity: number; unitPrice: number; discount: number; taxCode: string; total: number }> = [
    ...editor.lines.map((line) => {
      const subtotal = line.quantity * line.unitPrice;
      const discountAmount = subtotal * (line.discount / 100);
      const base = subtotal - discountAmount;
      const [, rawTaxRate] = line.taxCode.split("_");
      const rate = Number.parseFloat(rawTaxRate ?? "0");
      const taxAmount = base * ((Number.isFinite(rate) ? rate : 0) / 100);
      return {
        description: line.description || "Producto/Servicio",
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        discount: line.discount,
        taxCode: line.taxCode,
        total: base + taxAmount,
      };
    }),
    ...editor.expenses.map((expense) => ({
      description: `Gastos suplidos: ${expense.description || "Gasto suplido"}`,
      quantity: 1,
      unitPrice: expense.amount,
      discount: 0,
      taxCode: "EXENTO",
      total: expense.amount,
    })),
  ];

  const drawFooter = (pageNumber: number): void => {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(107, 114, 128);
    doc.text(safeDocNumber, margin, pageHeight - 10);
    doc.text(`${pageNumber} / __TOTAL__`, pageWidth - margin, pageHeight - 10, { align: "right" });
  };

  const drawContinuationHeader = (): void => {
    doc.setFillColor(br, bg, bb);
    doc.rect(margin, y, pageWidth - margin * 2, 0.5, "F");
    y += 4;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150, 150, 150);
    doc.text(`${safeDocNumber} (cont.)`, margin, y);
    y += 8;
  };

  const addNewPage = (pageNumber: number): number => {
    drawFooter(pageNumber);
    doc.addPage();
    y = margin;
    drawContinuationHeader();
    return pageNumber + 1;
  };

  let pageNumber = 1;
  drawLogoOrFallback(doc, logoDataUrl, editor.issuer.name, margin, y, [br, bg, bb]);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(editor.issuer.name || "Sin nombre", pageWidth - margin, y, { align: "right" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  let issuerY = y + 7;
  const issuerLines = [
    editor.issuer.nif,
    [editor.issuer.address, editor.issuer.postalCode].filter(Boolean).join(", "),
    editor.issuer.email,
  ].filter(Boolean);
  for (const line of issuerLines) {
    doc.text(line, pageWidth - margin, issuerY, { align: "right" });
    issuerY += 5;
  }
  y += 38;

  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("CLIENTE", margin, y);
  doc.text(editor.kind === "invoice" ? "FACTURA" : "PRESUPUESTO", 120, y);

  doc.setFontSize(10);
  doc.text(editor.client.name || "Sin nombre", margin, y + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  let clientY = y + 12;
  const clientLines = [
    editor.client.nif ? `NIF: ${editor.client.nif}` : "",
    editor.client.email,
    [editor.client.address, editor.client.postalCode].filter(Boolean).join(", "),
  ].filter(Boolean);
  for (const line of clientLines) {
    doc.text(line, margin, clientY);
    clientY += 4.5;
  }

  const invoiceInfo = [
    { label: "Serie", value: editor.meta.series || "-" },
    { label: editor.kind === "invoice" ? "Nº factura" : "Nº presupuesto", value: documentNumber || "—" },
    { label: "Referencia", value: editor.meta.reference || "—" },
    { label: "Fecha", value: editor.meta.issueDate || "—" },
    { label: "Vencimiento", value: editor.meta.dueDate || "—" },
    { label: "Condiciones", value: paymentTermsLabel(editor.meta.paymentTerms || "") || "—" },
  ];
  let infoY = y + 6;
  for (const info of invoiceInfo) {
    doc.setFont("helvetica", "normal");
    doc.text(info.label, 120, infoY);
    doc.setFont("helvetica", "bold");
    doc.text(info.value, pageWidth - margin, infoY, { align: "right" });
    infoY += 4.5;
  }

  y = Math.max(clientY, infoY) + 5;

  const drawTableHeader = (): void => {
    doc.setFillColor(br, bg, bb);
    doc.rect(margin, y, pageWidth - margin * 2, 7, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("Concepto", margin + 2, y + 5);
    doc.text("Cant.", 82, y + 5, { align: "center" });
    doc.text("Precio", 108, y + 5, { align: "right" });
    doc.text("Imp.", 125, y + 5, { align: "center" });
    doc.text("Dto.", 145, y + 5, { align: "center" });
    doc.text("Total", pageWidth - margin - 2, y + 5, { align: "right" });
    doc.setTextColor(0, 0, 0);
    y += 7;
  };

  drawTableHeader();
  for (let i = 0; i < allRows.length; i += 1) {
    const row = allRows[i];
    const descLines = doc.splitTextToSize(row.description, 55);
    const rowHeight = Math.max(8, descLines.length * 4 + 2);
    if (y + rowHeight > maxY) {
      pageNumber = addNewPage(pageNumber);
      drawTableHeader();
    }
    if (i % 2 === 0) {
      doc.setFillColor(248, 249, 250);
      doc.rect(margin, y, pageWidth - margin * 2, rowHeight, "F");
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const rowY = y + 5.5;
    doc.text(descLines, margin + 2, y + 4);
    doc.text(String(row.quantity), 82, rowY, { align: "center" });
    doc.text(fmtCurrency(row.unitPrice, cur), 108, rowY, { align: "right" });
    doc.text(taxLabelFromCode(row.taxCode), 125, rowY, { align: "center" });
    doc.text(`${row.discount || 0}%`, 145, rowY, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.text(fmtCurrency(row.total, cur), pageWidth - margin - 2, rowY, { align: "right" });
    y += rowHeight;
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.15);
    doc.line(margin, y, pageWidth - margin, y);
  }
  y += 5;

  if (y + 70 > maxY) {
    pageNumber = addNewPage(pageNumber);
  }

  const summaryX = 130;
  const valueX = pageWidth - margin - 2;
  const taxesTotal = totals.taxAmount + totals.reAmount;

  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 7;

  const summaryRows: Array<{ label: string; value: number; red?: boolean }> = [];
  if (totals.discount > 0) {
    summaryRows.push({ label: "Subtotal", value: totals.subtotal });
    summaryRows.push({ label: "Descuento", value: -totals.discount, red: true });
  } else {
    summaryRows.push({ label: "Subtotal", value: totals.subtotal });
  }
  summaryRows.push({ label: "Base imponible", value: totals.taxBase });
  if (taxesTotal > 0) summaryRows.push({ label: "Impuestos", value: taxesTotal });
  if (totals.retentionAmount > 0) summaryRows.push({ label: `Retención IRPF (${editor.taxSettings.retentionRate}%)`, value: -totals.retentionAmount, red: true });
  if (totals.expenses > 0) summaryRows.push({ label: "Gastos suplidos", value: totals.expenses });

  doc.setFontSize(8);
  for (const row of summaryRows) {
    doc.setFont("helvetica", "normal");
    if (row.red) {
      doc.setTextColor(220, 38, 38);
    } else {
      doc.setTextColor(100, 100, 100);
    }
    doc.text(row.label, summaryX, y);
    doc.setTextColor(row.red ? 220 : 0, row.red ? 38 : 0, row.red ? 38 : 0);
    doc.text(fmtCurrency(row.value, cur), valueX, y, { align: "right" });
    y += 5.5;
  }

  doc.setDrawColor(229, 231, 235);
  doc.line(summaryX, y, valueX, y);
  y += 6;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("Total", summaryX, y);
  doc.text(fmtCurrency(totals.total, cur), valueX, y, { align: "right" });
  y += 7;

  if (totals.total !== totals.totalToPay) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(220, 38, 38);
    doc.text("Cantidad ya pagada", summaryX, y);
    doc.text(`-${fmtCurrency(totals.total - totals.totalToPay, cur)}`, valueX, y, { align: "right" });
    y += 6;
    doc.setDrawColor(229, 231, 235);
    doc.line(summaryX, y, valueX, y);
    y += 6;
  }

  doc.setFillColor(br, bg, bb);
  doc.roundedRect(summaryX - 2, y - 5, valueX - summaryX + 4, 9, 1, 1, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("Total a pagar", summaryX, y);
  doc.text(fmtCurrency(totals.totalToPay, cur), valueX, y, { align: "right" });
  doc.setTextColor(0, 0, 0);
  y += 12;

  if (editor.paymentMethods.length > 0) {
    if (y + 20 > maxY) {
      pageNumber = addNewPage(pageNumber);
    }
    const methodLabels: Record<string, string> = {
      transferencia: "Transferencia bancaria",
      domiciliacion: "Domiciliación",
      efectivo: "Efectivo",
      contrareembolso: "Contrareembolso",
      bizum: "Bizum",
      otro: "Otro",
    };
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Métodos de pago", margin, y);
    y += 6;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    for (const method of editor.paymentMethods) {
      if (y + 6 > maxY) {
        pageNumber = addNewPage(pageNumber);
      }
      const detail = method.iban || method.phone || "";
      const label = methodLabels[method.type] || method.type;
      doc.text(`${label}${detail ? `: ${detail}` : ""}`, margin, y);
      y += 5;
    }
    y += 4;
  }

  if (editor.observations.trim()) {
    if (y + 18 > maxY) {
      pageNumber = addNewPage(pageNumber);
    }
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("OBSERVACIONES", margin, y);
    y += 6;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(editor.observations.trim(), pageWidth - margin * 2);
    for (const line of lines) {
      if (y + 5 > maxY) {
        pageNumber = addNewPage(pageNumber);
      }
      doc.text(line, margin, y);
      y += 4.5;
    }
  }

  drawFooter(pageNumber);
  const totalPages = pageNumber;
  for (let p = 1; p <= totalPages; p += 1) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(255, 255, 255);
    doc.text(`${p} / __TOTAL__`, pageWidth - margin, pageHeight - 10, { align: "right" });
    doc.setTextColor(107, 114, 128);
    doc.text(`${p} / ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: "right" });
  }

  return doc;
}

export function getPdfBlob(options: GeneratePdfOptions): Blob {
  const doc = generateDocumentPdf(options);
  return doc.output("blob");
}

export function getPdfDataUrl(options: GeneratePdfOptions): string {
  const doc = generateDocumentPdf(options);
  return doc.output("datauristring");
}

export function getPdfBase64(options: GeneratePdfOptions): string {
  const doc = generateDocumentPdf(options);
  return doc.output("datauristring").split(",")[1];
}

export function downloadPdf(options: GeneratePdfOptions, filename: string): void {
  const doc = generateDocumentPdf(options);
  doc.save(filename);
}
