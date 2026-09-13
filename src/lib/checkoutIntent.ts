import type { PlanFrequency, WavePlanId } from '@/lib/wave';

export type CheckoutIntent = {
  plan?: WavePlanId;
  frequency?: PlanFrequency;
  amount?: number;
  isTrial?: boolean;
  createdAt: number;
};

const INTENT_STORAGE_KEY = 'inventa.checkout_intent';
const INTENT_EXPIRY_MS = 60 * 60 * 1000; // 1 heure

export function saveCheckoutIntent(intent: Omit<CheckoutIntent, 'createdAt'>): void {
  try {
    const payload: CheckoutIntent = {
      ...intent,
      createdAt: Date.now(),
    };
    const serialized = JSON.stringify(payload);
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(INTENT_STORAGE_KEY, serialized);
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(INTENT_STORAGE_KEY, serialized);
    }
  } catch {
    // Ignore storage quota/permission issues
  }
}

export function getCheckoutIntent(): CheckoutIntent | null {
  try {
    if (typeof window === 'undefined') return null;
    const serialized =
      window.sessionStorage?.getItem(INTENT_STORAGE_KEY) ||
      window.localStorage?.getItem(INTENT_STORAGE_KEY);
    if (!serialized) return null;

    const parsed = JSON.parse(serialized) as CheckoutIntent;
    if (Date.now() - (parsed.createdAt || 0) > INTENT_EXPIRY_MS) {
      clearCheckoutIntent();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearCheckoutIntent(): void {
  try {
    if (typeof window !== 'undefined') {
      window.sessionStorage?.removeItem(INTENT_STORAGE_KEY);
      window.localStorage?.removeItem(INTENT_STORAGE_KEY);
    }
  } catch {
    // Ignore
  }
}
