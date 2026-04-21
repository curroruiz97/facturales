import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import type { UseDocumentEditorResult } from "../hooks/use-document-editor";
import { getPdfBase64, downloadPdf } from "../pdf/document-pdf-generator";
import { getSupabaseClient } from "../../../services/supabase/client";

interface DocumentActionBarProps {
  kindLabel: string;
  documentKind: "invoice" | "quote";
  activeDocumentId: string | null;
  saving: boolean;
  readOnly: boolean;
  editorController: UseDocumentEditorResult;
  /** Returns the saved document ID on success, or null on failure. */
  onSaveDraft: () => Promise<string | null>;
  /** Returns true on success. Falsy return shows generic error, or caller can set workspace.error for detail. */
  onEmit: () => Promise<boolean>;
  /** Last emission error message to surface in toast when emit fails. */
  emitErrorMessage?: string | null;
  flash: string | null;
  setFlash: (msg: string | null) => void;
  mode?: "editor" | "preview";
  previewPath?: string;
  previewQueryParam?: "draft" | "highlight" | "invoice";
  backPath?: string;
  backLabel?: string;
  allowSendOnReadOnly?: boolean;
  pdfBrandColor?: string;
  pdfLogoUrl?: string | null;
}

type EmitStep = "confirm" | "send-form" | "schedule-form" | "done";
const EMAIL_RE = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
const MAX_RECIPIENTS = 10;

/** Extrae el mensaje real del servidor cuando functions.invoke devuelve non-2xx */
async function extractFunctionErrorMessage(error: unknown): Promise<string> {
  const fallback = error instanceof Error ? error.message : "Error desconocido";
  const ctx = (error as { context?: { body?: string | Blob } })?.context;
  if (!ctx?.body) return fallback;
  try {
    const raw = typeof ctx.body === "string" ? ctx.body : await ctx.body.text();
    const parsed = JSON.parse(raw);
    if (parsed?.error) return String(parsed.error);
    if (parsed?.message) return String(parsed.message);
    return raw || fallback;
  } catch {
    return fallback;
  }
}

function buildFilename(kind: string, number: string): string {
  const sanitized = (number || "sin-numero").replace(/[^a-zA-Z0-9-_]/g, "_");
  return `${kind === "invoice" ? "factura" : "presupuesto"}-${sanitized}.pdf`;
}

/**
 * Parse one or more emails separated by commas/semicolons.
 * Returns `{ emails, invalid }`: if `invalid` is non-null, al menos un token falla validación.
 */
function parseEmailList(raw: string): { emails: string[]; invalid: string | null } {
  const tokens = raw
    .split(/[,;]/)
    .map((token) => token.trim())
    .filter(Boolean);
  if (tokens.length === 0) return { emails: [], invalid: null };
  for (const token of tokens) {
    if (!EMAIL_RE.test(token)) return { emails: [], invalid: token };
  }
  return { emails: tokens, invalid: null };
}

