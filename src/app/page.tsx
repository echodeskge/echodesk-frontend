'use client';

import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import TenantDashboard from '@/components/TenantDashboard';
import LandingPage from '@/components/LandingPage';
import LoginForm from '@/components/LoginForm';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorMessage from '@/components/ErrorMessage';

export default function Home() {
  const { tenant, loading: tenantLoading, error } = useTenant();
  const { isAuthenticated, loading: authLoading, login } = useAuth();

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
    if (isAuthenticated) {
      // User is logged in, show dashboard
      return <TenantDashboard tenant={tenant} />;
    } else {
      // User is not logged in, show login form
      return <LoginForm tenant={tenant} onLogin={login} />;
    }
  }

  // If no tenant (main domain), show landing page
  return <LandingPage />;
}
