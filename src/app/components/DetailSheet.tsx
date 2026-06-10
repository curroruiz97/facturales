import { useEffect } from "react";

export interface DetailField {
  label: string;
  value: string | import("react").JSX.Element;
  accent?: "ok" | "danger" | "warn";
}

export interface DetailAction {
  label: string;
  onClick: () => void;
  variant?: "primary" | "danger" | "default";
}

interface DetailSheetProps {
  open: boolean;
  title: string;
  subtitle?: string;
  fields: DetailField[];
  actions?: DetailAction[];
  onClose: () => void;
}

export function DetailSheet({ open, title, subtitle, fields, actions, onClose }: DetailSheetProps): import("react").JSX.Element | null {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="detail-sheet__backdrop" onClick={onClose} />
      <div className="detail-sheet" role="dialog" aria-label={title}>
        <div className="detail-sheet__handle" />
        <header className="detail-sheet__header">
          <div>
            <h2 className="detail-sheet__title">{title}</h2>
            {subtitle ? <p className="detail-sheet__subtitle">{subtitle}</p> : null}
          </div>
          <button type="button" className="detail-sheet__close" onClick={onClose} aria-label="Cerrar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </header>
        <div className="detail-sheet__body">
          {fields.map((field, i) => (
            <div key={i} className="detail-sheet__field">
              <span className="detail-sheet__label">{field.label}</span>
              <span className={`detail-sheet__value ${field.accent ? `detail-sheet__value--${field.accent}` : ""}`}>
                {field.value}
              </span>
            </div>
          ))}
        </div>
        {actions && actions.length > 0 ? (
          <footer className="detail-sheet__actions">
            {actions.map((action, i) => (
              <button
                key={i}
                type="button"
                className={`detail-sheet__action-btn detail-sheet__action-btn--${action.variant ?? "default"}`}
                onClick={() => { action.onClick(); onClose(); }}
              >
                {action.label}
              </button>
            ))}
          </footer>
        ) : null}
      </div>
    </>
  );
}