export function DocumentActionBar({
  kindLabel,
  documentKind,
  activeDocumentId,
  saving,
  readOnly,
  editorController,
  onSaveDraft,
  onEmit,
  emitErrorMessage,
  flash,
  setFlash,
  mode = "editor",
  previewPath,
  previewQueryParam = "highlight",
  backPath,
  backLabel,
  allowSendOnReadOnly = false,
  pdfBrandColor,
  pdfLogoUrl,
}: DocumentActionBarProps): import("react").JSX.Element {
  const navigate = useNavigate();
  const [emitModalOpen, setEmitModalOpen] = useState(false);
  const [emitStep, setEmitStep] = useState<EmitStep>("confirm");
  const [emitting, setEmitting] = useState(false);
  const [sendEmail, setSendEmail] = useState("");
  const [sendSubject, setSendSubject] = useState("");
  const [sendBody, setSendBody] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [sending, setSending] = useState(false);
  const [resolvedLogoDataUrl, setResolvedLogoDataUrl] = useState<string | undefined>(undefined);

  const { editor, totals } = editorController;
  const docNumber = editor.meta.number || editor.meta.series + "-" + (editor.meta.number || "000");
  const clientEmail = editor.client.email || "";

  const pdfOptions = {
    editor,
    totals: totals.summary,
    documentNumber: docNumber,
    brandColor: pdfBrandColor,
    logoDataUrl: resolvedLogoDataUrl,
  };

  const buildPreviewUrl = (documentId: string): string => {
    return `${previewPath}?${previewQueryParam}=${encodeURIComponent(documentId)}`;
  };

  useEffect(() => {
    if (!pdfLogoUrl) {
      setResolvedLogoDataUrl(undefined);
      return;
    }
    if (pdfLogoUrl.startsWith("data:image/")) {
      setResolvedLogoDataUrl(pdfLogoUrl);
      return;
    }
    let cancelled = false;
    const toDataUrl = async () => {
      try {
        const response = await fetch(pdfLogoUrl);
        if (!response.ok) return;
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          if (cancelled) return;
          const result = typeof reader.result === "string" ? reader.result : undefined;
          setResolvedLogoDataUrl(result);
        };
        reader.readAsDataURL(blob);
      } catch {
        if (!cancelled) {
          setResolvedLogoDataUrl(undefined);
        }
      }
    };
    void toDataUrl();
    return () => {
      cancelled = true;
    };
  }, [pdfLogoUrl]);

  // Reset del paso y estado de envío al cerrar la modal
  useEffect(() => {
    if (!emitModalOpen) {
      setEmitStep("confirm");
      setSending(false);
      setEmitting(false);
    }
  }, [emitModalOpen]);

  const validateBeforePreview = (): string | null => {
    if (!editor.client.name.trim()) {
      return "El nombre del cliente es obligatorio.";
    }
    if (!editor.meta.issueDate) {
      return "La fecha de emisión es obligatoria.";
    }
    return null;
  };

  const handlePreview = async () => {
    if (!previewPath) return;
    const validationError = validateBeforePreview();
    if (validationError) {
      setFlash(validationError);
      return;
    }

    const savedId = await onSaveDraft();
    if (!savedId) return;

    navigate(buildPreviewUrl(savedId));
  };

  const handleDownload = () => {
    downloadPdf(pdfOptions, buildFilename(documentKind, docNumber));
    setFlash("PDF descargado.");
  };

  const handleEmitClick = () => {
    setEmitStep("confirm");
    setSendEmail(clientEmail);
    setSendSubject(`${kindLabel.charAt(0).toUpperCase() + kindLabel.slice(1)} ${docNumber}`);
    setSendBody(`Adjuntamos ${kindLabel} ${docNumber}. Gracias por su confianza.`);
    setScheduleDate("");
    setScheduleTime("09:00");
    setEmitModalOpen(true);
  };

  const doEmit = async (): Promise<boolean> => {
    setEmitting(true);
    const success = await onEmit();
    setEmitting(false);
    return success;
  };

  const handleEmitOnly = async () => {
    if (canOpenSendFlow) {
      setFlash("Documento listo para envío.");
      setEmitStep("done");
      setTimeout(() => setEmitModalOpen(false), 1200);
      return;
    }
    const success = await doEmit();
    if (success) {
      setEmitStep("done");
      setFlash(`${kindLabel.charAt(0).toUpperCase() + kindLabel.slice(1)} emitida correctamente.`);
      setTimeout(() => setEmitModalOpen(false), 1200);
    } else {
      // Cierra la modal aunque la emisión falle y muestra el error por toast
      setFlash(emitErrorMessage ? `No se pudo emitir: ${emitErrorMessage}` : `No se pudo emitir ${kindLabel}. Revisa los datos e inténtalo de nuevo.`);
      setEmitStep("done");
      setTimeout(() => setEmitModalOpen(false), 1500);
    }
  };

  const handleEmitAndSend = async () => {
    if (canOpenSendFlow) {
      setEmitStep("send-form");
      return;
    }
    const success = await doEmit();
    if (!success) {
      setFlash(emitErrorMessage ? `No se pudo emitir: ${emitErrorMessage}` : `No se pudo emitir ${kindLabel}. Revisa los datos e inténtalo de nuevo.`);
      setEmitStep("done");
      setTimeout(() => setEmitModalOpen(false), 1500);
      return;
    }
    setEmitStep("send-form");
  };

  const handleEmitAndSchedule = async () => {
    if (canOpenSendFlow) {
      setEmitStep("schedule-form");
      return;
    }
    const success = await doEmit();
    if (!success) {
      setFlash(emitErrorMessage ? `No se pudo emitir: ${emitErrorMessage}` : `No se pudo emitir ${kindLabel}. Revisa los datos e inténtalo de nuevo.`);
      setEmitStep("done");
      setTimeout(() => setEmitModalOpen(false), 1500);
      return;
    }
    setEmitStep("schedule-form");
  };

  const sendEmailNow = async () => {
    const parsed = parseEmailList(sendEmail);
    if (parsed.invalid) {
      setFlash(`Email inválido: ${parsed.invalid}`);
      return;
    }
    if (parsed.emails.length === 0) {
      setFlash("Introduce al menos un email de destino.");
      return;
    }
    if (parsed.emails.length > MAX_RECIPIENTS) {
      setFlash(`Máximo ${MAX_RECIPIENTS} destinatarios.`);
      return;
    }
    if (!activeDocumentId) {
      setFlash("No se puede enviar: el documento no está guardado.");
      return;
    }

    setSending(true);
    try {
      const pdfBase64 = getPdfBase64(pdfOptions);
      const payload = {
        documentType: documentKind,
        documentId: activeDocumentId,
        to: parsed.emails,
        subject: sendSubject || `${kindLabel} ${docNumber}`,
        body: sendBody || "",
        pdfBase64,
        pdfFilename: buildFilename(documentKind, docNumber),
      };

      const { data, error } = await getSupabaseClient().functions.invoke("send-document-email", { body: payload });
      const alreadyProcessed = Boolean(data?.alreadyProcessed ?? data?.alreadySent);
      const isSuccess = Boolean(data?.success);

      if (error) {
        const detail = await extractFunctionErrorMessage(error);
        setFlash(`Error al enviar: ${detail}`);
      } else if (alreadyProcessed) {
        setFlash("Este documento ya fue procesado anteriormente.");
      } else if (!isSuccess) {
        setFlash(typeof data?.error === "string" ? data.error : "No se pudo enviar el email.");
      } else {
        setFlash("Email enviado correctamente.");
      }
      setEmitStep("done");
      setTimeout(() => setEmitModalOpen(false), 1500);
    } catch (err) {
      setFlash(`Error inesperado al enviar: ${err instanceof Error ? err.message : String(err)}`);
      setEmitStep("done");
      setTimeout(() => setEmitModalOpen(false), 1500);
    } finally {
      setSending(false);
    }
  };

  const scheduleEmailSend = async () => {
    const parsed = parseEmailList(sendEmail);
    if (!scheduleDate) {
      setFlash("Introduce la fecha de envío programado.");
      return;
    }
    if (parsed.invalid) {
      setFlash(`Email inválido: ${parsed.invalid}`);
      return;
    }
    if (parsed.emails.length === 0) {
      setFlash("Introduce al menos un email de destino.");
      return;
    }
    if (parsed.emails.length > MAX_RECIPIENTS) {
      setFlash(`Máximo ${MAX_RECIPIENTS} destinatarios.`);
      return;
    }
    if (!activeDocumentId) {
      setFlash("No se puede programar: el documento no está guardado.");
      return;
    }

    setSending(true);
    try {
      const scheduledAt = new Date(`${scheduleDate}T${scheduleTime || "09:00"}:00`).toISOString();
      if (new Date(scheduledAt).getTime() <= Date.now()) {
        setFlash("La fecha/hora programada debe ser futura.");
        setSending(false);
        return;
      }
      const pdfBase64 = getPdfBase64(pdfOptions);
      const payload = {
        documentType: documentKind,
        documentId: activeDocumentId,
        to: parsed.emails,
        subject: sendSubject || `${kindLabel} ${docNumber}`,
        body: sendBody || "",
        pdfBase64,
        pdfFilename: buildFilename(documentKind, docNumber),
        scheduledAt,
      };

      const { data, error } = await getSupabaseClient().functions.invoke("send-document-email", { body: payload });
      const alreadyProcessed = Boolean(data?.alreadyProcessed ?? data?.alreadySent);
      const isSuccess = Boolean(data?.success);

      if (error) {
        setFlash(`Error al programar: ${await extractFunctionErrorMessage(error)}`);
      } else if (alreadyProcessed) {
        setFlash("Este documento ya tenía un envío procesado.");
      } else if (!isSuccess) {
        setFlash(typeof data?.error === "string" ? data.error : "No se pudo programar el envío.");
      } else {
        setFlash(`Envío programado para ${scheduleDate} a las ${scheduleTime}.`);
      }
      setEmitStep("done");
      setTimeout(() => setEmitModalOpen(false), 1500);
    } catch (err) {
      setFlash(`Error inesperado: ${err instanceof Error ? err.message : String(err)}`);
      setEmitStep("done");
      setTimeout(() => setEmitModalOpen(false), 1500);
    } finally {
      setSending(false);
    }
  };

  const resolvedBackPath = backPath ?? (documentKind === "invoice" ? "/facturas/borradores" : "/presupuestos/borradores");
  const resolvedBackLabel = backLabel ?? "Volver";
  const canOpenSendFlow = allowSendOnReadOnly && readOnly;
  const primaryLabel = canOpenSendFlow ? "Enviar o programar" : `Emitir ${kindLabel}`;

  return (
    <>
      {flash
        ? createPortal(
            <div className="doc-action-flash doc-action-flash--portal">{flash}</div>,
            document.body,
          )
        : null}

      <div className="doc-action-bar">
        <div className="doc-action-bar__left">
          <button type="button" className="doc-action-bar__btn doc-action-bar__btn--ghost" onClick={() => navigate(resolvedBackPath)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            {resolvedBackLabel}
          </button>
        </div>
        <div className="doc-action-bar__right">
          <button type="button" className="doc-action-bar__btn" onClick={() => void onSaveDraft()} disabled={saving || readOnly}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M17 21v-8H7v8M7 3v5h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Guardar borrador
          </button>
          {mode === "editor" ? (
            <button type="button" className="doc-action-bar__btn" onClick={() => void handlePreview()} disabled={saving || !previewPath}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/></svg>
              Vista previa
            </button>
          ) : null}
          <button type="button" className="doc-action-bar__btn" onClick={handleDownload} disabled={saving}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Descargar PDF
          </button>
          <button
            type="button"
            className="doc-action-bar__btn doc-action-bar__btn--primary"
            onClick={handleEmitClick}
            disabled={saving || (!canOpenSendFlow && readOnly)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            {primaryLabel}
          </button>
        </div>
      </div>

      {emitModalOpen ? createPortal(
        <div className="doc-emit-overlay" onClick={() => { if (emitStep !== "done") setEmitModalOpen(false); }}>
          <div className="doc-emit-modal" onClick={(e) => e.stopPropagation()}>
            {emitStep === "confirm" ? (
              <>
                <div className="doc-emit-modal__header">
                  <div className="doc-emit-modal__icon">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <h3>{canOpenSendFlow ? `Enviar ${kindLabel}` : `Emitir ${kindLabel}`}</h3>
                  <p>Elige cómo quieres proceder con {kindLabel} <strong>{docNumber}</strong></p>
                </div>
                <div className="doc-emit-modal__options">
                  <button type="button" className="doc-emit-option" onClick={() => void handleEmitAndSend()} disabled={emitting}>
                    <div className="doc-emit-option__icon doc-emit-option__icon--send">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="1.5"/><path d="M22 6l-10 7L2 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    <div>
                      <strong>Emitir y Enviar</strong>
                      <span>Emite y envía por email al cliente</span>
                    </div>
                  </button>
                  <button type="button" className="doc-emit-option" onClick={() => void handleEmitAndSchedule()} disabled={emitting}>
                    <div className="doc-emit-option__icon doc-emit-option__icon--schedule">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/><path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    <div>
                      <strong>Emitir y Programar</strong>
                      <span>Emite y programa el envío para más tarde</span>
                    </div>
                  </button>
                  <button type="button" className="doc-emit-option" onClick={() => void handleEmitOnly()} disabled={emitting}>
                    <div className="doc-emit-option__icon doc-emit-option__icon--only">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    <div>
                      <strong>Solo emitir</strong>
                      <span>Emite sin enviar email</span>
                    </div>
                  </button>
                </div>
                {emitting ? <p className="doc-emit-modal__loading">Emitiendo documento...</p> : null}
              </>
            ) : null}

            {emitStep === "send-form" ? (
              <>
                <div className="doc-emit-modal__header">
                  <h3>Enviar {kindLabel} por email</h3>
                  <p>Se adjuntará el PDF del documento</p>
                </div>
                <div className="doc-emit-modal__form">
                  <label className="inv-label">Email del destinatario</label>
                  <input
                    className="inv-input"
                    type="text"
                    value={sendEmail}
                    onChange={(e) => setSendEmail(e.target.value)}
                    placeholder="cliente@email.com, asesor@email.com"
                  />
                  <small className="doc-emit-modal__hint">Puedes separar varios emails con comas. Máx. {MAX_RECIPIENTS}.</small>
                  <label className="inv-label">Asunto</label>
                  <input className="inv-input" type="text" value={sendSubject} onChange={(e) => setSendSubject(e.target.value)} />
                  <label className="inv-label">Mensaje</label>
                  <textarea className="inv-textarea" value={sendBody} onChange={(e) => setSendBody(e.target.value)} rows={3} />
                </div>
                <div className="doc-emit-modal__footer">
                  <button type="button" className="doc-action-bar__btn" onClick={() => setEmitModalOpen(false)} disabled={sending}>Cancelar</button>
                  <button type="button" className="doc-action-bar__btn doc-action-bar__btn--primary" onClick={() => void sendEmailNow()} disabled={sending}>
                    {sending ? "Enviando..." : "Enviar ahora"}
                  </button>
                </div>
              </>
            ) : null}

            {emitStep === "schedule-form" ? (
              <>
                <div className="doc-emit-modal__header">
                  <h3>Programar envío</h3>
                  <p>Elige cuándo enviar {kindLabel} al cliente</p>
                </div>
                <div className="doc-emit-modal__form">
                  <label className="inv-label">Email del destinatario</label>
                  <input
                    className="inv-input"
                    type="text"
                    value={sendEmail}
                    onChange={(e) => setSendEmail(e.target.value)}
                    placeholder="cliente@email.com, asesor@email.com"
                  />
                  <small className="doc-emit-modal__hint">Puedes separar varios emails con comas. Máx. {MAX_RECIPIENTS}.</small>
                  <label className="inv-label">Asunto</label>
                  <input className="inv-input" type="text" value={sendSubject} onChange={(e) => setSendSubject(e.target.value)} />
                  <div className="doc-emit-modal__date-row">
                    <div>
                      <label className="inv-label">Fecha de envío</label>
                      <input className="inv-input" type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} />
                    </div>
                    <div>
                      <label className="inv-label">Hora</label>
                      <input className="inv-input" type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} />
                    </div>
                  </div>
                  <label className="inv-label">Mensaje</label>
                  <textarea className="inv-textarea" value={sendBody} onChange={(e) => setSendBody(e.target.value)} rows={3} />
                </div>
                <div className="doc-emit-modal__footer">
                  <button type="button" className="doc-action-bar__btn" onClick={() => setEmitModalOpen(false)} disabled={sending}>Cancelar</button>
                  <button type="button" className="doc-action-bar__btn doc-action-bar__btn--primary" onClick={() => void scheduleEmailSend()} disabled={sending}>
                    {sending ? "Programando..." : "Programar envío"}
                  </button>
                </div>
              </>
            ) : null}

            {emitStep === "done" ? (
              <div className="doc-emit-modal__done">
                <div className="doc-emit-modal__done-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#22c55e" strokeWidth="1.5"/><path d="M9 12l2 2 4-4" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <p>{flash || "Operación completada"}</p>
              </div>
            ) : null}
          </div>
        </div>,
        document.body,
      ) : null}
    </>
  );
}
