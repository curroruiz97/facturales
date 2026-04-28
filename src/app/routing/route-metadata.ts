export interface RouteMeta {
  id: string;
  path: string;
  title: string;
  section: string;
  requiresAuth: boolean;
  requiresSubscription: boolean;
  breadcrumbs: string[];
  showGlobalSearch: boolean;
  shellVariant: "react-app" | "public";
}

export interface NavigationChild {
  id: string;
  label: string;
  href: string;
}

export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  section: "menu" | "ayuda" | "otros";
  children?: NavigationChild[];
}

const DEFAULT_CANONICAL_ROUTE = "/dashboard";

const ROUTE_METADATA: RouteMeta[] = [
  {
    id: "dashboard",
    path: "/dashboard",
    title: "Panel de control",
    section: "Dashboard",
    requiresAuth: true,
    requiresSubscription: true,
    breadcrumbs: ["Inicio", "Panel de control"],
    showGlobalSearch: true,
    shellVariant: "react-app",
  },
  {
    id: "productos",
    path: "/productos",
    title: "Productos",
    section: "Productos",
    requiresAuth: true,
    requiresSubscription: true,
    breadcrumbs: ["Inicio", "Productos"],
    showGlobalSearch: true,
    shellVariant: "react-app",
  },
  {
    id: "contactos",
    path: "/contactos",
    title: "Contactos",
    section: "Contactos",
    requiresAuth: true,
    requiresSubscription: true,
    breadcrumbs: ["Inicio", "Contactos"],
    showGlobalSearch: true,
    shellVariant: "react-app",
  },
  {
    id: "transacciones",
    path: "/transacciones",
    title: "Transacciones",
    section: "Transacciones",
    requiresAuth: true,
    requiresSubscription: true,
    breadcrumbs: ["Inicio", "Transacciones"],
    showGlobalSearch: true,
    shellVariant: "react-app",
  },
  {
    id: "presupuestos",
    path: "/presupuestos",
    title: "Presupuestos",
    section: "Presupuestos",
    requiresAuth: true,
    requiresSubscription: true,
    breadcrumbs: ["Inicio", "Presupuestos"],
    showGlobalSearch: true,
    shellVariant: "react-app",
  },
  {
    id: "presupuestos-emision",
    path: "/presupuestos/emision",
    title: "Emitir presupuesto",
    section: "Presupuestos",
    requiresAuth: true,
    requiresSubscription: true,
    breadcrumbs: ["Inicio", "Presupuestos", "Emisión"],
    showGlobalSearch: true,
    shellVariant: "react-app",
  },
  {
    id: "presupuestos-borradores",
    path: "/presupuestos/borradores",
    title: "Borradores de presupuestos",
    section: "Presupuestos",
    requiresAuth: true,
    requiresSubscription: true,
    breadcrumbs: ["Presupuestos", "Borradores"],
    showGlobalSearch: true,
    shellVariant: "react-app",
  },
  {
    id: "presupuestos-vista-previa",
    path: "/presupuestos/vista-previa",
    title: "Vista previa de presupuesto",
    section: "Presupuestos",
    requiresAuth: true,
    requiresSubscription: true,
    breadcrumbs: ["Presupuestos", "Vista previa"],
    showGlobalSearch: true,
    shellVariant: "react-app",
  },
  {
    id: "presupuestos-emitidos",
    path: "/presupuestos/emitidos",
    title: "Presupuestos emitidos",
    section: "Presupuestos",
    requiresAuth: true,
    requiresSubscription: true,
    breadcrumbs: ["Presupuestos", "Emitidos"],
    showGlobalSearch: true,
    shellVariant: "react-app",
  },
  {
    id: "facturas",
    path: "/facturas",
    title: "Facturas",
    section: "Facturas",
    requiresAuth: true,
    requiresSubscription: true,
    breadcrumbs: ["Inicio", "Facturas"],
    showGlobalSearch: true,
    shellVariant: "react-app",
  },
  {
    id: "facturas-emision",
    path: "/facturas/emision",
    title: "Emitir factura",
    section: "Facturas",
    requiresAuth: true,
    requiresSubscription: true,
    breadcrumbs: ["Inicio", "Facturas", "Emisión"],
    showGlobalSearch: true,
    shellVariant: "react-app",
  },
  {
    id: "facturas-borradores",
    path: "/facturas/borradores",
    title: "Borradores de facturas",
    section: "Facturas",
    requiresAuth: true,
    requiresSubscription: true,
    breadcrumbs: ["Facturas", "Borradores"],
    showGlobalSearch: true,
    shellVariant: "react-app",
  },
  {
    id: "facturas-vista-previa",
    path: "/facturas/vista-previa",
    title: "Vista previa de factura",
    section: "Facturas",
    requiresAuth: true,
    requiresSubscription: true,
    breadcrumbs: ["Facturas", "Vista previa"],
    showGlobalSearch: true,
    shellVariant: "react-app",
  },
  {
    id: "facturas-emitidas",
    path: "/facturas/emitidas",
    title: "Facturas emitidas",
    section: "Facturas",
    requiresAuth: true,
    requiresSubscription: true,
    breadcrumbs: ["Facturas", "Emitidas"],
    showGlobalSearch: true,
    shellVariant: "react-app",
  },
  {
    id: "facturas-importar",
    path: "/facturas/importar",
    title: "Importar facturas",
    section: "Facturas",
    requiresAuth: true,
    requiresSubscription: true,
    breadcrumbs: ["Facturas", "Importar"],
    showGlobalSearch: true,
    shellVariant: "react-app",
  },
  {
    id: "ocr",
    path: "/ocr",
    title: "Escanear gasto",
    section: "OCR",
    requiresAuth: true,
    requiresSubscription: true,
    breadcrumbs: ["Transacciones", "Escanear gasto"],
    showGlobalSearch: true,
    shellVariant: "react-app",
  },
  {
    id: "soporte",
    path: "/soporte",
    title: "Soporte",
    section: "Soporte",
    requiresAuth: true,
    requiresSubscription: true,
    breadcrumbs: ["Ayuda", "Soporte"],
    showGlobalSearch: true,
    shellVariant: "react-app",
  },
  {
    id: "ajustes",
    path: "/ajustes",
    title: "Configuración",
    section: "Ajustes",
    requiresAuth: true,
    requiresSubscription: false,
    breadcrumbs: ["Ajustes", "Configuración"],
    showGlobalSearch: true,
    shellVariant: "react-app",
  },
  {
    id: "integraciones",
    path: "/integraciones",
    title: "Integraciones",
    section: "Integraciones",
    requiresAuth: true,
    requiresSubscription: false,
    breadcrumbs: ["Ayuda", "Integraciones"],
    showGlobalSearch: true,
    shellVariant: "react-app",
  },
  {
    id: "fiscal",
    path: "/fiscal",
    title: "Resumen fiscal",
    section: "Fiscal",
    requiresAuth: true,
    requiresSubscription: false,
    breadcrumbs: ["Inicio", "Resumen fiscal"],
    showGlobalSearch: true,
    shellVariant: "react-app",
  },
  {
    id: "signin",
    path: "/signin",
    title: "Iniciar sesión",
    section: "Acceso",
    requiresAuth: false,
    requiresSubscription: false,
    breadcrumbs: ["Acceso", "Iniciar sesión"],
    showGlobalSearch: false,
    shellVariant: "public",
  },
  {
    id: "signup",
    path: "/signup",
    title: "Registro",
    section: "Acceso",
    requiresAuth: false,
    requiresSubscription: false,
    breadcrumbs: ["Acceso", "Registro"],
    showGlobalSearch: false,
    shellVariant: "public",
  },
  {
    id: "verify-email",
    path: "/verify-email",
    title: "Verifica tu correo",
    section: "Acceso",
    requiresAuth: false,
    requiresSubscription: false,
    breadcrumbs: ["Acceso", "Verificación"],
    showGlobalSearch: false,
    shellVariant: "public",
  },
  {
    id: "confirm-email",
    path: "/confirm-email",
    title: "Confirmación de correo",
    section: "Acceso",
    requiresAuth: false,
    requiresSubscription: false,
    breadcrumbs: ["Acceso", "Confirmación"],
    showGlobalSearch: false,
    shellVariant: "public",
  },
  {
    id: "reset-password",
    path: "/reset-password",
    title: "Restablecer contraseña",
    section: "Acceso",
    requiresAuth: false,
    requiresSubscription: false,
    breadcrumbs: ["Acceso", "Reset password"],
    showGlobalSearch: false,
    shellVariant: "public",
  },
  {
    id: "complete-profile",
    path: "/complete-profile",
    title: "Completar perfil",
    section: "Acceso",
    requiresAuth: true,
    requiresSubscription: false,
    breadcrumbs: ["Acceso", "Completar perfil"],
    showGlobalSearch: false,
    shellVariant: "public",
  },
  {
    id: "subscribe",
    path: "/subscribe",
    title: "Suscripción",
    section: "Billing",
    requiresAuth: true,
    requiresSubscription: false,
    breadcrumbs: ["Billing", "Suscripción"],
    showGlobalSearch: false,
    shellVariant: "public",
  },
  {
    id: "planes",
    path: "/planes",
    title: "Elige tu plan",
    section: "Billing",
    requiresAuth: true,
    requiresSubscription: false,
    breadcrumbs: ["Billing", "Planes"],
    showGlobalSearch: false,
    shellVariant: "public",
  },
  {
    id: "billing-success",
    path: "/billing/success",
    title: "Pago completado",
    section: "Billing",
    requiresAuth: false,
    requiresSubscription: false,
    breadcrumbs: ["Billing", "Éxito"],
    showGlobalSearch: false,
    shellVariant: "public",
  },
  {
    id: "billing-cancel",
    path: "/billing/cancel",
    title: "Pago cancelado",
    section: "Billing",
    requiresAuth: false,
    requiresSubscription: false,
    breadcrumbs: ["Billing", "Cancelado"],
    showGlobalSearch: false,
    shellVariant: "public",
  },
  {
    id: "aviso-legal",
    path: "/aviso-legal",
    title: "Aviso legal",
    section: "Legal",
    requiresAuth: false,
    requiresSubscription: false,
    breadcrumbs: ["Legal", "Aviso legal"],
    showGlobalSearch: false,
    shellVariant: "public",
  },
  {
    id: "condiciones-legales",
    path: "/condiciones-legales",
    title: "Condiciones legales",
    section: "Legal",
    requiresAuth: false,
    requiresSubscription: false,
    breadcrumbs: ["Legal", "Condiciones"],
    showGlobalSearch: false,
    shellVariant: "public",
  },
  {
    id: "politica-de-cookies",
    path: "/politica-de-cookies",
    title: "Política de cookies",
    section: "Legal",
    requiresAuth: false,
    requiresSubscription: false,
    breadcrumbs: ["Legal", "Cookies"],
    showGlobalSearch: false,
    shellVariant: "public",
  },
  {
    id: "politica-de-privacidad",
    path: "/politica-de-privacidad",
    title: "Política de privacidad",
    section: "Legal",
    requiresAuth: false,
    requiresSubscription: false,
    breadcrumbs: ["Legal", "Privacidad"],
    showGlobalSearch: false,
    shellVariant: "public",
  },
];

