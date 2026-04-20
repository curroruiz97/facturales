interface TransactionDeleteModalProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function TransactionDeleteModal({
  open,
  title,
  description,
  confirmLabel,
  loading,
  onCancel,
  onConfirm,
}: TransactionDeleteModalProps): import("react").JSX.Element | null {
  if (!open) return null;

  return (
    <div className="pilot-modal" role="dialog" aria-modal="true" aria-labelledby="transaction-delete-title">
      <div className="pilot-modal__overlay" onClick={onCancel} />
      <div className="pilot-modal__content pilot-modal__content--compact">
        <header className="pilot-modal__header">
          <h3 id="transaction-delete-title" className="text-lg font-bold">
            {title}
          </h3>
        </header>
        <p className="mb-4 text-sm opacity-80">{description}</p>
        <div className="pilot-modal__footer">
          <button type="button" className="pilot-btn" onClick={onCancel} disabled={loading}>
            Cancelar
          </button>
          <button type="button" className="pilot-btn pilot-btn--danger" onClick={onConfirm} disabled={loading}>
            {loading ? "Procesando..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
