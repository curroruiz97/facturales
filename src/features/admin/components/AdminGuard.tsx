import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Shield } from "lucide-react";
import { useAuth } from "../../../app/providers/AuthProvider";
import { AdminDashboardService } from "../services/AdminDashboardService";

interface AdminGuardProps {
  children: React.ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps): import("react").JSX.Element {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    void AdminDashboardService.isAdmin().then(setIsAdmin);
  }, [user]);

  if (authLoading || (user && isAdmin === null)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <Shield className="h-8 w-8 animate-pulse text-orange-500" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Verificando permisos de administrador...</p>
        </div>
      </div>
    );
  }

  if (!user || isAdmin === false) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
