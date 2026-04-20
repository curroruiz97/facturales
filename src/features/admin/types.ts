export interface AdminOverview {
  total_users: number;
  total_clients: number;
  total_invoices: number;
  total_quotes: number;
  total_products: number;
  total_transactions: number;
}

export interface AdminDashboardMetrics {
  total_users: number;
  new_today: number;
  active_today: number;
  active_week: number;
  active_month: number;
  mrr: number;
  arr: number;
  total_invoices: number;
  total_quotes: number;
  total_clients: number;
  total_products: number;
  total_transactions: number;
  monthly_signups: Array<{ month: string; count: number }>;
  plans_distribution: Array<{ plan: string; count: number }>;
}

export interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  nombre_fiscal: string | null;
  nombre_comercial: string | null;
  plan: string;
  clients_count: number;
  invoices_count: number;
  products_count: number;
}

export interface AdminUsersResponse {
  users: AdminUser[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface AdminUserDetailProfile {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  full_name: string | null;
  nombre_fiscal: string | null;
  nombre_comercial: string | null;
  nif_cif: string | null;
  telefono: string | null;
  ciudad: string | null;
  provincia: string | null;
  pais: string | null;
  sector: string | null;
  business_type: string | null;
}

export interface AdminUserDetailSubscription {
  plan: string;
  status: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  stripe_customer_id: string | null;
}

export interface AdminUserDetailStats {
  clients: number;
  invoices: number;
  quotes: number;
  products: number;
  transactions: number;
  invoices_total_amount: number;
}

export interface AdminUserDetail {
  profile: AdminUserDetailProfile;
  subscription: AdminUserDetailSubscription;
  stats: AdminUserDetailStats;
  recent_activity: Array<{ action: string; created_at: string; metadata: Record<string, unknown> }>;
  is_admin: boolean;
}

export interface AdminRevenueAnalytics {
  mrr: number;
  arr: number;
  arpu: number;
  total_paying: number;
  total_users: number;
  conversion_rate: number;
  by_plan: Array<{ plan: string; count: number; revenue: number }>;
  monthly_signups: Array<{ month: string; count: number }>;
}

export interface AdminApiUsage {
  total_calls: number;
  daily_usage: Array<{ day: string; count: number }>;
  by_action: Array<{ action: string; count: number }>;
  top_users: Array<{ user_id: string; email: string; count: number }>;
}

export interface AdminEmailAnalytics {
  total_sent: number;
  daily_activity: Array<{ day: string; count: number }>;
  campaigns: unknown[];
  contacts: number;
  templates: number;
}

export interface AdminSystemHealth {
  database: { size: string; connections: number };
  users: { total: number; active_24h: number };
  invoices: { total: number };
  transactions: { total: number };
  recent_errors: unknown[];
  status: string;
}

export interface AdminSystemLog {
  id: string;
  user_id: string;
  email: string | null;
  action: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface AdminSystemLogsResponse {
  logs: AdminSystemLog[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface AdminAuditLog {
  id: string;
  admin_user_id: string;
  admin_email: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface AdminAuditLogsResponse {
  logs: AdminAuditLog[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface AdminFeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string | null;
  enabled: boolean;
  rollout_percentage: number;
  target_users: string[];
  metadata: Record<string, unknown>;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminConfigEntry {
  id: string;
  key: string;
  value: unknown;
  category: string;
  description: string | null;
  updated_by: string | null;
  updated_at: string;
}

export type AdminAction =
  | "view_user_detail"
  | "update_subscription"
  | "suspend_user"
  | "unsuspend_user"
  | "delete_user"
  | "grant_admin"
  | "revoke_admin"
  | "upsert_feature_flag"
  | "delete_feature_flag"
  | "update_config";
