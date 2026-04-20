import { useRef, useState } from "react";
import { supportTicketService, type SupportPriority } from "../../../services/support/support-ticket.service";

const PRIORITY_OPTIONS: Array<{ value: SupportPriority; label: string; color: string; time: string }> = [
  { value: "low", label: "Baja", color: "#22c55e", time: "72h" },
  { value: "medium", label: "Media", color: "#f59e0b", time: "48h" },
  { value: "high", label: "Alta", color: "#ef4444", time: "24h" },
];

const CATEGORIES = [
  { id: "general", label: "Consulta general", icon: IconChat },
  { id: "bug", label: "Reportar un error", icon: IconBug },
  { id: "billing", label: "Facturación y pagos", icon: IconCard },
  { id: "feature", label: "Sugerencia", icon: IconLightbulb },
  { id: "account", label: "Mi cuenta", icon: IconUser },
  { id: "other", label: "Otro", icon: IconDots },
];

const SUGGESTIONS = [
  { question: "¿Cómo puedo cambiar mis datos fiscales?", answer: "Ve a Configuración > Datos de tu negocio y actualiza tu nombre fiscal, CIF y dirección." },
  { question: "¿Puedo personalizar el diseño de mis facturas?", answer: "Sí, en Configuración > Personalización puedes subir tu logo, elegir colores y ajustar el formato." },
  { question: "¿Cómo exporto mis facturas en PDF?", answer: "Desde la vista previa de cualquier factura emitida, haz clic en el botón 'Descargar PDF'." },
  { question: "¿Cómo añado un nuevo método de pago?", answer: "Al emitir una factura o presupuesto, en la sección 'Métodos de pago' pulsa 'Añadir método de pago'." },
  { question: "¿Dónde veo mi resumen fiscal?", answer: "En el menú lateral, accede a 'Resumen Fiscal' para ver tus modelos 303, 130 y totales por trimestre." },
  { question: "¿Puedo importar contactos desde un CSV?", answer: "Sí, en la sección de Contactos encontrarás la opción de importar un archivo CSV con tus clientes." },
  { question: "¿Cómo cambio mi plan de suscripción?", answer: "En Configuración > Suscripción puedes ver tu plan actual, comparar opciones y cambiar de plan." },
  { question: "¿Qué hago si no recibo el email de verificación?", answer: "Revisa tu bandeja de spam. Si no está ahí, cierra sesión y solicita un nuevo email desde la pantalla de login." },
];


/* ─── Icons ─── */
function IconChat() {
  return (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>);
}
function IconBug() {
  return (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2l1.88 1.88M14.12 3.88L16 2M9 7.13v-1a3 3 0 016 0v1" /><path d="M12 20c-3.3 0-6-2.7-6-6v-3a6 6 0 0112 0v3c0 3.3-2.7 6-6 6z" /><path d="M12 20v-9M6.53 9C4.6 8.8 3 7.1 3 5M6 13H3M6 17l-3 1M17.47 9c1.93-.2 3.53-1.9 3.53-4M18 13h3M18 17l3 1" /></svg>);
}
function IconCard() {
  return (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>);
}
function IconLightbulb() {
  return (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18h6M10 22h4" /><path d="M12 2a7 7 0 00-4 12.7V17h8v-2.3A7 7 0 0012 2z" /></svg>);
}
function IconUser() {
  return (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>);
}
function IconDots() {
  return (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></svg>);
}
function IconSend() {
  return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>);
}
function IconChevron() {
  return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>);
}
function IconCheck() {
  return (<svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>);
}
function IconPaperclip() {
  return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" /></svg>);
}
function IconTrash() {
  return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /></svg>);
}
function IconMail() {
  return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ec8228" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>);
}
function IconClock() {
  return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ec8228" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>);
}
function IconShield() {
  return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ec8228" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>);
}

