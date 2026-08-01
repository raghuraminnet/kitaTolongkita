import * as SecureStore from 'expo-secure-store';
import * as DemoMode from './demoMode';

export const API_BASE = 'http://76.13.219.191:5000/api';

// Global location ref — set by LocationContext
export let _globalLat: number | null = null;
export let _globalLon: number | null = null;

export function setGlobalLocation(lat: number | null, lon: number | null) {
  _globalLat = lat;
  _globalLon = lon;
}

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

  if (_globalLat != null) headers['X-Latitude'] = String(_globalLat);
  if (_globalLon != null) headers['X-Longitude'] = String(_globalLon);

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

  forgotPassword: (email: string) =>
    request<{ message: string }>('POST', '/auth/forgot-password', { email }),

  resetPassword: (email: string, newPassword: string, otpCode: string) =>
    request<{ message: string }>('POST', '/auth/reset-password', { email, newPassword, otpCode }),

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

// ── Saved Deals API ─────────────────────────────────────────────────────────────

export interface SavedList {
  id: string;
  name: string;
  isPublic: boolean;
  createdAt: string;
  dealCount: number;
}

export interface SavedDealDealSummary {
  id: string;
  title: string;
  category: string;
  groupPrice: number;
  originalPrice: number;
  imageUrl?: string;
  membersJoined: number;
  minMembers: number;
  status: string;
  organizerName: string;
  organizerAvatar?: string;
  latitude?: number;
  longitude?: number;
  deadline: string;
}

export interface SavedDeal {
  id: string;
  dealId: string;
  listId: string;
  listName: string;
  savedAt: string;
  deal: SavedDealDealSummary;
}

export const savedDealsApi = {
  /** Get all the current user's saved lists. */
  getMyLists: async (): Promise<SavedList[]> => {
    const token = await getAccessToken();
    return request('GET', '/saved/lists', undefined, false, token ?? undefined) as Promise<SavedList[]>;
  },

  /** Create a new saved list. */
  createList: async (name: string, isPublic = false): Promise<SavedList> => {
    const token = await getAccessToken();
    return request('POST', '/saved/lists', { name, isPublic }, false, token ?? undefined) as Promise<SavedList>;
  },

  /** Update a list's name or visibility. */
  updateList: async (listId: string, data: { name?: string; isPublic?: boolean }): Promise<SavedList> => {
    const token = await getAccessToken();
    return request('PATCH', `/saved/lists/${listId}`, data, false, token ?? undefined) as Promise<SavedList>;
  },

  /** Delete a saved list. */
  deleteList: async (listId: string): Promise<void> => {
    const token = await getAccessToken();
    return request('DELETE', `/saved/lists/${listId}`, undefined, false, token ?? undefined) as Promise<void>;
  },

  /** Get all saved deals, optionally filtered by listId. */
  getSavedDeals: async (listId?: string): Promise<SavedDeal[]> => {
    const token = await getAccessToken();
    const url = listId ? `/saved?listId=${listId}` : '/saved';
    return request('GET', url, undefined, false, token ?? undefined) as Promise<SavedDeal[]>;
  },

  /** Save a deal to a list (use listId or newListName to create a new list). */
  saveDeal: async (dealId: string, listId?: string, newListName?: string): Promise<SavedDeal> => {
    const token = await getAccessToken();
    return request('POST', '/saved', { dealId, listId, newListName }, false, token ?? undefined) as Promise<SavedDeal>;
  },

  /** Remove a deal from a saved list. */
  unsaveDeal: async (dealId: string, listId: string): Promise<void> => {
    const token = await getAccessToken();
    return request('DELETE', '/saved', { dealId, listId }, false, token ?? undefined) as Promise<void>;
  },

  /** Check which lists a deal is saved to by the current user. */
  checkSaved: async (dealId: string): Promise<string[]> => {
    const token = await getAccessToken();
    return request('GET', `/saved/check/${dealId}`, undefined, false, token ?? undefined) as Promise<string[]>;
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

  getMyDeals: () => request<Deal[]>('GET', '/deals/mine', undefined, true),
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
  organizerAvatar?: string;
  createdAt: string;
  latitude?: number;
  longitude?: number;
  hashtags?: string[];
  upvoteCount?: number;
  likeCount?: number;
  moderationStatus?: string;
  moderationRejectReason?: string;
  organizerId?: string;
  isSaved?: boolean;
  savedListIds?: string[];
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
  imageUrls?: string[];
  latitude?: number;
  longitude?: number;
  hashtags?: string[];
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

// ── Report Types ──────────────────────────────────────────────────────────────

export type ReportType = 'Deal' | 'User';

export type ReportReason =
  | 'PriceGouging'
  | 'MisleadingPricing'
  | 'Counterfeit'
  | 'ItemNotAsDescribed'
  | 'DangerousProduct'
  | 'SpamDuplicate'
  | 'CoordinatedDeals'
  | 'InappropriateContent'
  | 'Harassment'
  | 'FakeDeal'
  | 'PhishingScam'
  | 'FakeEngagement'
  | 'SuspiciousPoster'
  | 'Other';

export type ReportStatus = 'New' | 'UnderReview' | 'ActionTaken' | 'Dismissed' | 'Resolved';

export type ReportAction =
  | 'None'
  | 'DealHidden'
  | 'UserWarned'
  | 'PostingRevoked'
  | 'AccountSuspended'
  | 'AccountBanned';

export interface Report {
  id: string;
  type: ReportType;
  targetId: string;
  targetTitle?: string;
  reporterId: string;
  reporterName?: string;
  reasons: ReportReason[];
  description?: string;
  status: ReportStatus;
  action: ReportAction;
  adminNotes?: string;
  resolvedAt?: string;
  createdAt: string;
}

// ── Report API ────────────────────────────────────────────────────────────────

export const reportsApi = {
  /** Submit a new report. Throws on 409 if duplicate unresolved report exists. */
  submit: async (payload: {
    type: ReportType;
    targetId: string;
    reasons: ReportReason[];
    description?: string;
  }): Promise<Report> => {
    const token = await getAccessToken();
    const res = await request('POST', '/reports', payload, false, token ?? undefined);
    return res as Report;
  },

  /** List the current user's own reports. */
  mine: async (): Promise<Report[]> => {
    const token = await getAccessToken();
    const res = await request('GET', '/reports/mine', undefined, false, token ?? undefined);
    return (res as any)?.items ?? res ?? [];
  },
};

// ── User / Profile API ────────────────────────────────────────────────────────

export interface PublicUserProfile {
  id: string;
  fullName: string;
  avatarUrl?: string;
  createdAt: string;
  activeDealsCount: number;
}

export const usersApi = {
  /** Get public profile of any user (for display on other users' screens). */
  getPublicProfile: async (userId: string): Promise<PublicUserProfile> => {
    return request('GET', `/users/${userId}`, undefined, true) as Promise<PublicUserProfile>;
  },

  /** Get public deals posted by a specific user. */
  getDealsByUser: async (userId: string): Promise<Deal[]> => {
    return request('GET', `/deals/user/${userId}`, undefined, true) as Promise<Deal[]>;
  },
};
