import { normalizeBusinessType, type BusinessType } from '@/lib/business';
import type { AppUser, Jewelry } from '@/types/api';

const SESSION_KEY = 'inventa-local-demo-session';
const INVENTORY_KEY = 'inventa-local-demo-inventory';
export const DEMO_PASSWORD = 'Demo@2026';

const accounts: Record<string, { type: BusinessType; name: string; company: string }> = {
  'bijouterie@demo.inventa.local': {
    type: 'jewelry',
    name: 'Awa Démo',
    company: 'Bijouterie Diamant',
  },
};

export const demoCredentials = Object.entries(accounts).map(([email, account]) => ({
  email,
  password: DEMO_PASSWORD,
  ...account,
}));

function isLocalDemoEnabled() {
  return import.meta.env.DEV && typeof window !== 'undefined';
}

function makeUser(email: string): AppUser | null {
  const account = accounts[email];
  if (!account) return null;
  return {
    id: `demo-${account.type}`,
    email,
    username: null,
    fullName: account.name,
    role: 'admin',
    companyId: `demo-company-${account.type}`,
    businessType: account.type,
    businessName: account.company,
    subscription: {
      planCode: 'demo',
      status: 'active',
      startsAt: new Date().toISOString(),
      expiresAt: null,
    },
    hasActiveSubscription: true,
    isDemo: true,
  };
}

export function signInDemo(email: string, password: string) {
  if (!isLocalDemoEnabled() || password !== DEMO_PASSWORD) return null;
  const normalizedEmail = email.trim().toLowerCase();
  const user = makeUser(normalizedEmail);
  if (user) window.localStorage.setItem(SESSION_KEY, normalizedEmail);
  return user;
}

export function getDemoSession() {
  if (!isLocalDemoEnabled()) return null;
  return makeUser(window.localStorage.getItem(SESSION_KEY) ?? '');
}

export function clearDemoSession() {
  if (typeof window !== 'undefined') window.localStorage.removeItem(SESSION_KEY);
}

function seedInventory(type: BusinessType): Jewelry[] {
  const now = new Date().toISOString();
  const common = { status: 'available' as const, weight: 0, price_per_gram: 0, created_at: now };
  return [
    { ...common, id: 'jw-1', code: 'JW-001', name: 'Bague Éclat', material_type: 'gold_18k', category: 'rings', purchase_price: 110000, sale_price: 165000, quantity: 5 },
    { ...common, id: 'jw-2', code: 'JW-002', name: 'Collier Sira', material_type: 'gold_21k', category: 'necklaces', purchase_price: 260000, sale_price: 340000, quantity: 2 },
    { ...common, id: 'jw-3', code: 'JW-003', name: 'Bracelet Argent', material_type: 'silver', category: 'bracelets', purchase_price: 35000, sale_price: 55000, quantity: 0, status: 'out_of_stock' },
  ];
}

export function getDemoInventory(type: BusinessType) {
  if (typeof window === 'undefined') return seedInventory(type);
  const key = `${INVENTORY_KEY}-${type}`;
  const stored = window.localStorage.getItem(key);
  if (stored) {
    try {
      return JSON.parse(stored) as Jewelry[];
    } catch {
      window.localStorage.removeItem(key);
    }
  }
  const inventory = seedInventory(type);
  window.localStorage.setItem(key, JSON.stringify(inventory));
  return inventory;
}

export function saveDemoInventory(type: BusinessType, inventory: Jewelry[]) {
  window.localStorage.setItem(`${INVENTORY_KEY}-${normalizeBusinessType(type)}`, JSON.stringify(inventory));
}
