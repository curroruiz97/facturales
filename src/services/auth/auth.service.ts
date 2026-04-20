import type { Session, User } from "@supabase/supabase-js";
import { getSupabaseClient, waitForLegacySupabaseAuthReady } from "../supabase/client";
import { fail, ok, type ServiceResult } from "../../shared/types/service-result";

export interface SignInInput {
  email: string;
  password: string;
}

export interface SignUpInput {
  email: string;
  password: string;
  metadata?: Record<string, unknown>;
}

export interface AuthStateChangePayload {
  event: string;
  session: Session | null;
}

export interface AuthService {
  signIn(input: SignInInput): Promise<ServiceResult<{ user: User; session: Session }>>;
  signUp(input: SignUpInput): Promise<ServiceResult<{ user: User | null; session: Session | null }>>;
  signInWithGoogle(redirectPath?: string): Promise<ServiceResult<{ url: string | null }>>;
  signOut(): Promise<ServiceResult<null>>;
  getCurrentUser(): Promise<ServiceResult<User | null>>;
  getCurrentSession(): Promise<ServiceResult<Session | null>>;
  onAuthStateChange(cb: (payload: AuthStateChangePayload) => void): Promise<ServiceResult<{ unsubscribe: () => void }>>;
  getUserProvider(): Promise<ServiceResult<"google" | "email" | "unknown">>;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function inferProvider(user: User | null): "google" | "email" | "unknown" {
  if (!user) {
    return "unknown";
  }

  if (Array.isArray(user.identities) && user.identities.length > 0) {
    const providers = user.identities.map((identity) => identity.provider);
    if (providers.includes("google")) return "google";
    if (providers.includes("email")) return "email";
    return (providers[0] as "google" | "email" | undefined) ?? "unknown";
  }

  const metadataProviders = user.app_metadata?.providers;
  if (Array.isArray(metadataProviders)) {
    if (metadataProviders.includes("google")) return "google";
    if (metadataProviders.includes("email")) return "email";
  }

  return "unknown";
}

export class LegacyCompatibleAuthService implements AuthService {
  async signIn(input: SignInInput): Promise<ServiceResult<{ user: User; session: Session }>> {
    try {
      if (!input.email?.trim()) {
        return fail("El email es obligatorio", "VALIDATION_EMAIL_REQUIRED");
      }
      if (!input.password) {
        return fail("La contraseña es obligatoria", "VALIDATION_PASSWORD_REQUIRED");
      }

      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizeEmail(input.email),
        password: input.password,
      });

      if (error || !data.user || !data.session) {
        return fail(error?.message ?? "Error al iniciar sesión", error?.code, error);
      }

      return ok({ user: data.user, session: data.session });
    } catch (error) {
      return fail("No se pudo iniciar sesión", "AUTH_SIGNIN_ERROR", error);
    }
  }

  async signUp(input: SignUpInput): Promise<ServiceResult<{ user: User | null; session: Session | null }>> {
    try {
      if (!input.email?.trim()) {
        return fail("El email es obligatorio", "VALIDATION_EMAIL_REQUIRED");
      }
      if (!input.password || input.password.length < 8) {
        return fail("La contraseña debe tener al menos 8 caracteres", "VALIDATION_PASSWORD_MIN_LENGTH");
      }

      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.signUp({
        email: normalizeEmail(input.email),
        password: input.password,
        options: {
          data: input.metadata ?? {},
          emailRedirectTo: `${window.location.origin}/confirm-email`,
        },
      });

      if (error) {
        return fail(error.message, error.code, error);
      }

      return ok({ user: data.user, session: data.session });
    } catch (error) {
      return fail("No se pudo registrar el usuario", "AUTH_SIGNUP_ERROR", error);
    }
  }

  async signInWithGoogle(redirectPath = "/signin"): Promise<ServiceResult<{ url: string | null }>> {
    try {
      const supabase = getSupabaseClient();
      const normalizedPath = redirectPath.startsWith("/") ? redirectPath : `/${redirectPath}`;
      const redirectTo = new URL(normalizedPath, window.location.origin).toString();

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
        },
      });

      if (error) {
        return fail(error.message, error.code, error);
      }

      return ok({ url: data.url ?? null });
    } catch (error) {
      return fail("No se pudo iniciar sesión con Google", "AUTH_GOOGLE_SIGNIN_ERROR", error);
    }
  }

  async signOut(): Promise<ServiceResult<null>> {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signOut();
      if (error) {
        return fail(error.message, error.code, error);
      }
      return ok(null);
    } catch (error) {
      return fail("No se pudo cerrar sesión", "AUTH_SIGNOUT_ERROR", error);
    }
  }

  async getCurrentUser(): Promise<ServiceResult<User | null>> {
    try {
      await waitForLegacySupabaseAuthReady();
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        return fail(error.message, error.code, error);
      }
      return ok(data.user ?? null);
    } catch (error) {
      return fail("No se pudo resolver la sesión actual", "AUTH_CURRENT_USER_ERROR", error);
    }
  }

  async getCurrentSession(): Promise<ServiceResult<Session | null>> {
    try {
      await waitForLegacySupabaseAuthReady();
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        return fail(error.message, error.code, error);
      }
      return ok(data.session ?? null);
    } catch (error) {
      return fail("No se pudo recuperar la sesión", "AUTH_CURRENT_SESSION_ERROR", error);
    }
  }

  async onAuthStateChange(
    cb: (payload: AuthStateChangePayload) => void,
  ): Promise<ServiceResult<{ unsubscribe: () => void }>> {
    try {
      const supabase = getSupabaseClient();
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        cb({ event, session });
      });

      return ok({
        unsubscribe: () => data.subscription.unsubscribe(),
      });
    } catch (error) {
      return fail("No se pudo registrar listener de autenticación", "AUTH_LISTENER_ERROR", error);
    }
  }

  async getUserProvider(): Promise<ServiceResult<"google" | "email" | "unknown">> {
    const userResult = await this.getCurrentUser();
    if (!userResult.success) {
      return fail(userResult.error.message, userResult.error.code, userResult.error.cause);
    }
    return ok(inferProvider(userResult.data));
  }
}

export const authService = new LegacyCompatibleAuthService();
