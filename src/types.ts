export type Role = 'admin' | 'member';

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: Role;
  company_name: string;
  job_title?: string | null;
  timezone: string;
  notifications_enabled: boolean;
  created_at: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Plan {
  id: number;
  name: string;
  slug: string;
  price_monthly: number;
  seats: number;
  events_limit: number;
  features: string[];
  popular: boolean;
}

export interface Subscription {
  id: number;
  plan_id: number;
  plan_name: string;
  status: string;
  seats_used: number;
  current_period_end: string;
}

export interface Invoice {
  id: number;
  number: string;
  amount: number;
  status: string;
  issued_at: string;
  paid_at?: string | null;
}

export interface UsageEvent {
  id: number;
  feature: string;
  quantity: number;
  source: string;
  occurred_at: string;
}

export interface UsageSummary {
  feature: string;
  total: number;
}

export interface Ticket {
  id: number;
  subject: string;
  category: string;
  priority: string;
  status: string;
  message: string;
  response?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DashboardData {
  active_users: number;
  mrr: number;
  open_tickets: number;
  usage_this_month: number;
  usage_limit: number;
  subscription: Subscription;
  recent_usage: UsageEvent[];
  recent_tickets: Ticket[];
}

export interface AdminSummary {
  users: User[];
  tickets: Ticket[];
  usage_by_org: Array<{ company_name: string; total: number }>;
  metrics: { total_users: number; open_tickets: number; monthly_revenue: number; total_usage: number };
}
