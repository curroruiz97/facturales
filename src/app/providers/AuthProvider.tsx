import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import type { User } from "@supabase/supabase-js";
import { authService } from "../../services/auth/auth.service";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  error: string | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren): import("react").JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let unsubscribe: () => void = () => undefined;

    const init = async () => {
      // Subscribe to auth changes FIRST to avoid missing events during getCurrentUser().
      const authListener = await authService.onAuthStateChange(({ session }) => {
        if (!active) return;
        setUser(session?.user ?? null);
      });

      if (authListener.success) {
        unsubscribe = authListener.data.unsubscribe;
      }

      const currentUser = await authService.getCurrentUser();
      if (!active) return;

      if (currentUser.success) {
        setUser(currentUser.data);
        setError(null);
      } else {
        setError(currentUser.error.message);
      }
      setLoading(false);
    };

    void init();

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const contextValue = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      error,
      signOut: async () => {
        await authService.signOut();
      },
    }),
    [error, loading, user],
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
