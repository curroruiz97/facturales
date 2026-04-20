import type { PaymentMethod } from "../../shared/types/domain";

const STORAGE_KEY = "facturales_default_payment_method";

export interface DefaultPaymentMethod {
  type: PaymentMethod["type"];
  iban: string;
  phone: string;
  label: string;
}

export function saveDefaultPaymentMethod(method: DefaultPaymentMethod): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(method));
  } catch {
    // silently ignore
  }
}

export function loadDefaultPaymentMethod(): DefaultPaymentMethod | null {
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
