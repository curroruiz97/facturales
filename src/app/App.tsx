import { lazy, Suspense, type JSX } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { AppShell } from "./layouts/AppShell";
import { LoadingSkeleton } from "./components/states/LoadingSkeleton";
import {
  BillingCancelPage,
  BillingSuccessPage,
  CompleteProfilePage,
  ConfirmEmailPage,
  LegalPage,
  NotFoundPage,
  PlansPage,
  ResetPasswordPage,
  SignInPage,
  SignUpPage,
  SubscribePage,
  VerifyEmailPage,
} from "./pages/AppPages";
import { AuthProvider } from "./providers/AuthProvider";
import { ProtectedRoute } from "./routing/protected-route";
import { normalizePath, resolveCanonicalPath, resolveRouteMeta } from "./routing/route-metadata";
import { SubscriptionRoute } from "./routing/subscription-route";
const ContactsPage = lazy(() => import("../features/contacts/pages/ContactsPage").then((m) => ({ default: m.ContactsPage })));
const DashboardPage = lazy(() => import("../features/dashboard/pages/DashboardPage").then((m) => ({ default: m.DashboardPage })));
const InvoicesPage = lazy(() => import("../features/invoices/pages/InvoicesPage").then((m) => ({ default: m.InvoicesPage })));
const OcrPage = lazy(() => import("../features/ocr/pages/OcrPage").then((m) => ({ default: m.OcrPage })));
const ProductsPage = lazy(() => import("../features/products/pages/ProductsPage").then((m) => ({ default: m.ProductsPage })));
const QuotesPage = lazy(() => import("../features/quotes/pages/QuotesPage").then((m) => ({ default: m.QuotesPage })));
const QuotePreviewPage = lazy(() => import("../features/quotes/pages/QuotePreviewPage").then((m) => ({ default: m.QuotePreviewPage })));
const SupportPage = lazy(() => import("../features/support/pages/SupportPage").then((m) => ({ default: m.SupportPage })));
const TransactionsPage = lazy(() => import("../features/transactions/pages/TransactionsPage").then((m) => ({ default: m.TransactionsPage })));
const SettingsPage = lazy(() => import("../features/settings/pages/SettingsPage").then((m) => ({ default: m.SettingsPage })));
const IntegrationsPage = lazy(() => import("../features/integrations/pages/IntegrationsPage").then((m) => ({ default: m.IntegrationsPage })));
const FiscalPage = lazy(() => import("../features/fiscal/pages/FiscalPage").then((m) => ({ default: m.FiscalPage })));
const InvoicePreviewPage = lazy(() => import("../features/invoices/pages/InvoicePreviewPage").then((m) => ({ default: m.InvoicePreviewPage })));
import { AdminGuard } from "../features/admin/components/AdminGuard";
import { AppErrorBoundary } from "./components/states/AppErrorBoundary";

const AdminOverview = lazy(() => import("../features/admin/pages/AdminOverview").then((m) => ({ default: m.AdminOverview })));
const AdminUsers = lazy(() => import("../features/admin/pages/AdminUsers").then((m) => ({ default: m.AdminUsers })));
const AdminUserDetail = lazy(() => import("../features/admin/pages/AdminUserDetail").then((m) => ({ default: m.AdminUserDetail })));
const AdminSubscriptions = lazy(() => import("../features/admin/pages/AdminSubscriptions").then((m) => ({ default: m.AdminSubscriptions })));
const AdminFinance = lazy(() => import("../features/admin/pages/AdminFinance").then((m) => ({ default: m.AdminFinance })));
const AdminApiUsage = lazy(() => import("../features/admin/pages/AdminApiUsage").then((m) => ({ default: m.AdminApiUsage })));
const AdminEmailAnalytics = lazy(() => import("../features/admin/pages/AdminEmailAnalytics").then((m) => ({ default: m.AdminEmailAnalytics })));
const AdminSystemHealth = lazy(() => import("../features/admin/pages/AdminSystemHealth").then((m) => ({ default: m.AdminSystemHealth })));
const AdminLogs = lazy(() => import("../features/admin/pages/AdminLogs").then((m) => ({ default: m.AdminLogs })));
const AdminFeatureFlags = lazy(() => import("../features/admin/pages/AdminFeatureFlags").then((m) => ({ default: m.AdminFeatureFlags })));
const AdminPlans = lazy(() => import("../features/admin/pages/AdminPlans").then((m) => ({ default: m.AdminPlans })));
const AdminConfig = lazy(() => import("../features/admin/pages/AdminConfig").then((m) => ({ default: m.AdminConfig })));

interface CanonicalRouteDefinition {
  path: string;
  element: JSX.Element;
}

