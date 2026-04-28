import type { ParsedClient, ParsedInvoice } from "./types";

/**
 * Convierte una cadena con formato español de número (ej. "1.234,56") a Number.
 * También acepta "1234.56" (formato anglo) para robustez.
 */
function parseSpanishNumber(raw: string): number {
  if (!raw) return 0;
  let s = raw.trim().replace(/\s|€|EUR/gi, "");
  // Si tiene tanto ',' como '.', el último símbolo es el decimal
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma !== -1 && lastDot !== -1) {
    if (lastComma > lastDot) {
      // Formato español: 1.234,56
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      // Formato anglo: 1,234.56
      s = s.replace(/,/g, "");
    }
  } else if (lastComma !== -1) {
    // Solo comas → decimales españoles
    s = s.replace(",", ".");
  }
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Convierte fecha "DD/MM/YYYY" o "DD-MM-YYYY" a ISO "YYYY-MM-DD".
 * Devuelve null si no se puede interpretar.
 */
function toIsoDate(raw: string): string | null {
  if (!raw) return null;
  const m = raw.trim().match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (!m) return null;
  const day = m[1].padStart(2, "0");
  const month = m[2].padStart(2, "0");
  let year = m[3];
  if (year.length === 2) year = `20${year}`;
  return `${year}-${month}-${day}`;
}

/**
 * Convierte un serial de Excel (días desde 1900-01-00) a ISO "YYYY-MM-DD".
 * Excel usa el bug de Lotus 1-2-3 (considera 1900 como bisiesto), por lo que
 * el día 60 corresponde a 1900-02-29 (que no existe). Para fechas posteriores
 * a 1900-03-01 (serial >= 61), basta con `serial - 25569` días desde 1970-01-01.
 */
