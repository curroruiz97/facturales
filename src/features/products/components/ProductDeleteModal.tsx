interface ProductDeleteModalProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}

export function ProductDeleteModal({
  open,
  title,
  description,
  confirmLabel,
  loading,
  onCancel,
  onConfirm,
}: ProductDeleteModalProps): import("react").JSX.Element | null {
  if (!open) {
    return null;
  }

  return (
    <div className="pilot-modal" role="dialog" aria-modal="true">
      <div className="pilot-modal__overlay" onClick={onCancel} />
      <div className="pilot-modal__content pilot-modal__content--compact">
        <header className="pilot-modal__header">
          <h3 className="text-lg font-bold">{title}</h3>
        </header>
        <p className="text-sm opacity-85">{description}</p>
        <div className="pilot-modal__footer">
          <button type="button" className="pilot-btn" onClick={onCancel} disabled={loading}>
            Cancelar
          </button>
          <button type="button" className="pilot-btn pilot-btn--danger" onClick={() => void onConfirm()} disabled={loading}>
            {loading ? "Procesando..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

