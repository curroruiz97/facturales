import type { ParsedInvoice } from "./types";
import { extractInvoiceFromText } from "./text-extractor";

/**
 * Convierte un PDF en texto plano y luego extrae los campos de la factura.
 * Usa pdfjs-dist en modo "legacy" para compatibilidad con Vite/navegador.
 *
 * IMPORTANTE: El worker se carga de forma diferida — no encarece el bundle
 * inicial salvo cuando se abre el módulo de import.
 */
export async function parseInvoicePdf(file: File): Promise<ParsedInvoice> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  // pdfjs-dist >= 4 requiere registrar el worker explícitamente. Usamos el bundle
  // mjs servido por Vite a través de import.meta.url para evitar problemas de CORS.
  const opts = (pdfjs as { GlobalWorkerOptions: { workerSrc: string } }).GlobalWorkerOptions;
  if (!opts.workerSrc) {
    const workerUrl = (await import("pdfjs-dist/legacy/build/pdf.worker.mjs?url")).default;
    opts.workerSrc = workerUrl;
  }

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdf = await loadingTask.promise;

  const linesByPage: string[] = [];
  for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
    const page = await pdf.getPage(pageNo);
    const content = await page.getTextContent();
    // Cada item tiene { str, transform: [a, b, c, d, e, f] } donde `f` es la coordenada Y.
    // Reconstruimos las líneas agrupando por coordenada Y (con tolerancia).
    type Item = { str: string; x: number; y: number };
    type RawTextItem = { str: unknown; transform?: unknown };
    const items: Item[] = (content.items as RawTextItem[])
      .filter((it): it is { str: string; transform: number[] } => {
        return typeof it.str === "string" && Array.isArray(it.transform);
      })
      .map((it) => ({
        str: it.str,
        x: it.transform[4],
        y: it.transform[5],
      }));

    // Agrupar por Y (con tolerancia ±2px) y ordenar por X dentro de cada línea.
    type LineGroup = { y: number; parts: Item[] };
    const groups: LineGroup[] = [];
    for (const item of items) {
      let target = groups.find((g) => Math.abs(g.y - item.y) <= 2);
      if (!target) {
        target = { y: item.y, parts: [] };
        groups.push(target);
      }
      target.parts.push(item);
    }
    // Y crece de abajo arriba en PDF, así que ordenamos descendente para
    // obtener el orden de lectura natural (top-down).
    groups.sort((a, b) => b.y - a.y);
    const pageLines = groups.map((g) =>
      g.parts.sort((a, b) => a.x - b.x).map((p) => p.str).join(" ").replace(/\s+/g, " ").trim(),
    );
    linesByPage.push(pageLines.filter((l) => l.length > 0).join("\n"));
  }

  const text = linesByPage.join("\n");
  return extractInvoiceFromText({
    text,
    fileName: file.name,
    fileKind: "pdf",
  });
}
