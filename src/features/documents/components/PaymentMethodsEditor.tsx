import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { DocumentPaymentMethodDraft } from "../core/document-types";
import type { PaymentMethod } from "../../../shared/types/domain";

interface PaymentMethodsEditorProps {
  methods: DocumentPaymentMethodDraft[];
  readOnly?: boolean;
  onAddMethod: (initial?: Partial<DocumentPaymentMethodDraft>) => void;
  onUpdateMethod: (methodId: string, patch: Partial<DocumentPaymentMethodDraft>) => void;
  onRemoveMethod: (methodId: string) => void;
  onSaveDefault?: (method: { type: PaymentMethod["type"]; iban: string; phone: string; label: string }) => void;
}

type MethodType = PaymentMethod["type"];

const TYPE_META: Record<MethodType, { label: string; icon: ReactNode }> = {
  transferencia: {
    label: "Transferencia",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M2 10h20" stroke="currentColor" strokeWidth="1.5"/></svg>
    ),
  },
  domiciliacion: {
    label: "Domiciliación",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/><path d="M12 8v4l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M8 12h0" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
    ),
  },
  efectivo: {
    label: "Efectivo",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/><path d="M12 7v10M9 9.5c0-.83.67-1.5 1.5-1.5h1c.83 0 1.5.67 1.5 1.5S12.33 11 11.5 11h1c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-1c-.83 0-1.5-.67-1.5-1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
    ),
  },
  contrareembolso: {
    label: "Contrareembolso",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><rect x="3" y="7" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M3 11h18" stroke="currentColor" strokeWidth="1.5"/><path d="M7 15h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
    ),
  },
  bizum: {
    label: "Bizum",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><rect x="5" y="2" width="14" height="20" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M10 18h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M9 9l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
    ),
  },
  otro: {
    label: "Otro",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M7 15h4M7 11h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
    ),
  },
};

const ALL_TYPES: MethodType[] = ["transferencia", "domiciliacion", "efectivo", "contrareembolso", "bizum", "otro"];

function formatIban(raw: string): string {
  const clean = raw.replace(/\s/g, "").toUpperCase();
  return clean.replace(/(.{4})/g, "$1 ").trim();
}

function unformatIban(formatted: string): string {
  return formatted.replace(/\s/g, "").toUpperCase();
}

