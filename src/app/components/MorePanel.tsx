import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../providers/AuthProvider";
import { isNavigationItemActive } from "../routing/route-metadata";
import { useState } from "react";

interface MorePanelProps {
  open: boolean;
  onClose: () => void;
}

interface MoreItem {
  id: string;
  label: string;
  href: string;
  icon: () => import("react").JSX.Element;
}

function FacturasIcon(): import("react").JSX.Element {
  return (
    <svg viewBox="0 0 20 20" aria-hidden>
      <circle className="path-1" cx="10" cy="10" r="9" />
      <path className="path-2" d="M10 5.5V14.5M5.5 10H14.5" strokeLinecap="round" />
    </svg>
  );
}

function QuotesIcon(): import("react").JSX.Element {
  return (
    <svg viewBox="0 0 20 22" aria-hidden>
      <path className="path-1" d="M3 0C1.3 0 0 1.3 0 3v16c0 1.7 1.3 3 3 3h14c1.7 0 3-1.3 3-3V7l-7-7H3Z" />
      <path className="path-2" d="M5 12h6M5 16h4M14 11l-1.5 4h3L14 19" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ContactsIcon(): import("react").JSX.Element {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <ellipse className="path-1" cx="12" cy="17.5" rx="8" ry="4.5" />
      <circle className="path-2" cx="12" cy="7" r="4.5" />
    </svg>
  );
}

function ProductsIcon(): import("react").JSX.Element {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path className="path-1" d="M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.7Z" />
      <path className="path-2" d="M3.3 7 12 12l8.7-5M12 22.1V12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FiscalIcon(): import("react").JSX.Element {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path className="path-1" d="M3 3c0-1.1.9-2 2-2h10l6 6v14c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V3Z" />
      <path className="path-2" d="M8 9h3M8 13h8M8 17h5M15 1v5c0 1.1.9 2 2 2h4" strokeLinecap="round" />
    </svg>
  );
}

function IntegrationsIcon(): import("react").JSX.Element {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path className="path-1" d="M8 2v3M16 2v3M3.5 9h17M21 8.5V17c0 3-1.5 5-5 5H8c-3.5 0-5-2-5-5V8.5c0-3 1.5-5 5-5h8c3.5 0 5 2 5 5Z" fill="none" strokeWidth="1.6" />
      <path className="path-2" d="M8.3 13.7h.01M12 13.7h.01M15.7 13.7h.01M8.3 16.7h.01M12 16.7h.01M15.7 16.7h.01" strokeLinecap="round" strokeWidth="2.3" />
    </svg>
  );
}

function SupportIcon(): import("react").JSX.Element {
  return (
    <svg viewBox="0 0 20 18" aria-hidden>
      <path className="path-1" d="M5 2c0-1.1.9-2 2-2h11c1.1 0 2 .9 2 2v9c0 1.1-.9 2-2 2H7c-1.1 0-2-.9-2-2V2Z" />
      <path className="path-2" d="M0 15c0-1.1.9-2 2-2h6c1.1 0 2 .9 2 2v1c0 1.1-.9 2-2 2H2c-1.1 0-2-.9-2-2v-1Z" />
    </svg>
  );
}

