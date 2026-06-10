import { useNavigate } from "react-router-dom";

interface QuickActionsProps {
  open: boolean;
  onClose: () => void;
}

function InvoiceActionIcon(): import("react").JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function QuoteActionIcon(): import("react").JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M14 2v6h6M8 13h3M8 17h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ScanActionIcon(): import("react").JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M7 12h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

const ACTIONS = [
  { id: "invoice", label: "Emitir factura", href: "/facturas/emision", icon: InvoiceActionIcon, iconClass: "pilot-action-sheet__icon--invoice" },
  { id: "quote", label: "Emitir presupuesto", href: "/presupuestos/emision", icon: QuoteActionIcon, iconClass: "pilot-action-sheet__icon--quote" },
  { id: "scan", label: "Escanear gasto", href: "/ocr", icon: ScanActionIcon, iconClass: "pilot-action-sheet__icon--scan" },
] as const;

export function QuickActions({ open, onClose }: QuickActionsProps): import("react").JSX.Element | null {
  const navigate = useNavigate();

  if (!open) return null;

  function handleAction(href: string): void {
    onClose();
    navigate(href);
  }

  return (
    <>
      <div className="pilot-action-sheet-backdrop" onClick={onClose} />
      <div className="pilot-action-sheet" role="dialog" aria-label="Acciones rapidas">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              type="button"
              className="pilot-action-sheet__item"
              onClick={() => handleAction(action.href)}
            >
              <span className={`pilot-action-sheet__icon ${action.iconClass}`}>
                <Icon />
              </span>
              {action.label}
            </button>
          );
        })}
      </div>
    </>
  );
}
