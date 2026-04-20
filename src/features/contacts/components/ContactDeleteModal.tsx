interface ContactDeleteModalProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ContactDeleteModal(props: ContactDeleteModalProps): import("react").JSX.Element | null {
  const { open, title, description, confirmLabel, loading, onCancel, onConfirm } = props;
  if (!open) return null;

  return (
    <div className="pilot-modal" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="pilot-modal__overlay" onClick={onCancel} aria-label="Cerrar modal" />
      <div className="pilot-modal__content pilot-modal__content--compact">
        <div className="pilot-modal__header">
          <h3 className="text-lg font-bold">{title}</h3>
        </div>
        <p className="mb-6 text-sm opacity-80">{description}</p>
        <div className="pilot-modal__footer">
          <button type="button" className="pilot-btn" onClick={onCancel} disabled={loading}>
            Cancelar
          </button>
          <button type="button" className="pilot-btn pilot-btn--danger" onClick={onConfirm} disabled={loading}>
            {loading ? "Eliminando..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

