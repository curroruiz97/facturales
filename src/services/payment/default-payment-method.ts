import type { PaymentMethod } from "../../shared/types/domain";
import { getCurrentUserId, getSupabaseClient } from "../supabase/client";

const STORAGE_KEY = "facturales_default_payment_method";

export interface DefaultPaymentMethod {
  type: PaymentMethod["type"];
  iban: string;
  phone: string;
  label: string;
}

function writeLocalStorage(method: DefaultPaymentMethod | null): void {
  try {
    if (method) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(method));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // silently ignore
  }
}

function readLocalStorage(): DefaultPaymentMethod | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DefaultPaymentMethod;
    if (!parsed.type) return null;
    return parsed;
  } catch {
    return null;
  }
}

function normalizeFromDb(value: unknown): DefaultPaymentMethod | null {
  if (!value || typeof value !== "object") return null;
  // business_info.default_payment_method es un array JSONB según la migración.
  // Tomamos el primer elemento si existe.
  const arr = Array.isArray(value) ? value : [value];
  const first = arr[0] as Partial<DefaultPaymentMethod> | null;
  if (!first || typeof first !== "object" || !first.type) return null;
  return {
    type: first.type as PaymentMethod["type"],
    iban: typeof first.iban === "string" ? first.iban : "",
    phone: typeof first.phone === "string" ? first.phone : "",
    label: typeof first.label === "string" ? first.label : "",
  };
}

/**
 * Guarda el método de pago predeterminado en `business_info.default_payment_method`
 * (persistente, sincronizado entre dispositivos) y también en localStorage como
 * fallback inmediato para prefill sin round-trip a Supabase.
 */
export async function saveDefaultPaymentMethod(method: DefaultPaymentMethod): Promise<boolean> {
  writeLocalStorage(method);
  try {
    const userId = await getCurrentUserId();
    if (!userId) return false;
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("business_info")
      .update({ default_payment_method: [method] })
      .eq("user_id", userId);
    if (error) {
      console.warn("saveDefaultPaymentMethod error:", error.message);
      return false;
    }
    return true;
  } catch (error) {
    console.warn("saveDefaultPaymentMethod failed:", error);
    return false;
  }
}

/**
 * Variante síncrona compatible con código legacy que solo usa localStorage.
 * El nuevo `saveDefaultPaymentMethod` async se prefiere y persiste en Supabase.
 */
export function saveDefaultPaymentMethodSync(method: DefaultPaymentMethod): void {
  writeLocalStorage(method);
  // Dispara el save async en background sin bloquear
  void saveDefaultPaymentMethod(method).catch(() => undefined);
}

/**
 * Carga el método predeterminado. Primero intenta la BD (fuente real);
 * si falla o está vacía, cae al localStorage para no romper UX offline.
 */
export async function loadDefaultPaymentMethodFromDB(): Promise<DefaultPaymentMethod | null> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return readLocalStorage();
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("business_info")
      .select("default_payment_method")
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !data) return readLocalStorage();
    const fromDb = normalizeFromDb(data.default_payment_method);
    if (fromDb) {
      writeLocalStorage(fromDb);
      return fromDb;
    }
    return readLocalStorage();
  } catch {
    return readLocalStorage();
  }
}

/**
 * Versión síncrona legacy — lee solo localStorage.
 * Usada por flujos existentes que no quieren convertirse en async.
 */
export function loadDefaultPaymentMethod(): DefaultPaymentMethod | null {
  return readLocalStorage();
}
