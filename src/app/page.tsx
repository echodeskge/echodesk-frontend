'use client';

import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import Dashboard from '@/components/Dashboard';
import LandingPage from '@/components/LandingPage';
import LoginForm from '@/components/LoginForm';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorMessage from '@/components/ErrorMessage';
import { TenantInfo } from '@/types/auth';

export default function Home() {
  const { tenant, loading: tenantLoading, error } = useTenant();
  const { isAuthenticated, user, loading: authLoading, login, logout } = useAuth();

  // Show loading spinner while checking tenant and auth
  if (tenantLoading || authLoading) {
    return <LoadingSpinner />;
  }

  // Show error if tenant loading failed
  if (error) {
    return <ErrorMessage error={error} />;
  }

  // If tenant exists (subdomain), show login form or dashboard
  if (tenant) {
    if (isAuthenticated && user) {
      // User is logged in, show dashboard
      const tenantInfo: TenantInfo = {
        id: tenant.schema_name,
        name: tenant.tenant_name,
        schema_name: tenant.schema_name,
        domain: `${tenant.schema_name}.echodesk.ge`,
        api_url: tenant.api_url,
        theme: tenant.theme,
      };
      
      return <Dashboard user={user} tenant={tenantInfo} onLogout={logout} />;
    } else {
      // User is not logged in, show login form
      return <LoginForm tenant={tenant} onLogin={login} />;
    }
  }

  // If no tenant (main domain), show landing page
  return <LandingPage />;
}
