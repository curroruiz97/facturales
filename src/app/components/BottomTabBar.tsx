import { useLocation, useNavigate } from "react-router-dom";
import { isNavigationItemActive } from "../routing/route-metadata";
import { DashboardIcon, ContactsIcon, PlusIcon, ExpensesIcon, MoreGridIcon } from "./NavIcons";

interface BottomTabBarProps {
  onQuickAction: () => void;
  onMore: () => void;
  moreOpen: boolean;
}

interface TabDef {
  id: string;
  label: string;
  href: string;
  icon: () => import("react").JSX.Element;
  matchPaths?: string[];
}

const TABS: TabDef[] = [
  { id: "inicio", label: "Inicio", href: "/dashboard", icon: DashboardIcon },
  { id: "contactos", label: "Contactos", href: "/contactos", icon: ContactsIcon },
  { id: "nuevo", label: "Nuevo", href: "", icon: PlusIcon },
  { id: "gastos", label: "Gastos", href: "/transacciones", icon: ExpensesIcon, matchPaths: ["/transacciones", "/ocr"] },
  { id: "mas", label: "Mas", href: "", icon: MoreGridIcon },
];

export function BottomTabBar({ onQuickAction, onMore, moreOpen }: BottomTabBarProps): import("react").JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();

  function isActive(tab: TabDef): boolean {
    if (!tab.href) return false;
    if (isNavigationItemActive(location.pathname, tab.href)) return true;
    return (tab.matchPaths ?? []).some((p) => location.pathname.startsWith(p));
  }

  function handleTap(tab: TabDef): void {
    if (tab.id === "nuevo") {
      onQuickAction();
      return;
    }
    if (tab.id === "mas") {
      onMore();
      return;
    }
    navigate(tab.href);
  }

  return (
    <nav className="pilot-tab-bar" aria-label="Navegacion principal movil">
      {TABS.map((tab) => {
        const active = tab.id === "mas" ? moreOpen : isActive(tab);
        const isCenter = tab.id === "nuevo";
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            type="button"
            className={`pilot-tab-bar__item ${active ? "pilot-tab-bar__item--active" : ""} ${isCenter ? "pilot-tab-bar__item--center" : ""}`}
            onClick={() => handleTap(tab)}
            aria-label={tab.label}
            aria-current={active ? "page" : undefined}
          >
            <span className={`pilot-tab-bar__icon ${isCenter ? "pilot-tab-bar__icon--fab" : ""}`}>
              <Icon />
            </span>
            <span className="pilot-tab-bar__label">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