const LEGACY_ALIASES: Record<string, string> = {
  "/index.html": "/dashboard",
  "/home.html": "/dashboard",
  "/index-2.html": "/dashboard",
  "/coming-soon.html": "/dashboard",
  "/404.html": "/dashboard",
  "/pilot-dashboard.html": "/dashboard",
  "/productos.html": "/productos",
  "/pilot-products.html": "/productos",
  "/users.html": "/contactos",
  "/pilot-contacts.html": "/contactos",
  "/expenses.html": "/transacciones",
  "/pilot-transactions.html": "/transacciones",
  "/invoices/quote.html": "/presupuestos/emision",
  "/invoices/quote-drafts.html": "/presupuestos/borradores",
  "/invoices/quote-issued.html": "/presupuestos/emitidos",
  "/invoices/quote-preview.html": "/presupuestos/vista-previa",
  "/pilot-quotes.html": "/presupuestos/emision",
  "/invoices/new.html": "/facturas/emision",
  "/invoices/drafts.html": "/facturas/borradores",
  "/invoices/issued.html": "/facturas/emitidas",
  "/invoices/preview.html": "/facturas/vista-previa",
  "/invoices/facturas-recibidas.html": "/facturas/emitidas",
  "/pilot-invoices.html": "/facturas/emision",
  "/scan-ocr.html": "/ocr",
  "/pilot-ocr.html": "/ocr",
  "/support-ticket.html": "/soporte",
  "/pilot-support.html": "/soporte",
  "/settings.html": "/ajustes",
  "/integrations.html": "/integraciones",
  "/fiscal.html": "/fiscal",
  "/signin.html": "/signin",
  "/signup.html": "/signup",
  "/verify-email.html": "/verify-email",
  "/confirm-email.html": "/confirm-email",
  "/reset-password.html": "/reset-password",
  "/complete-profile.html": "/complete-profile",
  "/subscribe.html": "/subscribe",
  "/billing/success.html": "/billing/success",
  "/billing/cancel.html": "/billing/cancel",
  "/aviso-legal.html": "/aviso-legal",
  "/condiciones-legales.html": "/condiciones-legales",
  "/politica-de-cookies.html": "/politica-de-cookies",
  "/politica-de-privacidad.html": "/politica-de-privacidad",
};

