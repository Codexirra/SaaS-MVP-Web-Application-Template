import type { AdminSummary, AuthResponse, DashboardData, Invoice, Plan, Subscription, Ticket, UsageEvent, UsageSummary, User } from '../types';

const normalizeApiBase = (value?: string) => { const base = (value || "/api").replace(/\/+$/, ""); return base.endsWith("/api") ? base : `${base}/api`; };

export const API_BASE = normalizeApiBase(import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL);

let authToken = localStorage.getItem('saas_token') || '';

export function setAuthToken(token: string) {
  authToken = token;
  if (token) localStorage.setItem('saas_token', token);
  else localStorage.removeItem('saas_token');
}

export function getAuthToken() {
  return authToken;
}

function formatApiError(data: unknown): string {
  if (!data) return 'Request failed';
  if (typeof data === 'string') return data;

  if (typeof data === 'object' && data && 'detail' in data) {
    const detail = (data as { detail: unknown }).detail;

    if (Array.isArray(detail)) {
      return detail.map(item => {
        if (typeof item === 'string') return item;
        if (typeof item === 'object' && item) {
          const record = item as Record<string, unknown>;
          const location = Array.isArray(record.loc) ? record.loc.join('.') : '';
          const message = typeof record.msg === 'string' ? record.msg : JSON.stringify(record);
          return location ? `${location}: ${message}` : message;
        }
        return String(item);
      }).join('; ');
    }

    if (typeof detail === 'string') return detail;
    if (typeof detail === 'object' && detail) return JSON.stringify(detail);
    return String(detail);
  }

  return JSON.stringify(data);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (authToken) headers.set('Authorization', `Bearer ${authToken}`);

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const text = await response.text();
  let data: unknown = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { detail: text };
    }
  }

  if (!response.ok) {
    throw new Error(`${formatApiError(data)} (${response.status})`);
  }

  return data as T;
}

export const api = {
  register: (payload: { email: string; password: string; full_name: string; company_name: string }) =>
    request<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload: { email: string; password: string }) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  me: () => request<User>('/auth/me'),
  dashboard: () => request<DashboardData>('/dashboard'),
  plans: () => request<Plan[]>('/plans'),
  subscription: () => request<Subscription>('/subscription'),
  changePlan: (plan_id: number) => request<Subscription>('/subscription/change-plan', { method: 'POST', body: JSON.stringify({ plan_id }) }),
  billing: () => request<{ subscription: Subscription; invoices: Invoice[] }>('/billing'),
  payInvoice: (invoice_id: number) => request<Invoice>(`/billing/invoices/${invoice_id}/pay`, { method: 'POST' }),
  usage: (query = '') => request<{ events: UsageEvent[]; summary: UsageSummary[] }>(`/usage${query}`),
  trackUsage: (payload: { feature: string; quantity: number; source: string }) =>
    request<UsageEvent>('/usage/track', { method: 'POST', body: JSON.stringify(payload) }),
  tickets: (query = '') => request<Ticket[]>(`/tickets${query}`),
  createTicket: (payload: { subject: string; category: string; priority: string; message: string }) =>
    request<Ticket>('/tickets', { method: 'POST', body: JSON.stringify(payload) }),
  updateTicket: (id: number, payload: Partial<Pick<Ticket, 'status' | 'response'>>) =>
    request<Ticket>(`/tickets/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  updateSettings: (payload: Partial<User>) => request<User>('/settings', { method: 'PUT', body: JSON.stringify(payload) }),
  admin: () => request<AdminSummary>('/admin/summary'),
};