function SettingsIcon(): import("react").JSX.Element {
  return (
    <svg viewBox="0 0 16 16" aria-hidden>
      <path className="path-1" d="M8.85 0H7.15c-.94 0-1.7.72-1.7 1.6 0 1.01-1.08 1.65-1.97 1.17l-.09-.05a1.68 1.68 0 0 0-2.32.59L.23 4.69a1.6 1.6 0 0 0 .62 2.19c.89.48.89 1.76 0 2.24a1.6 1.6 0 0 0-.62 2.19l.85 1.39a1.68 1.68 0 0 0 2.32.58l.09-.05c.89-.48 1.97.16 1.97 1.17 0 .88.76 1.6 1.7 1.6h1.7c.94 0 1.7-.72 1.7-1.6 0-1.01 1.08-1.65 1.97-1.17l.09.05a1.68 1.68 0 0 0 2.32-.58l.85-1.39a1.6 1.6 0 0 0-.62-2.19c-.89-.48-.89-1.76 0-2.24a1.6 1.6 0 0 0 .62-2.19l-.85-1.39a1.68 1.68 0 0 0-2.32-.59l-.09.05c-.89.49-1.97-.16-1.97-1.17 0-.88-.76-1.6-1.7-1.6Z" />
      <path className="path-2" d="M11 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}

function LogoutIcon(): import("react").JSX.Element {
  return (
    <svg viewBox="0 0 21 18" aria-hidden>
      <path d="M17.1 10.44a.75.75 0 0 0 1.06 1.06l1.3-1.3a1.75 1.75 0 0 0 0-2.47l-1.3-1.3a.75.75 0 1 0-1.06 1.06l.72.73h-6.07a.75.75 0 0 0 0 1.5h6.07l-.72.72Z" fill="currentColor" />
      <path d="M4.75 17.75H12c2.62 0 4.75-2.13 4.75-4.75a.75.75 0 0 0-1.5 0A3.25 3.25 0 0 1 12 16.25H8.21a4.71 4.71 0 0 1-3.46 1.5ZM8.21 1.75H12A3.25 3.25 0 0 1 15.25 5a.75.75 0 0 0 1.5 0A4.75 4.75 0 0 0 12 .25H4.75a4.71 4.71 0 0 1 3.46 1.5Z" fill="currentColor" />
      <path d="M0 5C0 2.38 2.13.25 4.75.25S9.5 2.38 9.5 5v8c0 2.62-2.13 4.75-4.75 4.75S0 15.62 0 13V5Z" fill="currentColor" />
    </svg>
  );
}

const MORE_ITEMS: MoreItem[] = [
  { id: "facturas", label: "Facturas", href: "/facturas/emitidas", icon: FacturasIcon },
  { id: "presupuestos", label: "Presupuestos", href: "/presupuestos/emitidos", icon: QuotesIcon },
  { id: "productos", label: "Productos", href: "/productos", icon: ProductsIcon },
  { id: "fiscal", label: "Fiscal", href: "/fiscal", icon: FiscalIcon },
  { id: "integraciones", label: "Integraciones", href: "/integraciones", icon: IntegrationsIcon },
  { id: "soporte", label: "Soporte", href: "/soporte", icon: SupportIcon },
  { id: "ajustes", label: "Ajustes", href: "/ajustes", icon: SettingsIcon },
];

export function MorePanel({ open, onClose }: MorePanelProps): import("react").JSX.Element | null {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  if (!open) return null;

  function handleNav(href: string): void {
    onClose();
    navigate(href);
  }

  async function handleSignOut(): Promise<void> {
    setSigningOut(true);
    try {
      await signOut();
      onClose();
      navigate("/signin", { replace: true });
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <>
      <div className="pilot-action-sheet-backdrop" onClick={onClose} />
      <div className="pilot-more-panel" role="dialog" aria-label="Mas opciones">
        <div className="pilot-more-panel__handle" />
        <div className="pilot-more-panel__grid">
          {MORE_ITEMS.map((item) => {
            const active = isNavigationItemActive(location.pathname, item.href);
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                className={`pilot-more-panel__item ${active ? "pilot-more-panel__item--active" : ""}`}
                onClick={() => handleNav(item.href)}
              >
                <span className="pilot-more-panel__item-icon">
                  <Icon />
                </span>
                {item.label}
              </button>
            );
          })}
        </div>
        <div className="pilot-more-panel__divider" />
        <button
          type="button"
          className="pilot-more-panel__logout"
          onClick={() => void handleSignOut()}
          disabled={signingOut}
        >
          <span className="pilot-more-panel__logout-icon">
            <LogoutIcon />
          </span>
          {signingOut ? "Cerrando..." : "Cerrar sesion"}
        </button>
      </div>
    </>
  );
}
