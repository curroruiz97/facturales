import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Shield, LayoutDashboard, Users, CreditCard, Package, DollarSign,
  Activity, Mail, HeartPulse, ScrollText, Flag, Settings,
  Menu, X, ChevronRight, Moon, Sun,
} from "lucide-react";
import { AdminDashboardService } from "../services/AdminDashboardService";

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ElementType;
  section: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "overview", label: "Overview", href: "/admin", icon: LayoutDashboard, section: "Principal" },
  { id: "users", label: "Usuarios", href: "/admin/users", icon: Users, section: "Gestion" },
  { id: "subscriptions", label: "Suscripciones", href: "/admin/subscriptions", icon: CreditCard, section: "Gestion" },
  { id: "plans", label: "Planes", href: "/admin/plans", icon: Package, section: "Gestion" },
  { id: "finance", label: "Finanzas", href: "/admin/finance", icon: DollarSign, section: "Analytics" },
  { id: "api-usage", label: "Uso de API", href: "/admin/api-usage", icon: Activity, section: "Analytics" },
  { id: "email", label: "Email", href: "/admin/email-analytics", icon: Mail, section: "Analytics" },
  { id: "system", label: "System Health", href: "/admin/system", icon: HeartPulse, section: "Sistema" },
  { id: "logs", label: "Logs", href: "/admin/logs", icon: ScrollText, section: "Sistema" },
  { id: "flags", label: "Feature Flags", href: "/admin/feature-flags", icon: Flag, section: "Sistema" },
  { id: "config", label: "Configuracion", href: "/admin/config", icon: Settings, section: "Sistema" },
];

const SECTIONS = ["Principal", "Gestion", "Analytics", "Sistema"];

function isActive(currentPath: string, href: string): boolean {
  if (href === "/admin") return currentPath === "/admin";
  return currentPath.startsWith(href);
}

function getActiveLabel(pathname: string): string {
  const item = NAV_ITEMS.find((n) =>
    n.href === "/admin" ? pathname === "/admin" : pathname.startsWith(n.href)
  );
  return item?.label ?? "Admin";
}

export function AdminLayout({ children }: { children: React.ReactNode }): import("react").JSX.Element {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    void AdminDashboardService.getAdminRole().then(setRole);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const activeLabel = getActiveLabel(location.pathname);

  /* ------------------------------------------------------------------ */
  /*  Sidebar content (shared between desktop aside and mobile drawer)  */
  /* ------------------------------------------------------------------ */
  const sidebarNav = (
    <>
      <nav className="flex-1 overflow-y-auto px-3 py-5">
        {SECTIONS.map((section, sectionIdx) => {
          const items = NAV_ITEMS.filter((item) => item.section === section);
          if (!items.length) return null;
          return (
            <div key={section} className="mb-1">
              {/* Separator line between sections (skip before first) */}
              {sectionIdx > 0 && (
                <div className="mx-3 mb-3 mt-2 border-t border-slate-200/70 dark:border-slate-700/50" />
              )}

              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400/80 dark:text-slate-500/80">
                {section}
              </p>

              <div className="space-y-0.5">
                {items.map((item) => {
                  const active = isActive(location.pathname, item.href);
                  return (
                    <Link
                      key={item.id}
                      to={item.href}
                      className={[
                        "group relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-all duration-150",
                        active
                          ? "border-l-[3px] border-orange-500 bg-orange-50/80 pl-[calc(0.75rem-3px)] text-orange-700 dark:border-orange-400 dark:bg-orange-500/10 dark:text-orange-300"
                          : "border-l-[3px] border-transparent pl-[calc(0.75rem-3px)] text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700/40 dark:hover:text-slate-200",
                      ].join(" ")}
                    >
                      <item.icon
                        className={[
                          "h-4 w-4 flex-shrink-0 transition-colors duration-150",
                          active
                            ? "text-orange-500 dark:text-orange-400"
                            : "text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300",
                        ].join(" ")}
                      />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Sidebar footer */}
      <div className="border-t border-slate-200/70 px-4 py-3 dark:border-slate-700/50">
        <p className="text-[10px] font-medium tracking-wide text-slate-400/70 dark:text-slate-600">
          Facturales Admin v2.0
        </p>
      </div>
    </>
  );

  /* ------------------------------------------------------------------ */
  /*  Render                                                            */
  /* ------------------------------------------------------------------ */
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-900">
      {/* Top gradient accent line */}
      <div className="h-[3px] w-full bg-gradient-to-r from-orange-500 via-orange-400 to-amber-400" />

      {/* ----- Top bar ----- */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:border-slate-700/60 dark:bg-slate-800/95 dark:supports-[backdrop-filter]:bg-slate-800/80">
        <div className="flex h-14 items-center justify-between px-4 sm:px-6">
          {/* Left cluster */}
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 shadow-sm shadow-orange-500/20">
              <Shield className="h-4 w-4 text-white" />
            </div>

            <div className="flex items-center gap-2.5">
              <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white sm:text-base">
                Admin Control Center
              </h1>

              {/* Live indicator */}
              <span className="hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 sm:inline-flex">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                Live
              </span>

              {role ? (
                <span className="hidden rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 sm:inline-flex">
                  {role}
                </span>
              ) : null}
            </div>
          </div>

          {/* Right cluster */}
          <div className="flex items-center gap-3">
            <span className="hidden text-sm font-semibold text-slate-700 dark:text-slate-200 sm:inline">Admin</span>

            {/* Dark mode toggle */}
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-slate-600 dark:hover:text-slate-200"
              onClick={() => document.documentElement.classList.toggle("dark")}
              aria-label="Alternar tema oscuro"
            >
              <Moon className="h-4 w-4 dark:hidden" />
              <Sun className="hidden h-4 w-4 dark:block" />
            </button>

            <Link
              to="/dashboard"
              className="hidden items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 dark:hover:text-white sm:inline-flex"
            >
              <ChevronRight className="h-3 w-3 rotate-180" />
              Volver al dashboard
            </Link>

            <button
              type="button"
              className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200 md:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Breadcrumb strip */}
        <div className="flex items-center gap-1.5 border-t border-slate-100 px-4 py-1.5 text-[11px] text-slate-400 dark:border-slate-700/40 dark:text-slate-500 sm:px-6">
          <span>Admin</span>
          <ChevronRight className="h-3 w-3" />
          <span className="font-medium text-slate-600 dark:text-slate-300">{activeLabel}</span>
        </div>
      </header>

      {/* ----- Mobile drawer ----- */}
      {mobileOpen ? (
        <div className="animate-in slide-in-from-top-2 z-30 border-b border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800 md:hidden">
          {sidebarNav}

          <div className="border-t border-slate-200 px-4 py-3 dark:border-slate-700">
            <Link
              to="/dashboard"
              className="flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              <ChevronRight className="h-4 w-4 rotate-180" />
              Volver al dashboard
            </Link>
          </div>
        </div>
      ) : null}

      {/* ----- Body ----- */}
      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside className="hidden w-56 flex-shrink-0 flex-col border-r border-slate-200/80 bg-white dark:border-slate-700/60 dark:bg-slate-800 md:flex lg:w-64">
          {sidebarNav}
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
