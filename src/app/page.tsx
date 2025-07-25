'use client';

import { useTenant } from '@/contexts/TenantContext';
import TenantDashboard from '@/components/TenantDashboard';
import LandingPage from '@/components/LandingPage';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorMessage from '@/components/ErrorMessage';

export default function Home() {
  const { tenant, loading, error } = useTenant();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage error={error} />;
  }

  // If tenant exists, show tenant dashboard
  if (tenant) {
    return <TenantDashboard tenant={tenant} />;
  }

  // If no tenant, show landing page
  return <LandingPage />;
}
