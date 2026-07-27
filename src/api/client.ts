import * as SecureStore from 'expo-secure-store';
import * as DemoMode from './demoMode';

const API_BASE = 'http://168.235.81.222:5000/api';

// Token refresh logic — retry once with a new token if 401
let _refreshResolve: ((token: string) => void) | null = null;
let _refreshReject: ((err: Error) => void) | null = null;
let _isRefreshing = false;

// Expose a way for the app to inject a new token after refresh
export function injectRefreshToken(resolve: (token: string) => void, reject: (err: Error) => void) {
  _refreshResolve = resolve;
  _refreshReject = reject;
}

export function resolveRefreshToken(token: string) {
  _refreshResolve?.(token);
  _refreshResolve = null;
  _refreshReject = null;
  _isRefreshing = false;
}

export function rejectRefreshToken(err: Error) {
  _refreshReject?.(err);
  _refreshResolve = null;
  _refreshReject = null;
  _isRefreshing = false;
}

// ── Token storage ──────────────────────────────────────────────────────────────

export async function getAccessToken(): Promise<string | null> {
  if (DemoMode.isDemoMode()) {
    const loggedIn = await DemoMode.isDemoLoggedIn();
    return loggedIn ? 'demo-token' : null;
  }
  return SecureStore.getItemAsync('accessToken');
}

export async function setAccessToken(token: string): Promise<void> {
  await SecureStore.setItemAsync('accessToken', token);
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync('accessToken');
  await SecureStore.deleteItemAsync('refreshToken');
}

// ── Request wrapper ────────────────────────────────────────────────────────────

export async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  auth: boolean = false
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (auth) {
    const storedToken = await getAccessToken();
    if (storedToken) headers['Authorization'] = `Bearer ${storedToken}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let error: { message: string } = { message: `HTTP ${res.status}` };
    try {
      const data = await res.json();
      error = { message: data.message || data.title || `HTTP ${res.status}` };
    } catch { /* ignore parse errors */ }
    throw new Error(error.message);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ── Auth API ──────────────────────────────────────────────────────────────────

export const authApi = {
  emailSignup: (data: { email: string; fullName: string; password: string }) =>
    request<AuthResponse>('POST', '/auth/email/signup', data),

  emailLogin: (data: { email: string; password: string }) =>
    request<AuthResponse>('POST', '/auth/email/login', data),

  googleAuth: (idToken: string) =>
    request<AuthResponse>('POST', '/auth/google', { idToken }),

  sendOtp: (email: string, purpose: string) =>
    request<{ message: string; expiresAt: string }>('POST', '/auth/otp/send', { email, purpose }),

  verifyOtp: (email: string, code: string, purpose: string) =>
    request<User>('POST', '/auth/otp/verify', { email, code, purpose }),

  getMe: async (): Promise<User> => {
    if (DemoMode.isDemoMode()) {
      const loggedIn = await DemoMode.isDemoLoggedIn();
      if (loggedIn) {
        const user = DemoMode.getDemoUser();
        if (user) return user;
      }
    }
    return request<User>('GET', '/auth/me', undefined, true);
  },

  updateMe: async (data: { fullName?: string; phone?: string; avatarUrl?: string }): Promise<UserProfile> => {
    if (DemoMode.isDemoMode()) {
      const loggedIn = await DemoMode.isDemoLoggedIn();
      if (loggedIn) {
        return DemoMode.demoUpdateProfile(data) as Promise<UserProfile>;
      }
    }
    return request<UserProfile>('PUT', '/users/me', data, true);
  },

  getAddresses: () => {
    if (DemoMode.isDemoMode()) return DemoMode.demoGetAddresses() as Promise<Address[]>;
    return request<Address[]>('GET', '/users/addresses', undefined, true);
  },

  addAddress: (data: AddressPayload) => {
    if (DemoMode.isDemoMode()) return DemoMode.demoAddAddress(data) as Promise<{ id: string }>;
    return request<{ id: string }>('POST', '/users/addresses', data, true);
  },
};

// ── Deals API ─────────────────────────────────────────────────────────────────

export const dealsApi = {
  search: (params: Record<string, string | number>) => {
    if (DemoMode.isDemoMode()) {
      return DemoMode.demoGetDeals(params) as Promise<{ items: Deal[]; totalCount: number; page: number }>;
    }
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))
    ).toString();
    return request<{ items: Deal[]; totalCount: number; page: number }>(`GET`, `/deals?${qs}`);
  },

  getById: (id: string) => {
    if (DemoMode.isDemoMode()) {
      return DemoMode.demoGetDealById(id) as Promise<Deal>;
    }
    return request<Deal>('GET', `/deals/${id}`);
  },

  create: (data: CreateDealPayload) =>
    request<Deal>('POST', '/deals', data, true),

  join: (dealId: string, quantity: number, notes?: string) => {
    if (DemoMode.isDemoMode()) {
      return DemoMode.demoJoinDeal(dealId, quantity) as Promise<Order>;
    }
    return request<Order>('POST', `/deals/${dealId}/join`, { quantity, notes }, true);
  },

  getOrders: () => {
    if (DemoMode.isDemoMode()) {
      return DemoMode.demoGetOrders() as Promise<Order[]>;
    }
    return request<Order[]>('GET', '/deals/orders', undefined, true);
  },
};

// ── Notifications API (non-standard, handled locally in demo) ────────────────

export const notificationsApi = {
  getAll: () => {
    if (DemoMode.isDemoMode()) {
      return DemoMode.demoGetNotifications() as Promise<Notification[]>;
    }
    return request<Notification[]>('GET', '/notifications');
  },
};

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: User;
}

export interface User {
  id: string;
  email: string;
  phone?: string;
  fullName: string;
  avatarUrl?: string;
  emailVerified: boolean;
  phoneVerified: boolean;
}

export interface Deal {
  id: string;
  title: string;
  description: string;
  category: string;
  originalPrice: number;
  groupPrice: number;
  minMembers: number;
  maxMembers: number;
  membersJoined: number;
  deadline: string;
  pickupLocation: string;
  imageUrls: string[];
  status: string;
  organizerName: string;
  createdAt: string;
}

export interface CreateDealPayload {
  title: string;
  description: string;
  category: string;
  originalPrice: number;
  groupPrice: number;
  minMembers: number;
  maxMembers: number;
  deadline: string;
  pickupLocation: string;
  imageUrls: string[];
}

export interface Order {
  id: string;
  dealId: string;
  dealTitle: string;
  quantity: number;
  totalPrice: number;
  status: string;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  phone?: string;
  fullName: string;
  avatarUrl?: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: string;
}

export interface Address {
  id: string;
  label: string;
  fullAddress: string;
  postcode?: string;
  city?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
  isDefault: boolean;
}

export interface AddressPayload {
  label: string;
  fullAddress: string;
  postcode?: string;
  city?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
  isDefault?: boolean;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}
