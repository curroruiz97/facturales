import { useEffect, useMemo, useState } from "react";

export interface ContactFormValues {
  nombreRazonSocial: string;
  identificador: string;
  tipoCliente: "autonomo" | "empresa";
  email: string;
  telefono: string;
  direccion: string;
  codigoPostal: string;
  ciudad: string;
  provincia: string;
  pais: string;
  diaFacturacion: string;
  estado: "activo" | "inactivo" | "recurrente" | "puntual";
}

interface ContactFormModalProps {
  open: boolean;
  mode: "create" | "edit";
  initialValues: ContactFormValues;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (values: ContactFormValues) => Promise<void>;
}

export function ContactFormModal(props: ContactFormModalProps): import("react").JSX.Element | null {
  const { open, mode, initialValues, saving, error, onClose, onSubmit } = props;
  const [values, setValues] = useState<ContactFormValues>(initialValues);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setValues(initialValues);
    setLocalError(null);
  }, [initialValues, open]);

  const title = useMemo(() => (mode === "create" ? "Nuevo contacto" : "Editar contacto"), [mode]);

  if (!open) return null;

  const updateField = <K extends keyof ContactFormValues>(field: K, value: ContactFormValues[K]) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const submit = async () => {
    if (!values.nombreRazonSocial.trim()) {
      setLocalError("El nombre o razón social es obligatorio.");
      return;
    }
    if (!values.identificador.trim()) {
      setLocalError("El identificador es obligatorio.");
      return;
    }
    const day = values.diaFacturacion.trim();
    if (day) {
      const parsed = Number.parseInt(day, 10);
      if (Number.isNaN(parsed) || parsed < 1 || parsed > 31) {
        setLocalError("El día de facturación debe estar entre 1 y 31.");
        return;
      }
    }

    setLocalError(null);
    await onSubmit(values);
  };

  return (
    <div className="pilot-modal" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="pilot-modal__overlay" onClick={onClose} aria-label="Cerrar modal" />
      <div className="pilot-modal__content">
        <div className="pilot-modal__header">
          <h3 className="text-lg font-bold">{title}</h3>
          <button type="button" className="pilot-btn" onClick={onClose} disabled={saving}>
            Cerrar
          </button>
        </div>

        <div className="pilot-grid pilot-grid--two">
          <label className="pilot-field">
            Nombre / Razón social
            <input
              className="pilot-input"
              value={values.nombreRazonSocial}
              onChange={(event) => updateField("nombreRazonSocial", event.target.value)}
              placeholder="Ej: Acme SL"
            />
          </label>

          <label className="pilot-field">
            NIF / CIF
            <input
              className="pilot-input"
              value={values.identificador}
              onChange={(event) => updateField("identificador", event.target.value.toUpperCase())}
              placeholder="B12345678"
            />
          </label>

          <label className="pilot-field">
            Tipo
            <select className="pilot-input" value={values.tipoCliente} onChange={(event) => updateField("tipoCliente", event.target.value as "autonomo" | "empresa")}>
              <option value="autonomo">Autónomo</option>
              <option value="empresa">Empresa</option>
            </select>
          </label>

          <label className="pilot-field">
            Tipo de contacto
            <div className="contact-type-switch" role="tablist" aria-label="Tipo de contacto">
              <button
                type="button"
                className={`contact-type-switch__btn ${values.estado === "puntual" ? "contact-type-switch__btn--active" : ""}`}
                onClick={() => setValues((prev) => ({ ...prev, estado: "puntual", diaFacturacion: "" }))}
              >
                Puntual
              </button>
              <button
                type="button"
                className={`contact-type-switch__btn ${values.estado === "recurrente" ? "contact-type-switch__btn--active" : ""}`}
                onClick={() => updateField("estado", "recurrente")}
              >
                Recurrente
              </button>
            </div>
            <small className="contact-type-switch__hint">
              {values.estado === "recurrente" ? "Día de facturación mensual" : "Sin día fijo"}
            </small>
          </label>

          <label className="pilot-field">
            Email
            <input className="pilot-input" type="email" value={values.email} onChange={(event) => updateField("email", event.target.value)} placeholder="cliente@email.com" />
          </label>

          <label className="pilot-field">
            Teléfono
            <input className="pilot-input" value={values.telefono} onChange={(event) => updateField("telefono", event.target.value)} placeholder="+34 600 000 000" />
          </label>

          <label className="pilot-field">
            Dirección
            <input className="pilot-input" value={values.direccion} onChange={(event) => updateField("direccion", event.target.value)} placeholder="Calle, número" />
          </label>

          <label className="pilot-field">
            Código postal
            <input className="pilot-input" value={values.codigoPostal} onChange={(event) => updateField("codigoPostal", event.target.value)} placeholder="28001" />
          </label>

          <label className="pilot-field">
            Ciudad
            <input className="pilot-input" value={values.ciudad} onChange={(event) => updateField("ciudad", event.target.value)} placeholder="Madrid" />
          </label>

          <label className="pilot-field">
            Provincia
            <input className="pilot-input" value={values.provincia} onChange={(event) => updateField("provincia", event.target.value)} placeholder="Madrid" />
          </label>

          <label className="pilot-field">
            País
            <input className="pilot-input" value={values.pais} onChange={(event) => updateField("pais", event.target.value)} placeholder="España" />
          </label>

          <label className="pilot-field">
            Día facturación
            <input
              className="pilot-input"
              value={values.diaFacturacion}
              onChange={(event) => updateField("diaFacturacion", event.target.value)}
              placeholder="1-31"
              inputMode="numeric"
            />
          </label>
        </div>

        {localError ? <p className="pilot-error-text mt-4">{localError}</p> : null}
        {error ? <p className="pilot-error-text mt-2">{error}</p> : null}

        <div className="pilot-modal__footer mt-5">
          <button type="button" className="pilot-btn" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button type="button" className="pilot-btn pilot-btn--primary" onClick={() => void submit()} disabled={saving}>
            {saving ? "Guardando..." : mode === "create" ? "Crear contacto" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}

