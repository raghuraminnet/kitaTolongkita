const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

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

  return json;
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<ApiResponse<{ accessToken: string; fullName: string; role: string; expiresIn: number }>>(
      '/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }
    ),
  me: () => request<any>('/auth/me'),
  changePassword: (oldPassword: string, newPassword: string) =>
    request('/auth/change-password', { method: 'POST', body: JSON.stringify({ oldPassword, newPassword }) }),

  // Dashboard
  dashboard: () => request('/dashboard'),

  // Users
  users: (params?: { search?: string; filter?: string; page?: number; pageSize?: number }) => {
    const q = new URLSearchParams(params as any).toString();
    return request(`/users${q ? '?' + q : ''}`);
  },
  userDetail: (id: string) => request(`/users/${id}`),
  toggleUserStatus: (id: string, isActive: boolean) =>
    request(`/users/${id}/status`, { method: 'PATCH', body: JSON.stringify({ isActive }) }),

  // Deals
  pendingDeals: (page = 1, pageSize = 20) =>
    request(`/deals/moderation/pending?page=${page}&pageSize=${pageSize}`),
  allDeals: (params?: { status?: string; search?: string; page?: number; pageSize?: number }) => {
    const q = new URLSearchParams(params as any).toString();
    return request(`/deals${q ? '?' + q : ''}`);
  },
  approveDeal: (id: string) =>
    request(`/deals/moderation/${id}/approve`, { method: 'POST' }),
  rejectDeal: (id: string, reason: string) =>
    request(`/deals/moderation/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
  featureDeal: (id: string, featured: boolean) =>
    request(`/deals/${id}/feature`, { method: 'PATCH', body: JSON.stringify({ featured }) }),

  // Orders
  orders: (params?: { status?: string; search?: string; page?: number; pageSize?: number }) => {
    const q = new URLSearchParams(params as any).toString();
    return request(`/orders${q ? '?' + q : ''}`);
  },
  orderDetail: (id: string) => request(`/orders/${id}`),
  updateOrderStatus: (id: string, status: string) =>
    request(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  // AI Configs
  aiConfigs: () => request<ApiResponse<AiConfig[]>>('/ai-configs'),
  aiConfigsActive: () => request<ApiResponse<AiConfig | null>>('/ai-configs/active'),
  createAiConfig: (data: AiConfigInput) =>
    request('/ai-configs', { method: 'POST', body: JSON.stringify(data) }),
  updateAiConfig: (id: number, data: Partial<AiConfigInput> & { isActive?: boolean }) =>
    request(`/ai-configs/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteAiConfig: (id: number) =>
    request(`/ai-configs/${id}`, { method: 'DELETE' }),
  testAiConnection: (data: { provider: string; apiKey?: string; endpoint?: string; deploymentName?: string; modelName?: string }) =>
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
  auditLogs: (params?: { action?: string; entityType?: string; page?: number; pageSize?: number }) => {
    const q = new URLSearchParams(params as any).toString();
    return request(`/audit-logs${q ? '?' + q : ''}`);
  },

  // Admin users
  adminUsers: () => request('/admin-users'),
  createAdminUser: (data: { email: string; password: string; fullName: string; role: string }) =>
    request('/admin-users', { method: 'POST', body: JSON.stringify(data) }),
  deleteAdminUser: (id: number) =>
    request(`/admin-users/${id}`, { method: 'DELETE' }),
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