export const LEGACY_REDIRECTS = Object.entries(LEGACY_ALIASES).map(([source, destination]) => ({ source, destination }));

export const SHELL_NAVIGATION: NavigationItem[] = [
  { id: "dashboard", label: "Panel de control", href: "/dashboard", section: "menu" },
  {
    id: "facturas",
    label: "Facturas",
    href: "/facturas/emision",
    section: "menu",
    children: [
      { id: "facturas-emision", label: "Emitir factura", href: "/facturas/emision" },
      { id: "facturas-borradores", label: "Borradores", href: "/facturas/borradores" },
      { id: "facturas-emitidas", label: "Facturas emitidas", href: "/facturas/emitidas" },
      { id: "facturas-importar", label: "Importar facturas", href: "/facturas/importar" },
    ],
  },
  {
    id: "presupuestos",
    label: "Presupuestos",
    href: "/presupuestos/emision",
    section: "menu",
    children: [
      { id: "presupuestos-emision", label: "Emitir presupuesto", href: "/presupuestos/emision" },
      { id: "presupuestos-borradores", label: "Borradores", href: "/presupuestos/borradores" },
      { id: "presupuestos-emitidos", label: "Presupuestos emitidos", href: "/presupuestos/emitidos" },
    ],
  },
  {
    id: "transacciones-grupo",
    label: "Transacciones",
    href: "/transacciones",
    section: "menu",
    children: [
      { id: "transacciones", label: "Todas", href: "/transacciones" },
      { id: "transacciones-ingresos", label: "Ingresos", href: "/transacciones?tipo=ingreso" },
      { id: "transacciones-gastos", label: "Gastos", href: "/transacciones?tipo=gasto" },
      { id: "ocr", label: "Escanear gasto", href: "/ocr" },
    ],
  },
  { id: "contactos", label: "Contactos", href: "/contactos", section: "menu" },
  { id: "productos", label: "Productos", href: "/productos", section: "menu" },
  { id: "fiscal", label: "Resumen Fiscal", href: "/fiscal", section: "menu" },
  { id: "integraciones", label: "Integraciones", href: "/integraciones", section: "ayuda" },
  { id: "soporte", label: "Soporte", href: "/soporte", section: "ayuda" },
  { id: "ajustes", label: "Configuraci\u00F3n", href: "/ajustes", section: "ayuda" },
  { id: "logout", label: "Cerrar sesi\u00F3n", href: "/signin", section: "otros" },
];