export function SupportPage(): import("react").JSX.Element {
  const [category, setCategory] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<SupportPriority>("medium");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const charCount = message.length;
  const charMax = 6000;
  const charMin = 20;
  const activePriority = PRIORITY_OPTIONS.find((p) => p.value === priority)!;

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files).slice(0, 5 - attachments.length);
    setAttachments((prev) => [...prev, ...newFiles].slice(0, 5));
  };

  const removeFile = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  const submit = async () => {
    if (!subject.trim()) { setError("El asunto es obligatorio."); return; }
    if (charCount < charMin) { setError(`El mensaje debe tener al menos ${charMin} caracteres.`); return; }
    setLoading(true);
    setError(null);

    const fullSubject = category
      ? `[${CATEGORIES.find((c) => c.id === category)?.label ?? category}] ${subject}`
      : subject;

    const attachmentNote = attachments.length > 0
      ? `\n\n[Adjuntos: ${attachments.map((f) => f.name).join(", ")}]`
      : "";

    const result = await supportTicketService.submitTicket({
      subject: fullSubject,
      message: message + attachmentNote,
      priority,
    });
    setLoading(false);

    if (!result.success) {
      setError(result.error.message);
      return;
    }

    setTicketId(result.data.ticketId);
    setSent(true);
  };

  const reset = () => {
    setCategory(null);
    setSubject("");
    setMessage("");
    setPriority("medium");
    setAttachments([]);
    setError(null);
    setSent(false);
    setTicketId(null);
  };

  if (sent) {
    return (
      <div className="sp-page">
        <div className="sp-success">
          <div className="sp-success__ring"><IconCheck /></div>
          <h2 className="sp-success__title">Ticket enviado correctamente</h2>
          {ticketId ? <p className="sp-success__id">Referencia: <strong>#{ticketId}</strong></p> : null}
          <p className="sp-success__desc">
            Nuestro equipo revisará tu solicitud y te responderá lo antes posible.
            Recibirás una notificación por email cuando haya novedades.
          </p>
          <div className="sp-success__actions">
            <button type="button" className="pilot-btn pilot-btn--primary sp-success__btn" onClick={reset}>
              Enviar otro ticket
            </button>
            <a href="/transacciones" className="pilot-btn sp-success__btn sp-success__btn--outline">
              Volver al inicio
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sp-page">
      {/* Header */}
      <div className="sp-hero">
        <div className="sp-hero__left">
          <h1 className="sp-hero__title">Centro de soporte</h1>
          <p className="sp-hero__sub">Describe tu consulta y nuestro equipo te ayudará lo antes posible.</p>
        </div>
        <div className="sp-hero__badge">
          <IconShield />
          <span>Soporte incluido en tu plan</span>
        </div>
      </div>

      <div className="sp-layout">
        {/* Left: Form */}
        <div className="sp-form-col">
          {/* Category picker */}
          <section className="pilot-panel sp-section">
            <h3 className="sp-section__title">¿Sobre qué tema es tu consulta?</h3>
            <div className="sp-categories">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const active = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    className={`sp-cat ${active ? "sp-cat--active" : ""}`}
                    onClick={() => setCategory(active ? null : cat.id)}
                  >
                    <span className="sp-cat__icon"><Icon /></span>
                    <span className="sp-cat__label">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Ticket form */}
          <section className="pilot-panel sp-section">
            <div className="sp-section__header">
              <h3 className="sp-section__title" style={{ margin: 0 }}>Detalles del ticket</h3>
              <div className="sp-response-time" style={{ "--sp-pri-color": activePriority.color } as React.CSSProperties}>
                <IconClock />
                <span>Respuesta estimada: <strong>{activePriority.time}</strong></span>
              </div>
            </div>

            <div className="sp-form">
              <div className="sp-form__row">
                <div className="sp-field sp-field--grow">
                  <label className="sp-field__label" htmlFor="sp-subject">Asunto</label>
                  <input
                    id="sp-subject"
                    className="sp-field__input"
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Resumen breve del problema o consulta"
                    disabled={loading}
                    maxLength={180}
                  />
                </div>
                <div className="sp-field">
                  <label className="sp-field__label">Prioridad</label>
                  <div className="sp-priority-group">
                    {PRIORITY_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        className={`sp-priority-btn ${priority === opt.value ? "sp-priority-btn--active" : ""}`}
                        onClick={() => setPriority(opt.value)}
                        disabled={loading}
                        style={{ "--sp-pri-color": opt.color } as React.CSSProperties}
                      >
                        <span className="sp-priority-btn__dot" />
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="sp-field">
                <label className="sp-field__label" htmlFor="sp-message">Descripción</label>
                <textarea
                  id="sp-message"
                  className="sp-field__textarea"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={"Describe el problema con el mayor detalle posible:\n\n• ¿Qué intentabas hacer?\n• ¿Qué ocurrió en su lugar?\n• ¿Puedes reproducirlo?"}
                  disabled={loading}
                  maxLength={charMax}
                  rows={7}
                />
                <div className="sp-field__meta">
                  <span className="sp-field__hint">Mínimo {charMin} caracteres</span>
                  <span className={`sp-field__counter ${charCount < charMin ? "sp-field__counter--warn" : ""}`}>{charCount}/{charMax}</span>
                </div>
              </div>

              {/* Attachments */}
              <div className="sp-field">
                <label className="sp-field__label">Adjuntos <span className="sp-field__opt">(opcional, máx. 5)</span></label>
                <div className="sp-attachments">
                  {attachments.map((f, i) => (
                    <div key={i} className="sp-attachment">
                      <IconPaperclip />
                      <span className="sp-attachment__name">{f.name}</span>
                      <span className="sp-attachment__size">{(f.size / 1024).toFixed(0)} KB</span>
                      <button type="button" className="sp-attachment__remove" onClick={() => removeFile(i)} aria-label="Eliminar"><IconTrash /></button>
                    </div>
                  ))}
                  {attachments.length < 5 ? (
                    <button type="button" className="sp-attach-btn" onClick={() => fileRef.current?.click()} disabled={loading}>
                      <IconPaperclip />
                      Adjuntar archivo
                    </button>
                  ) : null}
                  <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,.csv" multiple className="sp-attach-hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
                </div>
              </div>

              {error ? <p className="sp-error">{error}</p> : null}

              <button
                type="button"
                className="pilot-btn pilot-btn--primary sp-submit"
                onClick={() => void submit()}
                disabled={loading || !subject.trim() || charCount < charMin}
              >
                {loading ? (
                  <><span className="sp-submit__spinner" />Enviando...</>
                ) : (
                  <><IconSend />Enviar ticket</>
                )}
              </button>
            </div>
          </section>
        </div>

        {/* Right: Sidebar */}
        <div className="sp-sidebar-col">
          {/* FAQ */}
          <section className="pilot-panel sp-section">
            <h3 className="sp-section__title">Preguntas frecuentes</h3>
            <div className="sp-faq">
              {SUGGESTIONS.map((s, i) => {
                const isOpen = expandedFaq === i;
                return (
                  <div key={i} className={`sp-faq__item ${isOpen ? "sp-faq__item--open" : ""}`}>
                    <button type="button" className="sp-faq__question" onClick={() => setExpandedFaq(isOpen ? null : i)}>
                      <span>{s.question}</span>
                      <span className={`sp-faq__arrow ${isOpen ? "sp-faq__arrow--open" : ""}`}><IconChevron /></span>
                    </button>
                    <div className={`sp-faq__answer ${isOpen ? "sp-faq__answer--open" : ""}`}>
                      <p>{s.answer}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Contact info */}
          <section className="pilot-panel sp-section sp-contact">
            <h3 className="sp-section__title">Contacto directo</h3>
            <div className="sp-contact__row"><IconMail /><span>soporte@facturales.es</span></div>
            <div className="sp-contact__row"><IconClock /><span>Lunes a viernes · 9:00 – 18:00</span></div>
            <div className="sp-contact__row"><IconShield /><span>Datos protegidos · Comunicación cifrada</span></div>
            <p className="sp-contact__note">Tiempo medio de respuesta: menos de 24 horas laborables.</p>
          </section>

          {/* Tips */}
          <section className="pilot-panel sp-section sp-tips">
            <h3 className="sp-section__title">Consejos para un buen ticket</h3>
            <ul className="sp-tips__list">
              <li>Describe el problema con pasos claros para reproducirlo</li>
              <li>Incluye capturas de pantalla si es un error visual</li>
              <li>Indica qué navegador y dispositivo estás usando</li>
              <li>Si es urgente, selecciona prioridad Alta</li>
              <li>Un ticket bien descrito se resuelve más rápido</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
