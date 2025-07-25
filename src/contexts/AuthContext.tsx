'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useTenant } from './TenantContext';

interface User {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  is_staff?: boolean;
  is_active?: boolean;
  [key: string]: unknown;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (token: string, userData: User) => void;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { tenant } = useTenant();

  const login = (authToken: string, userData: User) => {
    setToken(authToken);
    setUser(userData);
    localStorage.setItem('authToken', authToken);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  };

  const checkAuth = async (): Promise<boolean> => {
    const storedToken = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('user');

    if (!storedToken || !storedUser || !tenant) {
      setLoading(false);
      return false;
    }

    try {
      // Use tenant-specific API for user validation
      const apiUrl = tenant.api_url;
      const response = await fetch(`${apiUrl}/users/me/`, {
        method: 'GET',
        headers: {
          'Authorization': `Token ${storedToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Origin': typeof window !== 'undefined' ? window.location.origin : '',
        },
        mode: 'cors',
      });

      if (response.ok) {
        const userData = await response.json();
        setToken(storedToken);
        setUser(userData);
        setLoading(false);
        return true;
      } else {
        // Token is invalid, clear storage
        logout();
        setLoading(false);
        return false;
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      // On network error, try to use stored user data temporarily
      try {
        const userData = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(userData);
        setLoading(false);
        return true;
      } catch {
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
