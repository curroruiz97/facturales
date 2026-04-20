import { useEffect, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

interface AdminConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
  requireConfirmation?: string;
}

export function AdminConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirmar",
  destructive = false,
  requireConfirmation,
}: AdminConfirmDialogProps): import("react").JSX.Element | null {
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);

  // Animate in on open
  useEffect(() => {
    if (open) {
      // Force a frame so the initial state renders before the transition starts
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
    } else {
      setVisible(false);
    }
  }, [open]);

  if (!open) return null;

  const canConfirm =
    !requireConfirmation || confirmText === requireConfirmation;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
      setConfirmText("");
      onClose();
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-200 ${
        visible ? "bg-black/50 backdrop-blur-sm" : "bg-transparent"
      }`}
      onClick={onClose}
    >
      <div
        className={`w-full max-w-md rounded-2xl border bg-white p-6 shadow-2xl transition-all duration-200 ${
          visible
            ? "scale-100 opacity-100"
            : "scale-95 opacity-0"
        } ${
          destructive
            ? "border-red-200 dark:border-red-500/20"
            : "border-slate-200 dark:border-slate-700"
        } dark:bg-slate-800`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-4">
          <div
            className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full ${
              destructive
                ? "bg-gradient-to-br from-red-50 to-red-100 ring-1 ring-red-200 dark:from-red-500/15 dark:to-red-600/10 dark:ring-red-500/25"
                : "bg-gradient-to-br from-amber-50 to-amber-100 ring-1 ring-amber-200 dark:from-amber-500/15 dark:to-amber-600/10 dark:ring-amber-500/25"
            }`}
          >
            <AlertTriangle
              className={`h-5 w-5 ${
                destructive
                  ? "text-red-600 dark:text-red-400"
                  : "text-amber-600 dark:text-amber-400"
              }`}
            />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              {title}
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              {description}
            </p>
          </div>
        </div>

        {/* Confirmation input */}
        {requireConfirmation ? (
          <div className="mt-5">
            <p className="mb-2 text-sm text-slate-600 dark:text-slate-300">
              Escribe{" "}
              <code className="rounded bg-red-50 px-1.5 py-0.5 font-mono text-xs font-bold text-red-600 ring-1 ring-red-100 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/20">
                {requireConfirmation}
              </code>{" "}
              para confirmar:
            </p>
            <input
              type="text"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm transition-colors duration-150 placeholder:text-slate-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/20 dark:border-slate-600 dark:bg-slate-700/50 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-orange-500 dark:focus:ring-orange-500/20"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={requireConfirmation}
              autoFocus
            />
          </div>
        ) : null}

        {/* Destructive warning strip */}
        {destructive ? (
          <div className="mt-4 rounded-lg border border-red-100 bg-red-50/60 px-3 py-2 dark:border-red-500/15 dark:bg-red-500/5">
            <p className="text-xs font-medium text-red-600 dark:text-red-400">
              Esta accion es irreversible y no se puede deshacer.
            </p>
          </div>
        ) : null}

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-all duration-150 hover:bg-slate-50 active:scale-[0.98] disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={!canConfirm || loading}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-150 active:scale-[0.98] disabled:opacity-50 ${
              destructive
                ? "bg-red-600 shadow-red-600/20 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500"
                : "bg-orange-500 shadow-orange-500/20 hover:bg-orange-600 dark:bg-orange-500 dark:hover:bg-orange-400"
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
