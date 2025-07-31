import { tenantService } from './tenantService';
import { 
  tenantLogin, 
  tenantLogout, 
  tenantDashboard, 
  tenantProfile,
  updateTenantProfile,
  changeTenantPassword 
} from '../api/generated/api';
import type { TenantLogin as TenantLoginType, User as GeneratedUser } from '../api/generated/interfaces';

export type User = GeneratedUser;

export interface TenantInfo {
  id: number;
  name: string;
  description: string;
  domain_url: string;
  preferred_language: string;
  plan: string;
  frontend_url: string;
  deployment_status: string;
  created_on: string;
  is_active: boolean;
}

export interface DashboardData {
  tenant_info: TenantInfo;
  user_info: User;
  statistics: {
    users: { total: number; active: number };
    tickets: { total: number; open: number };
    customers: { total: number; active: number };
  };
}

export interface LoginResponse {
  message: string;
  token: string;
  dashboard_data: DashboardData;
}

export interface LoginCredentials extends TenantLoginType {
  email: string;
  password: string;
}

export interface PasswordChangeData {
  old_password: string;
  new_password: string;
}

export interface ProfileUpdateData {
  first_name?: string;
  last_name?: string;
}

class AuthService {
  private storageKey = 'echodesk_auth_token';
  private userKey = 'echodesk_user_data';
  private tenantKey = 'echodesk_tenant_data';

  /**
   * Get the API URL for the current tenant
   */
  private getTenantApiUrl(): string {
    const subdomain = tenantService.getCurrentSubdomain();
    if (!subdomain) {
      throw new Error('No tenant subdomain found');
    }
    return tenantService.getPublicTenantApiUrl(subdomain);
  }

  /**
   * Get stored authentication token
   */
  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(this.storageKey);
  }

  /**
   * Store authentication token
   */
  private setToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.storageKey, token);
    }
  }

  /**
   * Remove authentication token
   */
  private removeToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.storageKey);
      localStorage.removeItem(this.userKey);
      localStorage.removeItem(this.tenantKey);
    }
  }

  /**
   * Store user and tenant data
   */
  private setUserData(dashboardData: DashboardData): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.userKey, JSON.stringify(dashboardData.user_info));
      localStorage.setItem(this.tenantKey, JSON.stringify(dashboardData.tenant_info));
    }
  }

  /**
   * Get stored user data
   */
  getUser(): User | null {
    if (typeof window === 'undefined') return null;
    const userData = localStorage.getItem(this.userKey);
    return userData ? JSON.parse(userData) : null;
  }

  /**
   * Get stored tenant data
   */
  getTenant(): TenantInfo | null {
    if (typeof window === 'undefined') return null;
    const tenantData = localStorage.getItem(this.tenantKey);
    return tenantData ? JSON.parse(tenantData) : null;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  /**
   * Get authorization headers
   */
  private getAuthHeaders(): HeadersInit {
    const token = this.getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Token ${token}`;
    }

    return headers;
  }

  /**
   * Login to tenant dashboard
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      const response = await tenantLogin(credentials);
      
      if (response.token) {
        // Store token and user data
        this.setToken(response.token);
        
        // If dashboard_data is provided, parse and store it
        if (response.dashboard_data) {
          const dashboardData = response.dashboard_data as DashboardData;
          this.setUserData(dashboardData);
        }
      }

      return {
        message: response.message || 'Login successful',
        token: response.token || '',
        dashboard_data: response.dashboard_data as DashboardData
      };
    } catch (error: unknown) {
      console.error('Login error:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        const message = axiosError.response?.data?.message || 'Login failed';
        throw new Error(message);
      }
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error('Login failed');
    }
  }

  /**
   * Logout from tenant dashboard
   */
  async logout(): Promise<void> {
    try {
      await tenantLogout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always remove local storage data
      this.removeToken();
    }
  }

  /**
   * Get dashboard data for authenticated user
   */
  async getDashboardData(): Promise<DashboardData> {
    try {
      const response = await tenantDashboard();
      
      // Parse the response - the API returns strings that need to be parsed
      const dashboardData: DashboardData = {
        tenant_info: JSON.parse(response.tenant_info),
        user_info: JSON.parse(response.user_info),
        statistics: JSON.parse(response.statistics)
      };
      
      // Update stored user and tenant data
      this.setUserData(dashboardData);

      return dashboardData;
    } catch (error: unknown) {
      console.error('Dashboard data error:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number; data?: { message?: string } } };
        if (axiosError.response?.status === 401) {
          this.removeToken();
          throw new Error('Authentication expired');
        }
        throw new Error(axiosError.response?.data?.message || 'Failed to fetch dashboard data');
      }
      throw new Error('Failed to fetch dashboard data');
    }
  }

  /**
   * Get user profile
   */
  async getProfile(): Promise<User> {
    try {
      const response = await tenantProfile();
      
      // Cast the response to the full User interface
      const user = response as User;
      
      // Update stored user data
      if (typeof window !== 'undefined') {
        localStorage.setItem(this.userKey, JSON.stringify(user));
      }

      return user;
    } catch (error: unknown) {
      console.error('Profile fetch error:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number; data?: { message?: string } } };
        if (axiosError.response?.status === 401) {
          this.removeToken();
          throw new Error('Authentication expired');
        }
        throw new Error(axiosError.response?.data?.message || 'Failed to fetch profile');
      }
      throw new Error('Failed to fetch profile');
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(): Promise<User> {
    try {
      const response = await updateTenantProfile();
      
      const user = response.user as User;
      
      // Update stored user data
      if (typeof window !== 'undefined') {
        localStorage.setItem(this.userKey, JSON.stringify(user));
      }

      return user;
    } catch (error: unknown) {
      console.error('Profile update error:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number; data?: { message?: string } } };
        if (axiosError.response?.status === 401) {
          this.removeToken();
          throw new Error('Authentication expired');
        }
        const message = axiosError.response?.data?.message || 'Failed to update profile';
        throw new Error(message);
      }
      throw new Error('Failed to update profile');
    }
  }

  /**
   * Change password
   */
  async changePassword(): Promise<void> {
    try {
      await changeTenantPassword();

      // Password change requires re-login, so remove token
      this.removeToken();
    } catch (error: unknown) {
      console.error('Password change error:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number; data?: { message?: string } } };
        if (axiosError.response?.status === 401) {
          this.removeToken();
          throw new Error('Authentication expired');
        }
        const message = axiosError.response?.data?.message || 'Failed to change password';
        throw new Error(message);
      }
      throw new Error('Failed to change password');
    }
  }

  /**
   * Refresh user data from server
   */
  async refreshUserData(): Promise<void> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      await this.getDashboardData();
    } catch (error) {
      console.error('Failed to refresh user data:', error);
      throw error;
    }
  }
}

export const authService = new AuthService();