export function PaymentMethodsEditor({
  methods,
  readOnly = false,
  onAddMethod,
  onUpdateMethod,
  onRemoveMethod,
  onSaveDefault,
}: PaymentMethodsEditorProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<MethodType | null>(null);
  const [formAlias, setFormAlias] = useState("");
  const [formIban, setFormIban] = useState("");
  const [formBic, setFormBic] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formIncludeRecurrent, setFormIncludeRecurrent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const openModal = () => {
    setSelectedType(null);
    setFormAlias("");
    setFormIban("");
    setFormBic("");
    setFormPhone("");
    setFormIncludeRecurrent(false);
    setFormError(null);
    setModalOpen(true);
  };

  const confirmAdd = () => {
    if (!selectedType) return;

    // Validaciones suaves: IBAN solo si el usuario lo rellenó (mal)
    if ((selectedType === "transferencia" || selectedType === "domiciliacion")) {
      const cleanIban = unformatIban(formIban);
      if (cleanIban && cleanIban.length < 15) {
        setFormError("El IBAN debe tener al menos 15 caracteres o dejarse vacío.");
        return;
      }
    }

    const method: Partial<DocumentPaymentMethodDraft> = {
      type: selectedType,
      label: formAlias.trim() || TYPE_META[selectedType].label,
      iban: selectedType === "transferencia" || selectedType === "domiciliacion" || selectedType === "otro" ? unformatIban(formIban) : "",
      phone: selectedType === "bizum" ? formPhone.trim() : "",
    };

    onAddMethod(method);

    if (formIncludeRecurrent && onSaveDefault) {
      onSaveDefault({
        type: selectedType,
        iban: method.iban ?? "",
        phone: method.phone ?? "",
        label: method.label ?? "",
      });
    }

    setModalOpen(false);
  };

  const needsIban = selectedType === "transferencia" || selectedType === "domiciliacion" || selectedType === "otro";
  const needsPhone = selectedType === "bizum";

  return (
    <>
      <div className="pm-card">
        <div className="pm-card__header">
          <span className="pm-card__title">Métodos de pago</span>
          {!readOnly ? (
            <button type="button" className="pm-card__add-btn" onClick={openModal}>
              + Añadir método de pago
            </button>
          ) : null}
        </div>

        {methods.length === 0 ? (
          <p className="pm-card__empty">Sin métodos configurados.</p>
        ) : null}

        <div className="pm-card__list">
          {methods.map((method) => {
            const meta = TYPE_META[method.type] ?? TYPE_META.otro;
            const detail = method.iban ? formatIban(method.iban) : method.phone || "";
            return (
              <div key={method.id} className="pm-item">
                <div className="pm-item__info">
                  <strong className="pm-item__type">{method.label || meta.label}</strong>
                  {detail ? <span className="pm-item__detail">{detail}</span> : null}
                </div>
                {!readOnly ? (
                  <button type="button" className="pm-item__remove" onClick={() => onRemoveMethod(method.id)} aria-label="Eliminar">
                    ×
                  </button>
                ) : null}
                {!readOnly && onSaveDefault ? (
                  <label className="pm-item__default-label">
                    <input
                      type="checkbox"
                      onChange={() =>
                        onSaveDefault({
                          type: method.type,
                          iban: method.iban,
                          phone: method.phone,
                          label: method.label,
                        })
                      }
                    />
                    Guardar como predeterminado
                  </label>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {modalOpen
        ? createPortal(
            <div className="pm-modal-overlay" onClick={() => setModalOpen(false)}>
              <div className="pm-modal" onClick={(e) => e.stopPropagation()}>
                <div className="pm-modal__header">
                  <div>
                    <h3 className="pm-modal__title">Añadir método de pago</h3>
                    <p className="pm-modal__subtitle">Selecciona el método de pago aceptado en tus facturas</p>
                  </div>
                  <button type="button" className="pm-modal__close" onClick={() => setModalOpen(false)}>×</button>
                </div>

                <div className="pm-modal__grid">
                  {ALL_TYPES.map((type) => {
                    const meta = TYPE_META[type];
                    const active = selectedType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        className={`pm-type-card ${active ? "pm-type-card--active" : ""}`}
                        onClick={() => {
                          setSelectedType(type);
                          setFormError(null);
                        }}
                      >
                        <span className="pm-type-card__icon">{meta.icon}</span>
                        <span className="pm-type-card__label">{meta.label}</span>
                      </button>
                    );
                  })}
                </div>

                {selectedType ? (
                  <div className="pm-modal__form">
                    <div>
                      <label className="inv-label">Alias de la cuenta</label>
                      <input
                        className="inv-input"
                        type="text"
                        value={formAlias}
                        onChange={(e) => setFormAlias(e.target.value)}
                        placeholder="Cuenta principal"
                      />
                      <p className="pm-modal__hint">No se mostrará en el documento</p>
                    </div>

                    {needsIban ? (
                      <>
                        <div>
                          <label className="inv-label">IBAN *</label>
                          <input
                            className="inv-input"
                            type="text"
                            value={formatIban(formIban)}
                            onChange={(e) => setFormIban(unformatIban(e.target.value))}
                            placeholder="ES00 0000 0000 0000 0000 0000"
                            maxLength={34}
                          />
                        </div>
                        <div>
                          <label className="inv-label">Código BIC</label>
                          <input
                            className="inv-input"
                            type="text"
                            value={formBic}
                            onChange={(e) => setFormBic(e.target.value.toUpperCase())}
                            placeholder="BSCHESMMXXX"
                          />
                        </div>
                      </>
                    ) : null}

                    {needsPhone ? (
                      <div>
                        <label className="inv-label">Teléfono *</label>
                        <input
                          className="inv-input"
                          type="tel"
                          value={formPhone}
                          onChange={(e) => setFormPhone(e.target.value)}
                          placeholder="+34 600 000 000"
                        />
                      </div>
                    ) : null}

                    {onSaveDefault ? (
                      <label className="inv-checkbox-row">
                        <input
                          type="checkbox"
                          checked={formIncludeRecurrent}
                          onChange={(e) => setFormIncludeRecurrent(e.target.checked)}
                        />
                        Incluir en las facturas recurrentes programadas y borradores
                      </label>
                    ) : null}

                    {formError ? <p className="pm-modal__error">{formError}</p> : null}
                  </div>
                ) : null}

                <div className="pm-modal__footer">
                  <button type="button" className="inv-btn" onClick={() => setModalOpen(false)}>Cancelar</button>
                  <button
                    type="button"
                    className="inv-btn inv-btn--primary"
                    disabled={!selectedType}
                    onClick={confirmAdd}
                  >
                    Añadir método de pago
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
