import { useEffect, useState, type PropsWithChildren } from "react";
import { useLocation } from "react-router-dom";
import { BottomTabBar } from "../components/BottomTabBar";
import { Header } from "../components/Header";
import { MorePanel } from "../components/MorePanel";
import { QuickActions } from "../components/QuickActions";
import { Sidebar } from "../components/Sidebar";
import { usePlatform } from "../hooks/usePlatform";
import type { RouteMeta } from "../routing/route-metadata";

interface AppShellProps extends PropsWithChildren {
  route: RouteMeta;
}

function resolveInitialTheme(): boolean {
  const persistedTheme = localStorage.getItem("theme");
  if (persistedTheme === "dark") return true;
  if (persistedTheme === "light") return false;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

function resolveInitialSidebarCollapsed(): boolean {
  return localStorage.getItem("sidebar-collapsed") === "true";
}

export function AppShell({ route, children }: AppShellProps): import("react").JSX.Element {
  const [darkMode, setDarkMode] = useState<boolean>(() => resolveInitialTheme());
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => resolveInitialSidebarCollapsed());
  const [mobileOpen, setMobileOpen] = useState(false);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [morePanelOpen, setMorePanelOpen] = useState(false);
  const { isMobile } = usePlatform();
  const location = useLocation();

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      return;
    }
    document.documentElement.classList.remove("dark");
    localStorage.setItem("theme", "light");
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", sidebarCollapsed ? "true" : "false");
  }, [sidebarCollapsed]);

  useEffect(() => {
    setMobileOpen(false);
    setQuickActionsOpen(false);
    setMorePanelOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <div className={`pilot-shell ${isMobile ? "pilot-has-tab-bar" : ""}`}>
      <div className={`pilot-shell__layout ${sidebarCollapsed ? "pilot-shell__layout--sidebar-collapsed" : ""}`}>
        {mobileOpen ? <div className="pilot-sidebar-overlay" onClick={() => setMobileOpen(false)} /> : null}
        <Sidebar
          currentPath={route.path}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((previous) => !previous)}
          mobileOpen={mobileOpen}
        />
        <div className="pilot-content">
          <Header
            route={route}
            darkMode={darkMode}
            isMobile={isMobile}
            onToggleTheme={() => setDarkMode((prev) => !prev)}
            onMobileMenuToggle={() => setMobileOpen((prev) => !prev)}
          />
          <main className="pilot-main">{children}</main>
        </div>
      </div>
      {isMobile ? (
        <>
          <BottomTabBar
            onQuickAction={() => setQuickActionsOpen((prev) => !prev)}
            onMore={() => setMorePanelOpen((prev) => !prev)}
            moreOpen={morePanelOpen}
          />
          <QuickActions open={quickActionsOpen} onClose={() => setQuickActionsOpen(false)} />
          <MorePanel open={morePanelOpen} onClose={() => setMorePanelOpen(false)} />
        </>
      ) : null}
    </div>
  );
}
