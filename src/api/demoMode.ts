/**
 * Demo Mode — routes all API calls to local AsyncStorage when enabled.
 * Config is read from Expo's extra.appConfig (app.json extra.demoMode).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AddressPayload } from './client';import Constants from 'expo-constants';

// ── Config ────────────────────────────────────────────────────────────────────

interface DemoUser {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  emailVerified: boolean;
  phoneVerified: boolean;
}

interface DemoConfig {
  enabled: boolean;
  adminEmail: string;
  adminPassword: string;
  demoUser: DemoUser;
}

function getDemoConfig(): DemoConfig {
  const extra = Constants.expoConfig?.extra ?? {};
  return extra.demoMode ?? { enabled: false, adminEmail: '', adminPassword: '', demoUser: null };
}

export const isDemoMode = (): boolean => getDemoConfig().enabled;
export const getDemoUser = (): DemoUser | null => getDemoConfig().demoUser;
export const getDemoCredentials = (): { email: string; password: string } => {
  const cfg = getDemoConfig();
  return { email: cfg.adminEmail, password: cfg.adminPassword };
};

// ── Storage keys ──────────────────────────────────────────────────────────────

const STORAGE_KEYS = {
  DEMO_USER: 'demo_user',
  DEMO_DEALS: 'demo_deals',
  DEMO_ORDERS: 'demo_orders',
  DEMO_PROFILE: 'demo_profile',
  DEMO_ADDRESSES: 'demo_addresses',
  DEMO_NOTIFICATIONS: 'demo_notifications',
  IS_DEMO_LOGGED_IN: 'is_demo_logged_in',
} as const;

// ── Initial mock data ─────────────────────────────────────────────────────────

const MOCK_DEALS = [
  {
    id: 'deal-001',
    title: 'Aneka Kuih Muih — Premium Ramadan Set A',
    description: ' assorted kuih set perfect for Hari Raya. Contains 12 types of traditional Malaysian kuih.',
    category: 'Food',
    originalPrice: 38.0,
    groupPrice: 25.0,
    minMembers: 50,
    maxMembers: 100,
    membersJoined: 42,
    deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    pickupLocation: 'Kuala Lumpur, Brickfields',
    imageUrls: [],
    status: 'active',
    organizerName: 'Nur Kuih House',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'deal-002',
    title: 'Wireless Earbuds Pro — Noise Cancelling',
    description: 'Premium wireless earbuds with active noise cancellation, 30hr battery life.',
    category: 'Electronics',
    originalPrice: 149.0,
    groupPrice: 89.0,
    minMembers: 50,
    maxMembers: 80,
    membersJoined: 78,
    deadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    pickupLocation: 'Petaling Jaya, SS2',
    imageUrls: [],
    status: 'active',
    organizerName: 'TechDealz MY',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'deal-003',
    title: 'Malaysian Batik — Limited Edition 2024',
    description: 'Authentic Malaysian batik with contemporary design. Hand-printed in Kelantan.',
    category: 'Fashion',
    originalPrice: 99.0,
    groupPrice: 65.0,
    minMembers: 30,
    maxMembers: 50,
    membersJoined: 15,
    deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    pickupLocation: 'Shah Alam, Section 7',
    imageUrls: [],
    status: 'active',
    organizerName: 'BatikKita Co.',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'deal-004',
    title: 'Organic Durian — Musang King Grade A',
    description: 'Premium Musang King durian fromjohor orchard. Grade A, sweet and creamy.',
    category: 'Food',
    originalPrice: 180.0,
    groupPrice: 120.0,
    minMembers: 20,
    maxMembers: 30,
    membersJoined: 28,
    deadline: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
    pickupLocation: 'Penang, George Town',
    imageUrls: [],
    status: 'active',
    organizerName: 'DurianMan',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'deal-005',
    title: 'Korean Skincare Bundle — Glow Package',
    description: 'Complete skincare routine frominnisfree, laneige, and Cosrx. Value set.',
    category: 'Beauty',
    originalPrice: 220.0,
    groupPrice: 135.0,
    minMembers: 40,
    maxMembers: 60,
    membersJoined: 33,
    deadline: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    pickupLocation: 'Kuala Lumpur, Mont Kiara',
    imageUrls: [],
    status: 'active',
    organizerName: 'GlowUp MY',
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'deal-006',
    title: 'Fitness Tracker Band — Heart Rate Monitor',
    description: 'Waterproof fitness band with heart rate, SpO2, sleep tracking.',
    category: 'Sports',
    originalPrice: 159.0,
    groupPrice: 75.0,
    minMembers: 60,
    maxMembers: 100,
    membersJoined: 55,
    deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    pickupLocation: 'Cyberjaya',
    imageUrls: [],
    status: 'active',
    organizerName: 'FitGear MY',
    createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const MOCK_ORDERS = [
  {
    id: 'order-001',
    dealId: 'deal-001',
    dealTitle: 'Aneka Kuih Muih — Premium Ramadan Set A',
    quantity: 2,
    totalPrice: 50.0,
    status: 'confirmed',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'order-002',
    dealId: 'deal-002',
    dealTitle: 'Wireless Earbuds Pro — Noise Cancelling',
    quantity: 1,
    totalPrice: 89.0,
    status: 'pending',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
];

const MOCK_NOTIFICATIONS = [
  {
    id: 'notif-001',
    type: 'order_update',
    title: 'Order Confirmed! 🎉',
    body: 'Your order for Aneka Kuih Muih has been confirmed.',
    read: false,
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'notif-002',
    type: 'deal_closing',
    title: 'Deal Closing Soon! ⏰',
    body: 'Organic Durian deal ends in 6 hours. Join now!',
    read: false,
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'notif-003',
    type: 'promo',
    title: 'New Deal Available 🆕',
    body: 'Korean Skincare Bundle just launched with 38% off!',
    read: true,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
];

// ── Storage helpers ───────────────────────────────────────────────────────────

async function getStored<T>(key: string, initialValue: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : initialValue;
  } catch {
    return initialValue;
  }
}

async function setStored<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

// ── Init demo data ─────────────────────────────────────────────────────────────

export async function initDemoData(): Promise<void> {
  if (!(await getStored(STORAGE_KEYS.DEMO_DEALS, null))) {
    await setStored(STORAGE_KEYS.DEMO_DEALS, MOCK_DEALS);
  }
  if (!(await getStored(STORAGE_KEYS.DEMO_ORDERS, null))) {
    await setStored(STORAGE_KEYS.DEMO_ORDERS, MOCK_ORDERS);
  }
  if (!(await getStored(STORAGE_KEYS.DEMO_NOTIFICATIONS, null))) {
    await setStored(STORAGE_KEYS.DEMO_NOTIFICATIONS, MOCK_NOTIFICATIONS);
  }
  if (!(await getStored(STORAGE_KEYS.DEMO_ADDRESSES, null))) {
    await setStored(STORAGE_KEYS.DEMO_ADDRESSES, []);
  }
}

// ── Demo auth ─────────────────────────────────────────────────────────────────

export async function demoLogin(email: string, password: string): Promise<{ demoUser: DemoUser; token: string } | null> {
  const creds = getDemoCredentials();
  if (email === creds.email && password === creds.password) {
    const demoUser = getDemoUser();
    if (demoUser) {
      await setStored(STORAGE_KEYS.DEMO_USER, demoUser);
      await setStored(STORAGE_KEYS.IS_DEMO_LOGGED_IN, true);
      return { demoUser, token: 'demo-token-' + Date.now() };
    }
  }
  return null;
}

export async function isDemoLoggedIn(): Promise<boolean> {
  return getStored(STORAGE_KEYS.IS_DEMO_LOGGED_IN, false);
}

export async function getDemoLoggedInUser(): Promise<DemoUser | null> {
  return getStored(STORAGE_KEYS.DEMO_USER, null);
}

export async function demoLogout(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEYS.DEMO_USER);
  await AsyncStorage.removeItem(STORAGE_KEYS.IS_DEMO_LOGGED_IN);
}

// ── Demo deals ────────────────────────────────────────────────────────────────

export async function demoGetDeals(params?: Record<string, string | number>): Promise<{ items: typeof MOCK_DEALS; totalCount: number; page: number }> {
  let deals = await getStored(STORAGE_KEYS.DEMO_DEALS, MOCK_DEALS);
  if (params?.category && params.category !== 'All') {
    deals = deals.filter((d: any) => d.category === params.category);
  }
  if (params?.search) {
    const q = String(params.search).toLowerCase();
    deals = deals.filter((d: any) => d.title.toLowerCase().includes(q) || d.description.toLowerCase().includes(q));
  }
  return { items: deals, totalCount: deals.length, page: 1 };
}

export async function demoGetDealById(id: string): Promise<typeof MOCK_DEALS[0] | null> {
  const deals = await getStored(STORAGE_KEYS.DEMO_DEALS, MOCK_DEALS);
  return deals.find((d: any) => d.id === id) ?? null;
}

export async function demoJoinDeal(dealId: string, quantity: number): Promise<any> {
  const deals = await getStored(STORAGE_KEYS.DEMO_DEALS, MOCK_DEALS);
  const orders = await getStored(STORAGE_KEYS.DEMO_ORDERS, MOCK_ORDERS);
  const deal = deals.find((d: any) => d.id === dealId);
  if (!deal) throw new Error('Deal not found');

  const newOrder = {
    id: 'order-' + Date.now(),
    dealId,
    dealTitle: deal.title,
    quantity,
    totalPrice: deal.groupPrice * quantity,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  orders.push(newOrder);
  await setStored(STORAGE_KEYS.DEMO_ORDERS, orders);

  // Update members joined
  const idx = deals.findIndex((d: any) => d.id === dealId);
  if (idx >= 0) {
    deals[idx].membersJoined = Math.min(deals[idx].membersJoined + quantity, deals[idx].maxMembers);
    await setStored(STORAGE_KEYS.DEMO_DEALS, deals);
  }

  return newOrder;
}

// ── Demo orders ───────────────────────────────────────────────────────────────

export async function demoGetOrders(): Promise<typeof MOCK_ORDERS> {
  return getStored(STORAGE_KEYS.DEMO_ORDERS, MOCK_ORDERS);
}

// ── Demo profile ───────────────────────────────────────────────────────────────

export async function demoUpdateProfile(data: Partial<DemoUser>): Promise<DemoUser> {
  const user = await getDemoLoggedInUser();
  const updated: DemoUser = { ...(user ?? getDemoUser()!), ...data } as DemoUser;
  await setStored(STORAGE_KEYS.DEMO_USER, updated);
  return updated;
}

// ── Demo notifications ─────────────────────────────────────────────────────────

export async function demoGetNotifications(): Promise<typeof MOCK_NOTIFICATIONS> {
  return getStored(STORAGE_KEYS.DEMO_NOTIFICATIONS, MOCK_NOTIFICATIONS);
}

// ── Demo addresses ────────────────────────────────────────────────────────────

export async function demoGetAddresses(): Promise<any[]> {
  return getStored(STORAGE_KEYS.DEMO_ADDRESSES, []);
}

export async function demoAddAddress(data: AddressPayload): Promise<{ id: string }> {
  const addresses = await getStored<AddressPayload[]>(STORAGE_KEYS.DEMO_ADDRESSES, []);
  const newAddr = { ...data, id: 'addr-' + Date.now() };
  addresses.push(newAddr);
  await setStored(STORAGE_KEYS.DEMO_ADDRESSES, addresses);
  return { id: newAddr.id };
}
