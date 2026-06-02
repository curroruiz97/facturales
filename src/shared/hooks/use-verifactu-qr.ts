import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { construirUrlCotejoQr } from "../../domain/rules/fiscal/verifactu-qr";
import { formatearFechaExpedicion, formatearImporte } from "../../domain/rules/fiscal/verifactu-registro";

/**
 * Calcula el QR de cotejo VERI*FACTU de una factura emitida y lo renderiza como
 * imagen PNG (data URL) para mostrarlo en la vista.
 *
 * La URL de cotejo se construye con la lógica de dominio ya verificada contra los
 * vectores oficiales de la AEAT (`construirUrlCotejoQr`). Nivel de corrección de
 * errores M (exigido por la especificación del QR de la AEAT).
 *
 * Devuelve null si faltan datos (p. ej. borradores sin número) o si la fecha no es válida.
 */
export interface VerifactuQrInput {
  /** NIF del emisor (obligado tributario). */
  issuerNif: string;
  /** Número + serie de la factura. */
  numSerie: string;
  /** Fecha de expedición en ISO (YYYY-MM-DD). */
  issueDateIso: string;
  /** Importe total de la factura. */
  total: number;
}

export interface VerifactuQr {
  /** URL de cotejo de la AEAT codificada en el QR. */
  cotejoUrl: string;
  /** Imagen PNG del QR como data URL (apta para <img> y para jsPDF). */
  qrDataUrl: string;
}

export function useVerifactuQr(input: VerifactuQrInput | null): VerifactuQr | null {
  const [qr, setQr] = useState<VerifactuQr | null>(null);

  const issuerNif = input?.issuerNif ?? "";
  const numSerie = input?.numSerie ?? "";
  const issueDateIso = input?.issueDateIso ?? "";
  const total = input?.total ?? 0;

  useEffect(() => {
    if (!issuerNif.trim() || !numSerie.trim()) {
      setQr(null);
      return;
    }

    let cotejoUrl: string;
    try {
      cotejoUrl = construirUrlCotejoQr({
        nif: issuerNif,
        numSerie,
        fecha: formatearFechaExpedicion(issueDateIso),
        importe: formatearImporte(total),
      });
    } catch {
      setQr(null);
      return;
    }

    let cancelled = false;
    QRCode.toDataURL(cotejoUrl, { errorCorrectionLevel: "M", margin: 1, width: 240 })
      .then((qrDataUrl) => {
        if (!cancelled) setQr({ cotejoUrl, qrDataUrl });
      })
      .catch(() => {
        if (!cancelled) setQr(null);
      });

    return () => {
      cancelled = true;
    };
  }, [issuerNif, numSerie, issueDateIso, total]);

  return qr;
}