export function excelSerialToIso(serial: number): string | null {
  if (!Number.isFinite(serial) || serial <= 0) return null;
  const millis = (serial - 25569) * 86400 * 1000;
  const d = new Date(millis);
  if (Number.isNaN(d.getTime())) return null;
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const PROVINCE_BY_CP_PREFIX: Record<string, string> = {
  "01": "Álava",
  "02": "Albacete",
  "03": "Alicante",
  "04": "Almería",
  "05": "Ávila",
  "06": "Badajoz",
  "07": "Baleares",
  "08": "Barcelona",
  "09": "Burgos",
  "10": "Cáceres",
  "11": "Cádiz",
  "12": "Castellón",
  "13": "Ciudad Real",
  "14": "Córdoba",
  "15": "A Coruña",
  "16": "Cuenca",
  "17": "Girona",
  "18": "Granada",
  "19": "Guadalajara",
  "20": "Guipúzcoa",
  "21": "Huelva",
  "22": "Huesca",
  "23": "Jaén",
  "24": "León",
  "25": "Lleida",
  "26": "La Rioja",
  "27": "Lugo",
  "28": "Madrid",
  "29": "Málaga",
  "30": "Murcia",
  "31": "Navarra",
  "32": "Ourense",
  "33": "Asturias",
  "34": "Palencia",
  "35": "Las Palmas",
  "36": "Pontevedra",
  "37": "Salamanca",
  "38": "Santa Cruz de Tenerife",
  "39": "Cantabria",
  "40": "Segovia",
  "41": "Sevilla",
  "42": "Soria",
  "43": "Tarragona",
  "44": "Teruel",
  "45": "Toledo",
  "46": "Valencia",
  "47": "Valladolid",
  "48": "Vizcaya",
  "49": "Zamora",
  "50": "Zaragoza",
  "51": "Ceuta",
  "52": "Melilla",
};

function inferProvinceByCp(cp: string): string | null {
  const prefix = cp.slice(0, 2);
  return PROVINCE_BY_CP_PREFIX[prefix] ?? null;
}

interface ExtractInput {
  /** Texto completo de la factura, con saltos de línea. */
  text: string;
  /** Hint: si viene de XLSX, la fecha puede ser un serial. Pasa el valor crudo de la celda B2 si está disponible. */
  excelDateSerial?: number | null;
  fileName: string;
  fileKind: "pdf" | "xlsx";
}

export function extractInvoiceFromText(input: ExtractInput): ParsedInvoice {
  const { text, excelDateSerial, fileName, fileKind } = input;
  const warnings: string[] = [];

  // ─── Series + número ───
  // Busca "Factura: SERIE-NUMERO". Tolera espacios y separadores varios.
  const facturaMatch = text.match(/Factura\s*[:#]?\s*([A-Z][A-Z0-9]{0,9})[\s-]+([A-Z0-9-]+)/i);
  let series = "";
  let invoiceNumber = "";
  let numberOnly = "";
  if (facturaMatch) {
    series = facturaMatch[1].toUpperCase();
    const rawNumber = facturaMatch[2].trim();
    invoiceNumber = `${series}-${rawNumber}`;
    numberOnly = rawNumber;
  } else {
    warnings.push("No se pudo detectar la serie ni el número de la factura.");
  }

  // ─── Fecha ───
  let issueDate = "";
  if (excelDateSerial !== null && excelDateSerial !== undefined) {
    const iso = excelSerialToIso(excelDateSerial);
    if (iso) issueDate = iso;
  }
  if (!issueDate) {
    const fechaMatch = text.match(/Fecha\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i);
    if (fechaMatch) {
      const iso = toIsoDate(fechaMatch[1]);
      if (iso) issueDate = iso;
    }
  }
  if (!issueDate) {
    warnings.push("No se pudo detectar la fecha de emisión.");
  } else {
    // Validación de coherencia: avisar si la fecha está claramente fuera de rango razonable
    const year = Number.parseInt(issueDate.slice(0, 4), 10);
    const currentYear = new Date().getFullYear();
    if (year < currentYear - 5 || year > currentYear + 1) {
      warnings.push(`Fecha posiblemente errónea: ${issueDate} (revisa el año).`);
    }
  }

  // ─── Bloque cliente ───
  // Estrategia: buscar la palabra "CLIENTE" como cabecera y leer las siguientes
  // 4-5 líneas no vacías. La última suele ser "NIF: XXX" o "CIF: XXX".
  const client = extractClientBlock(text);
  if (!client.name) warnings.push("No se pudo detectar el nombre del cliente.");
  if (!client.identifier) warnings.push("No se pudo detectar el NIF/CIF del cliente.");

  // ─── Concepto ───
  // Concepto: línea no vacía entre "CONCEPTO" y "TOTAL" (la primera).
  let concept = "";
  const conceptoIdx = text.search(/\bCONCEPTO\b/i);
  if (conceptoIdx !== -1) {
    const after = text.slice(conceptoIdx);
    // Saltar la línea de cabecera "CONCEPTO ... IMPORTE"
    const lines = after.split(/\r?\n/).slice(1);
    const conceptLines: string[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (/^TOTAL\b/i.test(trimmed)) break;
      if (/^IVA\s+\d+%/i.test(trimmed)) break;
      // Quitar el importe del final de la línea (ej. "Concepto X 650,00 €")
      const cleaned = trimmed.replace(/[\d.,]+\s*€\s*$/g, "").trim();
      if (cleaned) conceptLines.push(cleaned);
    }
    concept = conceptLines.join(" ").trim();
  }
  if (!concept) {
    warnings.push("No se pudo detectar el concepto.");
    concept = `Importación factura ${invoiceNumber}`;
  }

  // ─── Importes ───
  // El layout típico es:
  //   TOTAL              1.950,00 €
  //   IVA 21%              409,50 €
  //   TOTAL FACTURA      2.359,50 €
  //
  // Pero pdfjs puede agrupar items por Y con tolerancia distinta y a veces el
  // importe queda en una línea separada del label. Hacemos las regex tolerantes
  // a saltos de línea (hasta 40 chars de gap incluyendo \n).

  // TOTAL FACTURA: busca el primer importe tras la palabra "TOTAL FACTURA"
  // (puede estar en la misma línea o en la siguiente).
  let total = 0;
  const totalFacturaMatch = text.match(/TOTAL\s+FACTURA[\s\S]{0,40}?([\d][\d.,]*)\s*€?/i);
  if (totalFacturaMatch) total = parseSpanishNumber(totalFacturaMatch[1]);

  // IVA: capturamos primero el porcentaje y el importe asociado en la misma área.
  let ivaRate = 0;
  let ivaAmount = 0;
  const ivaMatch = text.match(/IVA\s*[:#]?\s*(\d+(?:[.,]\d+)?)\s*%[\s\S]{0,40}?([\d][\d.,]*)?\s*€?/i);
  if (ivaMatch) {
    ivaRate = parseSpanishNumber(ivaMatch[1]);
    if (ivaMatch[2]) ivaAmount = parseSpanishNumber(ivaMatch[2]);
  }

  // BASE / SUBTOTAL: la línea "TOTAL X €" (sin la palabra "FACTURA").
  // Recorremos todas las apariciones de "TOTAL <importe>" y descartamos las que
  // formen parte de "TOTAL FACTURA".
  let base = 0;
  const totalLineRegex = /TOTAL[\s\S]{0,40}?([\d][\d.,]*)\s*€?/gi;
  let m: RegExpExecArray | null;
  while ((m = totalLineRegex.exec(text)) !== null) {
    // Saltamos "TOTAL FACTURA" — buscamos "FACTURA" en los 12 chars siguientes a "TOTAL".
    const after = text.slice(m.index, m.index + 16).toUpperCase();
    if (after.startsWith("TOTAL FACTURA") || after.startsWith("TOTAL  FACTURA") || after.startsWith("TOTAL\nFACTURA")) {
      continue;
    }
    base = parseSpanishNumber(m[1]);
    break; // primera ocurrencia válida
  }

  // Fallback: importe de la fila del concepto (entre "IMPORTE" y "TOTAL")
  if (base === 0) {
    const conceptAreaMatch = text.match(/IMPORTE([\s\S]*?)TOTAL/i);
    if (conceptAreaMatch) {
      const importes = Array.from(conceptAreaMatch[1].matchAll(/([\d][\d.,]*)\s*€/g)).map((mm) =>
        parseSpanishNumber(mm[1]),
      );
      if (importes.length > 0) base = importes[importes.length - 1];
    }
  }

  // ─── Fallbacks cruzados ───
  // Si tenemos total + ivaAmount pero no base
  if (base === 0 && total > 0 && ivaAmount > 0) {
    base = total - ivaAmount;
  }
  // Si tenemos total + ivaRate pero no base ni ivaAmount → despejar
  if (base === 0 && total > 0 && ivaRate > 0) {
    base = total / (1 + ivaRate / 100);
  }
  // Si tenemos base + ivaRate pero no ivaAmount → calcular
  if (ivaRate > 0 && ivaAmount === 0 && base > 0) {
    ivaAmount = (base * ivaRate) / 100;
  }
  // El cálculo del total se difiere a después de detectar IRPF (más abajo).

  if (base === 0) warnings.push("No se pudo detectar la base imponible.");

  // ─── IRPF (opcional) ───
  let irpfRate: number | null = null;
  let irpfAmount: number | null = null;
  const irpfMatch = text.match(/(?:RETENCI[ÓO]N|IRPF)\s*[:#]?\s*(\d+(?:[.,]\d+)?)\s*%[\s\S]{0,40}?([\d][\d.,]*)?\s*€?/i);
  if (irpfMatch) {
    irpfRate = parseSpanishNumber(irpfMatch[1]);
    if (irpfMatch[2]) {
      irpfAmount = parseSpanishNumber(irpfMatch[2]);
    } else if (base > 0 && irpfRate !== null) {
      irpfAmount = (base * irpfRate) / 100;
    }
  }

  // Si no tenemos total pero sí base e IVA (y opcionalmente IRPF), lo calculamos.
  if (total === 0 && base > 0) {
    total = base + ivaAmount - (irpfAmount ?? 0);
  }
  if (total === 0) warnings.push("No se pudo detectar el total de la factura.");

  // ─── IBAN ───
  const ibanMatch = text.match(/IBAN\s*[:#]?\s*([A-Z]{2}[\d\s]{20,30})/i);
  const iban = ibanMatch ? ibanMatch[1].replace(/\s+/g, " ").trim() : null;

  return {
    fileName,
    fileKind,
    series,
    invoiceNumber,
    numberOnly,
    issueDate,
    client,
    concept,
    base,
    ivaRate,
    ivaAmount,
    irpfRate,
    irpfAmount,
    total,
    iban,
    warnings,
    rawText: text,
  };
}

function extractClientBlock(text: string): ParsedClient {
  const empty: ParsedClient = {
    name: "",
    identifier: "",
    address: "",
    postalCode: "",
    city: "",
    province: null,
  };

  // Localizar "CLIENTE" como sección. Tomamos el bloque entre CLIENTE y CONCEPTO.
  const clienteIdx = text.search(/\bCLIENTE\b/i);
  const conceptoIdx = text.search(/\bCONCEPTO\b/i);
  if (clienteIdx === -1) return empty;

  const block =
    conceptoIdx !== -1 && conceptoIdx > clienteIdx
      ? text.slice(clienteIdx, conceptoIdx)
      : text.slice(clienteIdx);

  // Líneas no vacías DESPUÉS de la línea "CLIENTE"
  const lines = block.split(/\r?\n/).slice(1).map((l) => l.trim()).filter((l) => l && !/^CLIENTE$/i.test(l));

  // Detectar la línea con NIF/CIF
  const nifLineIdx = lines.findIndex((l) => /\b(NIF|CIF|VAT)\b\s*[:#]?\s*[A-Z0-9]{8,12}/i.test(l));
  let identifier = "";
  if (nifLineIdx !== -1) {
    const m = lines[nifLineIdx].match(/\b(?:NIF|CIF|VAT)\b\s*[:#]?\s*([A-Z0-9]{8,12})/i);
    if (m) identifier = m[1].toUpperCase().replace(/\s/g, "");
  }

  // El nombre suele ser la primera línea
  const name = lines[0] ?? "";

  // Buscar línea con código postal: "41018, Sevilla"
  const cpLineIdx = lines.findIndex((l, i) => i > 0 && /^\d{5}\b/.test(l));
  let postalCode = "";
  let city = "";
  if (cpLineIdx !== -1) {
    const m = lines[cpLineIdx].match(/^(\d{5})\s*[,\-]?\s*(.*)$/);
    if (m) {
      postalCode = m[1];
      city = m[2].trim();
    }
  }

  // La dirección suele ser todo lo que esté entre la línea 1 (nombre) y la línea CP
  const endAddressIdx = cpLineIdx !== -1 ? cpLineIdx : nifLineIdx !== -1 ? nifLineIdx : lines.length;
  const addressLines = lines.slice(1, endAddressIdx);
  const address = addressLines.join(" ").trim();

  const province = postalCode ? inferProvinceByCp(postalCode) : null;

  return {
    name,
    identifier,
    address,
    postalCode,
    city,
    province,
  };
}
