import { createAxiosInstance } from '@/api/axios';
import { usersMeRetrieve } from '@/api/generated/api';
import { User } from '@/api/generated/interfaces';
import { LoginRequest, LoginResponse, AuthUser, TenantInfo } from '@/types/auth';

export class AuthService {
  private static instance: AuthService;
  private axiosInstance = createAxiosInstance();

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // Set tenant-specific axios instance
  setTenant(tenant: TenantInfo) {
    this.axiosInstance = createAxiosInstance(tenant.api_url);
  }

  // Login user
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      // Use the generated API function, but we need to adapt it since the generated
      // function expects a User object but login typically expects email/password
      const response = await this.axiosInstance.post('/api/users/login/', credentials);
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  // Get current user profile
  async getCurrentUser(): Promise<User> {
    try {
      return await usersMeRetrieve();
    } catch (error) {
      console.error('Get current user error:', error);
      throw error;
    }
  }

  // Logout user
  async logout(): Promise<void> {
    try {
      await this.axiosInstance.post('/api/users/logout/');
    } catch (error) {
      console.error('Logout error:', error);
      // Continue with local logout even if API call fails
    } finally {
      this.clearLocalAuth();
    }
  }

  // Clear local authentication data
  clearLocalAuth(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      localStorage.removeItem('tenant');
    }
  }

  // Save authentication data locally
  saveAuthData(token: string, user: AuthUser, tenant?: TenantInfo): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('authToken', token);
      localStorage.setItem('user', JSON.stringify(user));
      if (tenant) {
        localStorage.setItem('tenant', JSON.stringify(tenant));
      }
    }
  }

  // Get stored authentication data
  getStoredAuthData(): { token: string | null; user: AuthUser | null; tenant: TenantInfo | null } {
    if (typeof window === 'undefined') {
      return { token: null, user: null, tenant: null };
    }

    const token = localStorage.getItem('authToken');
    const userStr = localStorage.getItem('user');
    const tenantStr = localStorage.getItem('tenant');

    return {
      token,
      user: userStr ? JSON.parse(userStr) : null,
      tenant: tenantStr ? JSON.parse(tenantStr) : null,
    };
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    const { token } = this.getStoredAuthData();
    return !!token;
  }

  // Get tenant info from subdomain
  async getTenantInfo(subdomain: string): Promise<TenantInfo> {
    try {
      const response = await this.axiosInstance.get(`/api/tenants/${subdomain}/`);
      return response.data;
    } catch (error) {
      console.error('Get tenant info error:', error);
      throw error;
    }
  }
}

export const authService = AuthService.getInstance();