const CANONICAL_ROUTES: CanonicalRouteDefinition[] = [
  { path: "/dashboard", element: <DashboardPage /> },
  { path: "/productos", element: <ProductsPage /> },
  { path: "/contactos", element: <ContactsPage /> },
  { path: "/transacciones", element: <TransactionsPage /> },
  { path: "/presupuestos", element: <Navigate to="/presupuestos/emision" replace /> },
  { path: "/presupuestos/emision", element: <QuotesPage mode="emision" /> },
  { path: "/presupuestos/vista-previa", element: <QuotePreviewPage /> },
  { path: "/presupuestos/borradores", element: <QuotesPage mode="borradores" /> },
  { path: "/presupuestos/emitidos", element: <QuotesPage mode="emitidos" /> },
  { path: "/facturas", element: <Navigate to="/facturas/emision" replace /> },
  { path: "/facturas/emision", element: <InvoicesPage mode="emision" /> },
  { path: "/facturas/vista-previa", element: <InvoicePreviewPage /> },
  { path: "/facturas/borradores", element: <InvoicesPage mode="borradores" /> },
  { path: "/facturas/emitidas", element: <InvoicesPage mode="emitidas" /> },
  { path: "/ocr", element: <OcrPage /> },
  { path: "/soporte", element: <SupportPage /> },
  { path: "/ajustes", element: <SettingsPage /> },
  { path: "/integraciones", element: <IntegrationsPage /> },
  { path: "/fiscal", element: <FiscalPage /> },
  { path: "/signin", element: <SignInPage /> },
  { path: "/signup", element: <SignUpPage /> },
  { path: "/verify-email", element: <VerifyEmailPage /> },
  { path: "/confirm-email", element: <ConfirmEmailPage /> },
  { path: "/reset-password", element: <ResetPasswordPage /> },
  { path: "/complete-profile", element: <CompleteProfilePage /> },
  { path: "/planes", element: <PlansPage /> },
  { path: "/subscribe", element: <SubscribePage /> },
  { path: "/billing/success", element: <BillingSuccessPage /> },
  { path: "/billing/cancel", element: <BillingCancelPage /> },
  { path: "/aviso-legal", element: <LegalPage path="/aviso-legal" /> },
  { path: "/condiciones-legales", element: <LegalPage path="/condiciones-legales" /> },
  { path: "/politica-de-cookies", element: <LegalPage path="/politica-de-cookies" /> },
  { path: "/politica-de-privacidad", element: <LegalPage path="/politica-de-privacidad" /> },
];

function RoutedPage({ path, element }: CanonicalRouteDefinition): JSX.Element {
  const route = resolveRouteMeta(path);
  const shellWrapped = route.shellVariant === "react-app" ? <AppShell route={route}>{element}</AppShell> : element;
  const subscriptionWrapped = route.requiresSubscription ? <SubscriptionRoute>{shellWrapped}</SubscriptionRoute> : shellWrapped;
  const authWrapped = route.requiresAuth ? <ProtectedRoute>{subscriptionWrapped}</ProtectedRoute> : subscriptionWrapped;
  return <Suspense fallback={<LoadingSkeleton />}>{authWrapped}</Suspense>;
}

function LegacyAliasFallback(): JSX.Element {
  const location = useLocation();
  const normalized = normalizePath(location.pathname);
  const canonical = resolveCanonicalPath(normalized);
  const currentBase = location.pathname;
  const targetBase = canonical;

  if (targetBase !== currentBase) {
    return <Navigate to={`${targetBase}${location.search}${location.hash}`} replace />;
  }

  return <NotFoundPage />;
}

function AdminSuspense({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><p className="text-sm text-slate-400">Cargando panel admin...</p></div>}>
      {children}
    </Suspense>
  );
}

function AppRoutes(): JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      {CANONICAL_ROUTES.map((definition) => (
        <Route
          key={definition.path}
          path={definition.path}
          element={<RoutedPage path={definition.path} element={definition.element} />}
        />
      ))}
      <Route path="/admin" element={<ProtectedRoute><AdminGuard><AdminSuspense><AdminOverview /></AdminSuspense></AdminGuard></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute><AdminGuard><AdminSuspense><AdminUsers /></AdminSuspense></AdminGuard></ProtectedRoute>} />
      <Route path="/admin/users/:userId" element={<ProtectedRoute><AdminGuard><AdminSuspense><AdminUserDetail /></AdminSuspense></AdminGuard></ProtectedRoute>} />
      <Route path="/admin/subscriptions" element={<ProtectedRoute><AdminGuard><AdminSuspense><AdminSubscriptions /></AdminSuspense></AdminGuard></ProtectedRoute>} />
      <Route path="/admin/plans" element={<ProtectedRoute><AdminGuard><AdminSuspense><AdminPlans /></AdminSuspense></AdminGuard></ProtectedRoute>} />
      <Route path="/admin/finance" element={<ProtectedRoute><AdminGuard><AdminSuspense><AdminFinance /></AdminSuspense></AdminGuard></ProtectedRoute>} />
      <Route path="/admin/api-usage" element={<ProtectedRoute><AdminGuard><AdminSuspense><AdminApiUsage /></AdminSuspense></AdminGuard></ProtectedRoute>} />
      <Route path="/admin/email-analytics" element={<ProtectedRoute><AdminGuard><AdminSuspense><AdminEmailAnalytics /></AdminSuspense></AdminGuard></ProtectedRoute>} />
      <Route path="/admin/system" element={<ProtectedRoute><AdminGuard><AdminSuspense><AdminSystemHealth /></AdminSuspense></AdminGuard></ProtectedRoute>} />
      <Route path="/admin/logs" element={<ProtectedRoute><AdminGuard><AdminSuspense><AdminLogs /></AdminSuspense></AdminGuard></ProtectedRoute>} />
      <Route path="/admin/feature-flags" element={<ProtectedRoute><AdminGuard><AdminSuspense><AdminFeatureFlags /></AdminSuspense></AdminGuard></ProtectedRoute>} />
      <Route path="/admin/config" element={<ProtectedRoute><AdminGuard><AdminSuspense><AdminConfig /></AdminSuspense></AdminGuard></ProtectedRoute>} />
      <Route path="*" element={<LegacyAliasFallback />} />
    </Routes>
  );
}

export function App(): JSX.Element {
  return (
    <AppErrorBoundary>
      <AuthProvider>
        <AppRoutes />
        <Toaster position="top-right" richColors closeButton />
      </AuthProvider>
    </AppErrorBoundary>
  );
}