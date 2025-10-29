// Authentication related types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token?: string;
  access_token?: string;
  key?: string;
  user: AuthUser;
}

export interface AuthUser {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  is_active?: boolean;
  is_staff?: boolean;
  is_superuser?: boolean;
  date_joined?: string;
}

export interface TenantInfo {
  id: string;
  name: string;
  schema_name: string;
  domain: string;
  api_url: string;
  theme: {
    primary_color: string;
    secondary_color: string;
    logo_url?: string;
    company_name?: string;
  };
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  tenant: TenantInfo | null;
}