export function normalizePath(pathname: string): string {
  const trimmed = pathname.trim();
  if (!trimmed) {
    return "/";
  }

  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  const withoutTrailingSlash = withLeadingSlash.endsWith("/") && withLeadingSlash !== "/" ? withLeadingSlash.slice(0, -1) : withLeadingSlash;
  return withoutTrailingSlash;
}

export function resolveCanonicalPath(pathname: string): string {
  const normalized = normalizePath(pathname);
  if (normalized === "/") {
    return DEFAULT_CANONICAL_ROUTE;
  }

  const alias = LEGACY_ALIASES[normalized];
  if (alias) return alias;

  if (normalized.endsWith(".html")) {
    const withoutExt = normalizePath(normalized.slice(0, -5));
    return withoutExt === "/" ? DEFAULT_CANONICAL_ROUTE : withoutExt;
  }

  if (normalized === "/facturas") {
    return "/facturas/emision";
  }

  if (normalized === "/presupuestos") {
    return "/presupuestos/emision";
  }

  return normalized;
}

export function resolveSafeRedirectPath(requestedPath: string | null | undefined, fallbackPath = DEFAULT_CANONICAL_ROUTE): string {
  const fallback = isKnownRoute(fallbackPath) ? resolveCanonicalPath(fallbackPath) : DEFAULT_CANONICAL_ROUTE;
  if (!requestedPath) {
    return fallback;
  }

  const trimmed = requestedPath.trim();
  if (!trimmed || !trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return fallback;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed, "https://facturales.local");
  } catch {
    return fallback;
  }

  if (parsed.origin !== "https://facturales.local") {
    return fallback;
  }

  const canonicalPath = resolveCanonicalPath(parsed.pathname);
  if (!isKnownRoute(canonicalPath)) {
    return fallback;
  }

  return `${canonicalPath}${parsed.search}${parsed.hash}`;
}

export function resolveRouteMeta(pathname: string): RouteMeta {
  const canonical = resolveCanonicalPath(pathname);
  const match = ROUTE_METADATA.find((route) => normalizePath(route.path) === canonical);
  if (match) return match;

  return {
    id: "not-found",
    path: canonical,
    title: "Ruta no encontrada",
    section: "Sistema",
    requiresAuth: false,
    requiresSubscription: false,
    breadcrumbs: ["Sistema", "404"],
    showGlobalSearch: false,
    shellVariant: "public",
  };
}

export function isKnownRoute(pathname: string): boolean {
  const canonical = resolveCanonicalPath(pathname);
  return ROUTE_METADATA.some((route) => normalizePath(route.path) === canonical);
}

export function isNavigationItemActive(currentPath: string, href: string): boolean {
  const normalizedCurrent = normalizePath(currentPath);
  const normalizedHref = normalizePath(href);
  if (normalizedCurrent === normalizedHref) {
    return true;
  }

  return normalizedCurrent.startsWith(`${normalizedHref}/`);
}
