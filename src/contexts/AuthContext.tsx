'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTenant } from './TenantContext';
import { AuthUser } from '@/types/auth';
import { authService } from '@/services/auth';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (token: string, userData: AuthUser) => void;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { tenant } = useTenant();
  const queryClient = useQueryClient();

  const login = (authToken: string, userData: AuthUser) => {
    setToken(authToken);
    setUser(userData);

    // Update React Query cache to prevent duplicate fetch
    queryClient.setQueryData(['userProfile'], userData);

    // Also save using authService for consistency
    if (tenant) {
      const tenantInfo = {
        id: tenant.schema_name,
        name: tenant.tenant_name,
        schema_name: tenant.schema_name,
        domain: `${tenant.schema_name}.echodesk.ge`,
        api_url: tenant.api_url,
        theme: tenant.theme,
      };
      authService.saveAuthData(authToken, userData, tenantInfo);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    authService.clearLocalAuth();

    // Clear React Query cache
    queryClient.removeQueries({ queryKey: ['userProfile'] });
  };

  const checkAuth = async (): Promise<boolean> => {
    const { token: storedToken, user: storedUser } = authService.getStoredAuthData();

    // If no token exists, don't make API call - just set loading to false
    if (!storedToken) {
      setLoading(false);
      return false;
    }

    // If no user or tenant, clear auth state
    if (!storedUser || !tenant) {
      setLoading(false);
      return false;
    }

    try {
      // Set tenant for auth service
      const tenantInfo = {
        id: tenant.schema_name,
        name: tenant.tenant_name,
        schema_name: tenant.schema_name,
        domain: `${tenant.schema_name}.echodesk.ge`,
        api_url: tenant.api_url,
        theme: tenant.theme,
      };
      authService.setTenant(tenantInfo);

      // Validate token by fetching current user
      const userData = await authService.getCurrentUser();
      setToken(storedToken);
      setUser(userData);

      // Update React Query cache to prevent duplicate fetch
      queryClient.setQueryData(['userProfile'], userData);

      setLoading(false);
      return true;
    } catch (error) {
      console.error('Auth check failed:', error);
      // On validation failure, try to use stored user data temporarily
      if (storedUser) {
        setToken(storedToken);
        setUser(storedUser);
        setLoading(false);
        return true;
      } else {
        logout();
        setLoading(false);
        return false;
      }
    }
  };

  // Reset auth when tenant changes
  useEffect(() => {
    if (tenant) {
      checkAuth();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant]); // checkAuth is intentionally omitted to avoid infinite loops

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    loading,
    login,
    logout,
    checkAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
