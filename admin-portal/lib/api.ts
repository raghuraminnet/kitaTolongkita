const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('admin_token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const json = await res.json();

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('admin_token');
      if (typeof window !== 'undefined') window.location.href = '/';
      throw new Error(json.message || 'Request failed');
    }
    throw new Error(json.message || 'Request failed');
  }

  if (json && typeof json === 'object' && !Array.isArray(json)) {
    if (json.items && Array.isArray(json.items)) {
      const dataArr: any = [...json.items];
      dataArr.items = json.items;
      dataArr.totalCount = json.totalCount ?? json.total ?? 0;
      dataArr.total = json.totalCount ?? json.total ?? 0;
      if (json.data === undefined) {
        json.data = dataArr;
      }
      if (json.total === undefined && json.totalCount !== undefined) {
        json.total = json.totalCount;
      }
    } else if (json.data === undefined) {
      json.data = json;
    }
    if (json.success === undefined) {
      json.success = true;
    }
  }

  return json;
}


/** Strip undefined/null/empty before building query strings — prevents ?search=undefined */
function cleanParams(params: Record<string, any>): string {
  const cleaned: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') cleaned[k] = String(v);
  }
  return new URLSearchParams(cleaned).toString();
}

export const api = {
  // Auth (admin area — moved to /api/admin/auth/* after merge)
  login: (email: string, password: string) =>
    request<ApiResponse<{ accessToken: string; fullName: string; role: string; expiresIn: number }>>(
      '/admin/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }
    ),
  me: () => request<any>('/admin/auth/me'),
  changePassword: (oldPassword: string, newPassword: string) =>
    request('/admin/auth/change-password', { method: 'POST', body: JSON.stringify({ oldPassword, newPassword }) }),

  // Dashboard
  dashboard: () => request('/dashboard'),

  // Users
  users: (params?: { search?: string; filter?: string; page?: number; pageSize?: number }) => {
    const q = params ? cleanParams(params as Record<string, any>) : "";
    return request(`/admin-portal/users${q ? '?' + q : ''}`);
  },
  userDetail: (id: string) => request(`/admin-portal/users/${id}`),
  toggleUserStatus: (id: string, isActive: boolean) =>
    request(`/admin-portal/users/${id}/status`, { method: 'PATCH', body: JSON.stringify({ isActive }) }),

  // Deals
  pendingDeals: (page = 1, pageSize = 20) =>
    request(`/admin-portal/deals/moderation/pending?page=${page}&pageSize=${pageSize}`),
  allDeals: (params?: { status?: string; search?: string; page?: number; pageSize?: number }) => {
    const q = params ? cleanParams(params as Record<string, any>) : "";
    return request(`/admin-portal/deals${q ? '?' + q : ''}`);
  },
  approveDeal: (id: string) =>
    request(`/admin-portal/deals/moderation/${id}/approve`, { method: 'POST' }),
  rejectDeal: (id: string, reason: string) =>
    request(`/admin-portal/deals/moderation/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
  featureDeal: (id: string, featured: boolean) =>
    request(`/admin-portal/deals/${id}/feature`, { method: 'PATCH', body: JSON.stringify({ featured }) }),

  // App Deals (from main DB — read-only view for all deals in the app)
  appDeals: (params?: { status?: string; search?: string }) => {
    const q = params ? cleanParams(params as Record<string, any>) : "";
    return request(`/admin-portal/app-deals${q ? '?' + q : ''}`);
  },
  appDealById: (id: string) =>
    request(`/admin-portal/app-deals/${id}`),

  // App Users (from main DB — read-only view for all app users)
  appUsers: (params?: { search?: string }) => {
    const q = params ? cleanParams(params as Record<string, any>) : "";
    return request(`/admin-portal/app-users${q ? '?' + q : ''}`);
  },
  appUserById: (id: string) =>
    request(`/admin-portal/app-users/${id}`),

  // Orders
  orders: (params?: { status?: string; search?: string; page?: number; pageSize?: number }) => {
    const q = params ? cleanParams(params as Record<string, any>) : "";
    return request(`/admin-portal/orders${q ? '?' + q : ''}`);
  },
  orderDetail: (id: string) => request(`/admin-portal/orders/${id}`),
  updateOrderStatus: (id: string, status: string) =>
    request(`/admin-portal/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  // AI Configs
  aiConfigs: () => request<ApiResponse<AiConfig[]>>('/ai-configs'),
  aiConfigsActive: () => request<ApiResponse<AiConfig | null>>('/ai-configs/active'),
  createAiConfig: (data: AiConfigInput) =>
    request('/ai-configs', { method: 'POST', body: JSON.stringify(data) }),
  updateAiConfig: (id: number, data: Partial<AiConfigInput> & { isActive?: boolean }) =>
    request(`/ai-configs/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteAiConfig: (id: number) =>
    request(`/ai-configs/${id}`, { method: 'DELETE' }),
  testAiConnection: (data: { provider: string; apiKey?: string; endpoint?: string; baseUrl?: string; deploymentName?: string; modelName?: string }) =>
    request<{ success: boolean; message: string }>('/ai-configs/test', { method: 'POST', body: JSON.stringify(data) }),

  // Moderation Rules
  moderationRules: (category?: string) =>
    request(`/moderation-rules${category ? '?category=' + category : ''}`),
  updateModerationRule: (id: number, data: { value?: string; isActive?: boolean }) =>
    request(`/moderation-rules/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Settings
  settings: () => request('/settings'),
  updateSetting: (key: string, value: string) =>
    request('/settings', { method: 'PUT', body: JSON.stringify({ key, value }) }),

  // Audit logs
  auditLogs: (params?: { category?: string; level?: string; action?: string; userId?: string; from?: string; to?: string; page?: number; pageSize?: number }) => {
    const q = params ? cleanParams(params as Record<string, any>) : "";
    return request(`/audit-logs${q ? '?' + q : ''}`);
  },
  auditLogsStats: (since?: string) => {
    const q = since ? `?since=${since}` : '';
    return request(`/audit-logs/stats${q}`);
  },

  // Reports
  reports: (params?: { status?: string; type?: string; reason?: string; from?: string; to?: string; page?: number; pageSize?: number }) => {
    const q = params ? cleanParams(params as Record<string, any>) : "";
    return request(`/reports${q ? '?' + q : ''}`);
  },
  reportById: (id: string) => request(`/reports/${id}`),
  reportTakeAction: (id: string, data: { action: string; notes?: string }) =>
    request(`/reports/${id}/action`, { method: 'POST', body: JSON.stringify(data) }),
  reportUpdateStatus: (id: string, data: { status: string; notes?: string }) =>
    request(`/reports/${id}/status`, { method: 'PATCH', body: JSON.stringify(data) }),
  reportStats: () => request('/reports/stats'),

  reportActions: [
    { key: 'None',              label: 'No Action (Dismiss)' },
    { key: 'DealHidden',        label: 'Hide Deal' },
    { key: 'UserWarned',        label: 'Warn User' },
    { key: 'PostingRevoked',     label: 'Revoke Posting Access' },
    { key: 'AccountSuspended',  label: 'Suspend Account' },
    { key: 'AccountBanned',     label: 'Ban Account' },
  ],
  reportStatuses: ['New', 'UnderReview', 'ActionTaken', 'Dismissed', 'Resolved'],
  reportTypes: ['Deal', 'User'],
  reportReasons: [
    'PriceGouging','MisleadingPricing','Counterfeit','ItemNotAsDescribed',
    'DangerousProduct','SpamDuplicate','CoordinatedDeals','InappropriateContent',
    'Harassment','FakeDeal','PhishingScam','FakeEngagement','SuspiciousPoster','Other',
  ],

  // Admin users
  adminUsers: () => request('/admin-users'),
  createAdminUser: (data: { email: string; password: string; fullName: string; role: string }) =>
    request('/admin-users', { method: 'POST', body: JSON.stringify(data) }),
  deleteAdminUser: (id: number) =>
    request(`/admin-users/${id}`, { method: 'DELETE' }),

  // ── Contributors ────────────────────────────────────────────────────────────
  contributors: (params?: { page?: number; size?: number }) => {
    const q = params ? cleanParams(params as Record<string, any>) : "";
    return request(`/admin/contributors${q ? '?' + q : ''}`);
  },
  revokeContributor: (userId: string) =>
    request(`/admin/contributors/${userId}/revoke`, { method: 'PATCH' }),

  // ── Saved Lists ───────────────────────────────────────────────────────────────
  savedLists: (params?: { search?: string; page?: number; pageSize?: number }) => {
    const q = params ? cleanParams(params as Record<string, any>) : "";
    return request(`/admin-portal/saved-lists${q ? '?' + q : ''}`);
  },
  savedListDetail: (id: string) => request(`/admin-portal/saved-lists/${id}`),

  // ── Notifications ────────────────────────────────────────────────────────────
  notifications: (params?: { type?: string; isRead?: boolean; page?: number; pageSize?: number }) => {
    const q = params ? cleanParams(params as Record<string, any>) : "";
    return request(`/admin-portal/notifications${q ? '?' + q : ''}`);
  },
  notificationStats: () => request('/admin-portal/notifications/stats'),

  // ── Admin Real-Time Alerts ──────────────────────────────────────────────────
  adminAlerts: (params?: { isRead?: boolean; severity?: string; page?: number; pageSize?: number }) => {
    const q = params ? cleanParams(params as Record<string, any>) : "";
    return request(`/admin-portal/alerts${q ? '?' + q : ''}`);
  },
  adminAlertsUnreadCount: () => request<{ unreadCount: number }>('/admin-portal/alerts/unread-count'),
  markAdminAlertRead: (id: string) =>
    request(`/admin-portal/alerts/${id}/read`, { method: 'PATCH' }),
  markAllAdminAlertsRead: () =>
    request('/admin-portal/alerts/read-all', { method: 'POST' }),

  // ── Push Broadcasting & Tools ───────────────────────────────────────────────
  broadcastPush: (data: { title: string; body: string; targetRole?: string; data?: any }) =>
    request('/admin-portal/push/broadcast', { method: 'POST', body: JSON.stringify(data) }),
  sendTestPush: (data: { token: string; title?: string; body?: string }) =>
    request('/admin-portal/push/send-test', { method: 'POST', body: JSON.stringify(data) }),
  sendUserPush: (data: { userId: string; title: string; body: string; data?: any }) =>
    request('/admin-portal/push/send-to-user', { method: 'POST', body: JSON.stringify(data) }),
  pushStats: () =>
    request<{ totalTokens: number; activeTokens: number; androidCount: number; iosCount: number }>('/admin-portal/push/stats'),

  // ── Conversations / Chat ──────────────────────────────────────────────────────
  conversations: (params?: { search?: string; page?: number; pageSize?: number }) => {
    const q = params ? cleanParams(params as Record<string, any>) : "";
    return request(`/admin-portal/conversations${q ? '?' + q : ''}`);
  },
  chatMessages: (conversationId: string, page = 1, pageSize = 50) =>
    request(`/admin-portal/conversations/${conversationId}/messages?page=${page}&pageSize=${pageSize}`),

  // ── Push Tokens ─────────────────────────────────────────────────────────────
  pushTokens: (params?: { search?: string; page?: number; pageSize?: number }) => {
    const q = params ? cleanParams(params as Record<string, any>) : "";
    return request(`/admin-portal/push-tokens${q ? '?' + q : ''}`);
  },

  // ── Deal Statistics ──────────────────────────────────────────────────────────
  dealStats: (days = 30) => request(`/admin-portal/stats/deals?days=${days}`),

  // ── Bulk Actions ─────────────────────────────────────────────────────────────
  bulkModerateDeals: (ids: string[], action: string, reason?: string) =>
    request('/admin-portal/bulk/moderate-deals', {
      method: 'POST',
      body: JSON.stringify({ ids, action, reason }),
    }),

  // ── Categories ───────────────────────────────────────────────────────────────
  categories: () => request('/categories'),
  createCategory: (data: { name: string; description?: string }) =>
    request('/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id: number, data: { name?: string; description?: string; isActive?: boolean }) =>
    request(`/categories/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteCategory: (id: number) =>
    request(`/categories/${id}`, { method: 'DELETE' }),

  // ── User Activity Timeline ────────────────────────────────────────────────────
  userActivity: (userId: string) => request(`/admin-portal/users/${userId}/activity`),

  // ── Comments Moderation ──────────────────────────────────────────────────────
  comments: (params?: { dealId?: string; userId?: string; status?: string; page?: number; pageSize?: number }) => {
    const q = params ? cleanParams(params as Record<string, any>) : "";
    return request(`/admin-portal/comments${q ? '?' + q : ''}`);
  },
  commentStats: () => request('/admin-portal/comments/stats'),
  hideComment: (id: string) => request(`/admin-portal/comments/${id}/hide`, { method: 'PATCH' }),
  approveComment: (id: string) => request(`/admin-portal/comments/${id}/approve`, { method: 'PATCH' }),
  deleteComment: (id: string) => request(`/admin-portal/comments/${id}`, { method: 'DELETE' }),

  // ── User Recent Activity (from ActivityLog) ───────────────────────────────
  recentActivity: (userId: string, limit = 50) =>
    request(`/admin-portal/users/${userId}/recent-activity?limit=${limit}`),

  // ── User Follows (read-only) ────────────────────────────────────────────────
  userFollowStats: (userId: string) => request(`/admin-portal/users/${userId}/follow-stats`),
  userFollowers: (userId: string, page = 1, pageSize = 20) =>
    request(`/admin-portal/users/${userId}/followers?page=${page}&pageSize=${pageSize}`),
  userFollowing: (userId: string, page = 1, pageSize = 20) =>
    request(`/admin-portal/users/${userId}/following?page=${page}&pageSize=${pageSize}`),

  // ── User Verification ───────────────────────────────────────────────────────
  verifyUser: (userId: string, verify: boolean) =>
    request(`/admin-portal/users/${userId}/verify`, { method: 'PATCH', body: JSON.stringify({ verify }) }),
};

export interface AiConfig {
  id: number;
  name: string;
  provider: string;
  apiKeyMasked: string;
  endpoint?: string;
  deploymentName?: string;
  modelName?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AiConfigInput {
  name: string;
  provider: string;
  apiKey?: string;
  endpoint?: string;
  baseUrl?: string;
  deploymentName?: string;
  modelName?: string;
}
