import { useEffect, useState, type PropsWithChildren } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { LoadingSkeleton } from "../components/states/LoadingSkeleton";
import { subscriptionStatusService } from "../../services/subscription/subscription-status.service";

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1500;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function SubscriptionRoute({ children }: PropsWithChildren): import("react").JSX.Element {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [billingError, setBillingError] = useState(false);
  const location = useLocation();

  useEffect(() => {
    let active = true;

    const resolve = async () => {
      let lastError: unknown = null;

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        if (!active) return;
        if (attempt > 0) {
          await delay(RETRY_DELAY_MS * attempt);
          if (!active) return;
        }

        const result = await subscriptionStatusService.resolveStatus();
        if (!active) return;

        if (result.success) {
          setAllowed(result.data.hasAccess);
          setLoading(false);
          return;
        }

        lastError = result.error;
      }

      // All retries exhausted — deny access and show error instead of silently granting.
      console.error("[SubscriptionRoute] Billing check failed after retries.", lastError);
      setAllowed(false);
      setBillingError(true);
      setLoading(false);
    };

    void resolve();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <LoadingSkeleton message="Verificando suscripcion..." />;
  }

  if (billingError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-orange-400">
          <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
        </svg>
        <h2 className="text-lg font-semibold text-gray-200">Servicio temporalmente no disponible</h2>
        <p className="text-sm text-gray-400 max-w-md">No se pudo verificar tu suscripcion. Inténtalo de nuevo en unos momentos.</p>
        <button type="button" className="mt-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90 transition-opacity" onClick={() => window.location.reload()}>
          Reintentar
        </button>
      </div>
    );
  }

  if (!allowed) {
    const currentRoute = `${location.pathname}${location.search}`;
    const redirectTarget = `/subscribe?redirect=${encodeURIComponent(currentRoute)}`;
    return <Navigate to={redirectTarget} replace />;
  }

  return <>{children}</>;
}
