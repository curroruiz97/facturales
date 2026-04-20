import type { RouteMeta } from "../routing/route-metadata";
import { GlobalSearch } from "./GlobalSearch";
import { UserMenu } from "./UserMenu";

interface HeaderProps {
  route: RouteMeta;
  darkMode: boolean;
  onToggleTheme: () => void;
  onMobileMenuToggle: () => void;
}

function MoonIcon(): import("react").JSX.Element {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        d="M18.33 14.87c-5.08 0-9.2-4.12-9.2-9.2 0-.93.14-1.83.4-2.67A9 9 0 0 0 3 11.8C3 16.88 7.12 21 12.2 21a9 9 0 0 0 8.8-6.53 9.3 9.3 0 0 1-2.67.4Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SunIcon(): import("react").JSX.Element {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 2v2.5M12 19.5V22M20.66 7 18.9 8M5.1 16 3.34 17M3.34 7 5.1 8M18.9 16 20.66 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function HamburgerIcon(): import("react").JSX.Element {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Header({ route, darkMode, onToggleTheme, onMobileMenuToggle }: HeaderProps): import("react").JSX.Element {
  const isDashboard = route.path === "/dashboard";

  return (
    <header className={`pilot-header ${isDashboard ? "pilot-header--dashboard" : ""}`}>
      <div className="pilot-header__inner">
        <div className="pilot-header__left">
          <button
            type="button"
            className="pilot-header__hamburger"
            onClick={onMobileMenuToggle}
            aria-label="Abrir menú"
          >
            <HamburgerIcon />
          </button>
        </div>
        <div className="pilot-header__search">{route.showGlobalSearch ? <GlobalSearch /> : null}</div>
        <div className="pilot-header__actions">
          <button type="button" className="pilot-header__theme" onClick={onToggleTheme} aria-label={darkMode ? "Activar tema claro" : "Activar tema oscuro"}>
            {darkMode ? <SunIcon /> : <MoonIcon />}
          </button>
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
