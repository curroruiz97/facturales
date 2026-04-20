import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface LegacyRepositoriesBridge {
  clients: {
    create: (...args: unknown[]) => unknown;
    list: (...args: unknown[]) => unknown;
    getById: (...args: unknown[]) => unknown;
    update: (...args: unknown[]) => unknown;
    remove: (...args: unknown[]) => unknown;
  };
  transactions: {
    create: (...args: unknown[]) => unknown;
    list: (...args: unknown[]) => unknown;
    getById: (...args: unknown[]) => unknown;
    update: (...args: unknown[]) => unknown;
    remove: (...args: unknown[]) => unknown;
  };
  products: {
    create: (...args: unknown[]) => unknown;
    list: (...args: unknown[]) => unknown;
    getById: (...args: unknown[]) => unknown;
    update: (...args: unknown[]) => unknown;
    remove: (...args: unknown[]) => unknown;
  };
  invoices: {
    create: (...args: unknown[]) => unknown;
    list: (...args: unknown[]) => unknown;
    getById: (...args: unknown[]) => unknown;
    update: (...args: unknown[]) => unknown;
    remove: (...args: unknown[]) => unknown;
    emit: (...args: unknown[]) => unknown;
    togglePaid: (...args: unknown[]) => unknown;
  };
  quotes: {
    create: (...args: unknown[]) => unknown;
    list: (...args: unknown[]) => unknown;
    getById: (...args: unknown[]) => unknown;
    update: (...args: unknown[]) => unknown;
    remove: (...args: unknown[]) => unknown;
    emit: (...args: unknown[]) => unknown;
    togglePaid: (...args: unknown[]) => unknown;
  };
}

export interface FacturalesServicesNamespace {
  supabase?: {
    getClient: () => SupabaseClient;
    waitForAuthReady: (timeoutMs?: number) => Promise<unknown>;
  };
  auth?: Record<string, unknown>;
  billingLimits?: Record<string, unknown>;
  onboarding?: Record<string, unknown>;
  accessLog?: Record<string, unknown>;
  support?: Record<string, unknown>;
  ocr?: Record<string, unknown>;
  repositories?: LegacyRepositoriesBridge;
  meta?: {
    version: string;
    initializedAt: string;
  };
}

declare global {
  interface Window {
    supabaseClient?: SupabaseClient;
    supabaseAuthReady?: Promise<unknown>;
    facturalesServices?: FacturalesServicesNamespace;
  }
}

let cachedClient: SupabaseClient | null = null;

function resolveEnv(key: string): string | undefined {
  if (typeof import.meta !== "undefined" && import.meta.env) {
    const value = import.meta.env[key as keyof ImportMetaEnv];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  return undefined;
}

function resolveConfig() {
  const url = resolveEnv("VITE_SUPABASE_URL");
  const anonKey = resolveEnv("VITE_SUPABASE_ANON_KEY");
  if (!url || !anonKey) {
    throw new Error("Faltan VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY. Configura el entorno antes de iniciar la app.");
  }
  return { url, anonKey };
}

function fallbackClientFactory(): SupabaseClient {
  const { url, anonKey } = resolveConfig();
  return createClient(url, anonKey);
}

export function getSupabaseClient(win: Window | undefined = typeof window !== "undefined" ? window : undefined): SupabaseClient {
  if (win?.supabaseClient) {
    return win.supabaseClient;
  }

  if (cachedClient) {
    return cachedClient;
  }

  cachedClient = fallbackClientFactory();
  return cachedClient;
}

export async function waitForLegacySupabaseAuthReady(
  timeoutMs = 5000,
  win: Window | undefined = typeof window !== "undefined" ? window : undefined,
): Promise<unknown> {
  if (!win?.supabaseAuthReady) {
    return null;
  }

  const timeout = new Promise<null>((resolve) => {
    setTimeout(() => resolve(null), timeoutMs);
  });

  return Promise.race([win.supabaseAuthReady, timeout]);
}

export async function getCurrentUserId(
  win: Window | undefined = typeof window !== "undefined" ? window : undefined,
): Promise<string | null> {
  const supabase = getSupabaseClient(win);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return null;
  }
  return data.user.id;
}

export function getFacturalesServicesNamespace(
  win: Window | undefined = typeof window !== "undefined" ? window : undefined,
): FacturalesServicesNamespace | undefined {
  return win?.facturalesServices;
}
