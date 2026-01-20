/**
 * Security types for login/logout logs and IP whitelist management
 */

export type SecurityEventType = 'login_success' | 'login_failed' | 'logout' | 'token_expired';
export type DeviceType = 'desktop' | 'mobile' | 'tablet' | 'unknown';

export interface SecurityLog {
  id: number;
  user: number | null;
  user_email: string | null;
  attempted_email: string;
  event_type: SecurityEventType;
  event_type_display: string;
  ip_address: string;
  user_agent: string;
  device_type: DeviceType;
  device_type_display: string;
  browser: string;
  operating_system: string;
  city: string;
  country: string;
  country_code: string;
  failure_reason: string;
  created_at: string;
}

export interface SecurityLogFilters {
  event_type?: SecurityEventType;
  user_id?: number;
  ip_address?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  page?: number;
  page_size?: number;
}

export interface PaginatedSecurityLogs {
  count: number;
  next: string | null;
  previous: string | null;
  results: SecurityLog[];
}

export interface SecurityLogStats {
  total_logins: number;
  failed_logins: number;
  unique_ips: number;
  unique_users: number;
  by_event_type: Record<SecurityEventType, number>;
  by_device_type: Record<DeviceType, number>;
  by_date: Array<{
    date: string;
    login_success: number;
    login_failed: number;
    logout: number;
  }>;
  recent_failed_logins: SecurityLog[];
  top_ips: Array<{
    ip_address: string;
    count: number;
  }>;
  period_days: number;
}

export interface IPWhitelistEntry {
  id: number;
  ip_address: string;
  cidr_notation: string;
  description: string;
  is_active: boolean;
  created_by: number | null;
  created_by_email: string | null;
  created_at: string;
  updated_at: string;
}

export interface IPWhitelistCreateRequest {
  ip_address: string;
  cidr_notation?: string;
  description?: string;
  is_active?: boolean;
}

export interface IPWhitelistUpdateRequest {
  ip_address?: string;
  cidr_notation?: string;
  description?: string;
  is_active?: boolean;
}

export interface IPWhitelistSettings {
  ip_whitelist_enabled: boolean;
  superadmin_bypass_whitelist: boolean;
  entries: IPWhitelistEntry[];
}

export interface IPWhitelistToggleRequest {
  enabled?: boolean;
  superadmin_bypass?: boolean;
}

export interface IPWhitelistToggleResponse {
  ip_whitelist_enabled: boolean;
  superadmin_bypass_whitelist: boolean;
  message: string;
}

export interface CurrentIPInfo {
  ip_address: string;
  city: string;
  country: string;
  country_code: string;
}
