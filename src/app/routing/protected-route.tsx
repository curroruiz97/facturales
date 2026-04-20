import type { PropsWithChildren } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../providers/AuthProvider";
import { LoadingSkeleton } from "../components/states/LoadingSkeleton";

export function ProtectedRoute({ children }: PropsWithChildren): import("react").JSX.Element {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSkeleton message="Verificando sesión..." />;
  }

  if (!user) {
    const currentRoute = `${location.pathname}${location.search}`;
    const redirectTarget = `/signin?redirect=${encodeURIComponent(currentRoute)}`;
    return <Navigate to={redirectTarget} replace />;
  }

  return <>{children}</>;
}
