import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import logoColor from "../../../assets/images/logo/logo-color.svg";
import logoShort from "../../../assets/images/logo/logo-short.svg";
import logoWhite from "../../../assets/images/logo/logo-white.svg";
import { useAuth } from "../providers/AuthProvider";
import { SHELL_NAVIGATION, isNavigationItemActive, normalizePath, type NavigationItem } from "../routing/route-metadata";

function ChevronRightIcon(): import("react").JSX.Element {
  return (
    <svg viewBox="0 0 16 16" aria-hidden>
      <path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SidebarIcon({ id }: { id: string }): import("react").JSX.Element {
  switch (id) {
    case "dashboard":
      return (
        <svg viewBox="0 0 18 21" aria-hidden>
          <path className="path-1" d="M0 8.8C0 8 0.36 7.2 1 6.6L6.34 1.86C7.86 .52 10.14 .52 11.66 1.86L17 6.6C17.63 7.2 18 8 18 8.8V17c0 2.2-1.8 4-4 4H4c-2.2 0-4-1.8-4-4V8.8Z" />
          <path className="path-2" d="M5 17c0-2.2 1.8-4 4-4s4 1.8 4 4v4H5v-4Z" />
        </svg>
      );
    case "facturas":
      return (
        <svg viewBox="0 0 20 20" aria-hidden>
          <circle className="path-1" cx="10" cy="10" r="9" />
          <path className="path-2" d="M10 5.5V14.5M5.5 10H14.5" strokeLinecap="round" />
        </svg>
      );
    case "presupuestos":
      return (
        <svg viewBox="0 0 20 22" aria-hidden>
          <path className="path-1" d="M3 0C1.3 0 0 1.3 0 3v16c0 1.7 1.3 3 3 3h14c1.7 0 3-1.3 3-3V7l-7-7H3Z" />
          <path className="path-2" d="M5 12h6M5 16h4M14 11l-1.5 4h3L14 19" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "gastos":
      return (
        <svg viewBox="0 0 20 20" aria-hidden>
          <path className="path-1" d="M2 6c0-2.2 1.8-4 4-4h8c2.2 0 4 1.8 4 4v8c0 2.2-1.8 4-4 4H6c-2.2 0-4-1.8-4-4V6Z" />
          <path className="path-2" d="M6 10h8M6 7h3" strokeLinecap="round" />
        </svg>
      );
    case "contactos":
      return (
        <svg viewBox="0 0 24 24" aria-hidden>
          <ellipse className="path-1" cx="12" cy="17.5" rx="8" ry="4.5" />
          <circle className="path-2" cx="12" cy="7" r="4.5" />
        </svg>
      );
    case "productos":
      return (
        <svg viewBox="0 0 24 24" aria-hidden>
          <path className="path-1" d="M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.7Z" />
          <path className="path-2" d="M3.3 7 12 12l8.7-5M12 22.1V12" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "fiscal":
      return (
        <svg viewBox="0 0 24 24" aria-hidden>
          <path className="path-1" d="M3 3c0-1.1.9-2 2-2h10l6 6v14c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V3Z" />
          <path className="path-2" d="M8 9h3M8 13h8M8 17h5M15 1v5c0 1.1.9 2 2 2h4" strokeLinecap="round" />
        </svg>
      );
    case "integraciones":
      return (
        <svg viewBox="0 0 24 24" aria-hidden>
          <path className="path-1" d="M8 2v3M16 2v3M3.5 9h17M21 8.5V17c0 3-1.5 5-5 5H8c-3.5 0-5-2-5-5V8.5c0-3 1.5-5 5-5h8c3.5 0 5 2 5 5Z" fill="none" strokeWidth="1.6" />
          <path className="path-2" d="M8.3 13.7h.01M12 13.7h.01M15.7 13.7h.01M8.3 16.7h.01M12 16.7h.01M15.7 16.7h.01" strokeLinecap="round" strokeWidth="2.3" />
        </svg>
      );
    case "soporte":
      return (
        <svg viewBox="0 0 20 18" aria-hidden>
          <path className="path-1" d="M5 2c0-1.1.9-2 2-2h11c1.1 0 2 .9 2 2v9c0 1.1-.9 2-2 2H7c-1.1 0-2-.9-2-2V2Z" />
          <path className="path-2" d="M0 15c0-1.1.9-2 2-2h6c1.1 0 2 .9 2 2v1c0 1.1-.9 2-2 2H2c-1.1 0-2-.9-2-2v-1Z" />
        </svg>
      );
    case "ajustes":
      return (
        <svg viewBox="0 0 16 16" aria-hidden>
          <path className="path-1" d="M8.85 0H7.15c-.94 0-1.7.72-1.7 1.6 0 1.01-1.08 1.65-1.97 1.17l-.09-.05a1.68 1.68 0 0 0-2.32.59L.23 4.69a1.6 1.6 0 0 0 .62 2.19c.89.48.89 1.76 0 2.24a1.6 1.6 0 0 0-.62 2.19l.85 1.39a1.68 1.68 0 0 0 2.32.58l.09-.05c.89-.48 1.97.16 1.97 1.17 0 .88.76 1.6 1.7 1.6h1.7c.94 0 1.7-.72 1.7-1.6 0-1.01 1.08-1.65 1.97-1.17l.09.05a1.68 1.68 0 0 0 2.32-.58l.85-1.39a1.6 1.6 0 0 0-.62-2.19c-.89-.48-.89-1.76 0-2.24a1.6 1.6 0 0 0 .62-2.19l-.85-1.39a1.68 1.68 0 0 0-2.32-.59l-.09.05c-.89.49-1.97-.16-1.97-1.17 0-.88-.76-1.6-1.7-1.6Z" />
          <path className="path-2" d="M11 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        </svg>
      );
    case "logout":
      return (
        <svg viewBox="0 0 21 18" aria-hidden>
          <path className="path-2" d="M17.1 10.44a.75.75 0 0 0 1.06 1.06l1.3-1.3a1.75 1.75 0 0 0 0-2.47l-1.3-1.3a.75.75 0 1 0-1.06 1.06l.72.73h-6.07a.75.75 0 0 0 0 1.5h6.07l-.72.72Z" />
          <path className="path-1" d="M4.75 17.75H12c2.62 0 4.75-2.13 4.75-4.75a.75.75 0 0 0-1.5 0A3.25 3.25 0 0 1 12 16.25H8.21a4.71 4.71 0 0 1-3.46 1.5ZM8.21 1.75H12A3.25 3.25 0 0 1 15.25 5a.75.75 0 0 0 1.5 0A4.75 4.75 0 0 0 12 .25H4.75a4.71 4.71 0 0 1 3.46 1.5Z" />
          <path className="path-1" d="M0 5C0 2.38 2.13.25 4.75.25S9.5 2.38 9.5 5v8c0 2.62-2.13 4.75-4.75 4.75S0 15.62 0 13V5Z" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 20 20" aria-hidden>
          <circle className="path-1" cx="10" cy="10" r="9" />
          <circle className="path-2" cx="10" cy="10" r="4" />
        </svg>
      );
  }
}

interface SidebarGroupProps {
  title: string;
  items: NavigationItem[];
  currentPath: string;
  collapsed: boolean;
  onSignOut: () => Promise<void>;
  signingOut: boolean;
  expandedItemId: string | null;
  onToggleItem: (itemId: string) => void;
  onFlyoutEnter: (itemId: string, rect: DOMRect) => void;
  onFlyoutLeave: () => void;
  onTooltipEnter: (label: string, rect: DOMRect) => void;
  onTooltipLeave: () => void;
}

function SidebarGroup({
  title,
  items,
  currentPath,
  collapsed,
  onSignOut,
  signingOut,
  expandedItemId,
  onToggleItem,
  onFlyoutEnter,
  onFlyoutLeave,
  onTooltipEnter,
  onTooltipLeave,
}: SidebarGroupProps): import("react").JSX.Element {
  return (
    <section className="pilot-sidebar__group">
      <h4>{title}</h4>
      <ul>
        {items.map((item) => {
          const childActive = (item.children ?? []).some((child) => isNavigationItemActive(currentPath, child.href));
          const parentActive = isNavigationItemActive(currentPath, item.href) || childActive;
          const hasChildren = Boolean(item.children?.length);
          const isExpanded = hasChildren ? expandedItemId === item.id : false;

          const handleMouseEnter = collapsed
            ? (event: React.MouseEvent<HTMLLIElement>) => {
                const rect = event.currentTarget.getBoundingClientRect();
                onTooltipEnter(item.id === "logout" ? (signingOut ? "Cerrando..." : item.label) : item.label, rect);
                if (hasChildren) onFlyoutEnter(item.id, rect);
              }
            : undefined;

          const handleMouseLeave = collapsed
            ? () => { onTooltipLeave(); if (hasChildren) onFlyoutLeave(); }
            : undefined;

          return (
            <li
              key={item.id}
              className={`pilot-sidebar__item ${parentActive ? "pilot-sidebar__item--active" : ""}`}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              {item.id === "logout" ? (
                <button
                  type="button"
                  onClick={() => void onSignOut()}
                  disabled={signingOut}
                  className="pilot-sidebar__link pilot-sidebar__button"
                                  >
                  <span className="pilot-sidebar__icon">
                    <SidebarIcon id={item.id} />
                  </span>
                  <span>{signingOut ? "Cerrando..." : item.label}</span>
                </button>
              ) : hasChildren ? (
                <div className="pilot-sidebar__parent-row">
                  <NavLink className="pilot-sidebar__link" to={item.href} >
                    <span className="pilot-sidebar__icon">
                      <SidebarIcon id={item.id} />
                    </span>
                    <span>{item.label}</span>
                  </NavLink>
                  {collapsed ? null : (
                    <button
                      type="button"
                      className={`pilot-sidebar__expander ${isExpanded ? "pilot-sidebar__expander--open" : ""}`}
                      onClick={() => onToggleItem(item.id)}
                      aria-label={isExpanded ? `Ocultar submenu de ${item.label}` : `Mostrar submenu de ${item.label}`}
                    >
                      <ChevronRightIcon />
                    </button>
                  )}
                </div>
              ) : (
                <NavLink className="pilot-sidebar__link" to={item.href} >
                  <span className="pilot-sidebar__icon">
                    <SidebarIcon id={item.id} />
                  </span>
                  <span>{item.label}</span>
                </NavLink>
              )}

              {hasChildren && isExpanded ? (
                <ul className="pilot-sidebar__submenu">
                  {(item.children ?? []).map((child) => (
                    <li key={child.id}>
                      <NavLink to={child.href} className={({ isActive }) => `pilot-sidebar__sublink ${isActive ? "pilot-sidebar__sublink--active" : ""}`}>
                        {child.label}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

interface SidebarProps {
  currentPath: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen?: boolean;
}

export function Sidebar({ currentPath, collapsed, onToggleCollapse, mobileOpen }: SidebarProps): import("react").JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const activePath = normalizePath(location.pathname || currentPath);

  const [flyoutItemId, setFlyoutItemId] = useState<string | null>(null);
  const [flyoutPos, setFlyoutPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const flyoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sidebarRef = useRef<HTMLElement>(null);

  const [tooltip, setTooltip] = useState<{ label: string; top: number; left: number } | null>(null);

  const menuItems = useMemo(() => SHELL_NAVIGATION.filter((item) => item.section === "menu"), []);
  const helpItems = useMemo(() => SHELL_NAVIGATION.filter((item) => item.section === "ayuda"), []);
  const otherItems = useMemo(() => SHELL_NAVIGATION.filter((item) => item.section === "otros"), []);

  const flyoutItem = useMemo(
    () => (flyoutItemId ? SHELL_NAVIGATION.find((n) => n.id === flyoutItemId) : null),
    [flyoutItemId],
  );

  useEffect(() => {
    const activeParent = SHELL_NAVIGATION.find((item) => {
      if (!item.children?.length) return false;
      return isNavigationItemActive(activePath, item.href) || item.children.some((child) => isNavigationItemActive(activePath, child.href));
    });
    if (activeParent) {
      setExpandedItemId((previous) => (previous === activeParent.id ? previous : activeParent.id));
    }
  }, [activePath]);

  useEffect(() => {
    if (!collapsed) setFlyoutItemId(null);
  }, [collapsed]);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      navigate("/signin", { replace: true });
    } finally {
      setSigningOut(false);
    }
  };

  const toggleItem = (itemId: string) => {
    setExpandedItemId((previous) => (previous === itemId ? null : itemId));
  };

  const handleFlyoutEnter = useCallback((itemId: string, rect: DOMRect) => {
    if (flyoutTimerRef.current) {
      clearTimeout(flyoutTimerRef.current);
      flyoutTimerRef.current = null;
    }
    const sidebarRect = sidebarRef.current?.getBoundingClientRect();
    const left = sidebarRect ? sidebarRect.right + 6 : rect.right + 6;
    setFlyoutPos({ top: rect.top, left });
    setFlyoutItemId(itemId);
  }, []);

  const handleFlyoutLeave = useCallback(() => {
    flyoutTimerRef.current = setTimeout(() => {
      setFlyoutItemId(null);
    }, 150);
  }, []);

  const handleFlyoutPanelEnter = useCallback(() => {
    if (flyoutTimerRef.current) {
      clearTimeout(flyoutTimerRef.current);
      flyoutTimerRef.current = null;
    }
  }, []);

  const handleFlyoutPanelLeave = useCallback(() => {
    setFlyoutItemId(null);
  }, []);

  const handleTooltipEnter = useCallback((label: string, rect: DOMRect) => {
    const sidebarRect = sidebarRef.current?.getBoundingClientRect();
    const left = sidebarRect ? sidebarRect.right + 12 : rect.right + 12;
    setTooltip({ label, top: rect.top + rect.height / 2, left });
  }, []);

  const handleTooltipLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  return (
    <aside ref={sidebarRef} className={`pilot-sidebar ${collapsed ? "pilot-sidebar--collapsed" : ""} ${mobileOpen ? "pilot-sidebar--mobile-open" : ""}`} aria-label="Navegacion principal">
      <header className="pilot-sidebar__header">
        <NavLink to="/dashboard" className="pilot-sidebar__brand" aria-label="Facturales">
          <img src={logoColor} className="pilot-sidebar__logo pilot-sidebar__logo--light" alt="Facturales" />
          <img src={logoWhite} className="pilot-sidebar__logo pilot-sidebar__logo--dark" alt="Facturales" />
          <img src={logoShort} className="pilot-sidebar__logo-short" alt="Facturales" />
        </NavLink>
        <button
          type="button"
          className="pilot-sidebar__collapse"
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Expandir navegación lateral" : "Contraer navegación lateral"}
        >
          <svg viewBox="0 0 10 16" fill="none" aria-hidden>
            <path d="M7 2L3 8L7 14" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </header>

      <div className="pilot-sidebar__body">
        <SidebarGroup
          title={"Men\u00FA"}
          items={menuItems}
          currentPath={activePath}
          collapsed={collapsed}
          onSignOut={handleSignOut}
          signingOut={signingOut}
          expandedItemId={expandedItemId}
          onToggleItem={toggleItem}
          onFlyoutEnter={handleFlyoutEnter}
          onFlyoutLeave={handleFlyoutLeave}
          onTooltipEnter={handleTooltipEnter}
          onTooltipLeave={handleTooltipLeave}
        />
        <SidebarGroup
          title="Ayuda"
          items={helpItems}
          currentPath={activePath}
          collapsed={collapsed}
          onSignOut={handleSignOut}
          signingOut={signingOut}
          expandedItemId={expandedItemId}
          onToggleItem={toggleItem}
          onFlyoutEnter={handleFlyoutEnter}
          onFlyoutLeave={handleFlyoutLeave}
          onTooltipEnter={handleTooltipEnter}
          onTooltipLeave={handleTooltipLeave}
        />
        <SidebarGroup
          title="Otros"
          items={otherItems}
          currentPath={activePath}
          collapsed={collapsed}
          onSignOut={handleSignOut}
          signingOut={signingOut}
          expandedItemId={expandedItemId}
          onToggleItem={toggleItem}
          onFlyoutEnter={handleFlyoutEnter}
          onFlyoutLeave={handleFlyoutLeave}
          onTooltipEnter={handleTooltipEnter}
          onTooltipLeave={handleTooltipLeave}
        />
      </div>

      {collapsed && tooltip ? createPortal(
        <div
          className="pilot-sidebar__tooltip"
          style={{ top: tooltip.top, left: tooltip.left }}
        >
          {tooltip.label}
        </div>,
        document.body,
      ) : null}

      {collapsed && flyoutItem?.children?.length ? createPortal(
        <div
          className="pilot-sidebar__flyout"
          style={{ top: flyoutPos.top, left: flyoutPos.left }}
          onMouseEnter={handleFlyoutPanelEnter}
          onMouseLeave={handleFlyoutPanelLeave}
        >
          {flyoutItem.children.map((child) => (
            <NavLink
              key={child.id}
              to={child.href}
              className={isNavigationItemActive(activePath, child.href) ? "pilot-sidebar__flyout-link--active" : ""}
              onClick={() => setFlyoutItemId(null)}
            >
              {child.label}
            </NavLink>
          ))}
        </div>,
        document.body,
      ) : null}
    </aside>
  );
}
