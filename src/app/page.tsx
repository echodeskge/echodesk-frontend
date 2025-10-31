'use client';

import { useEffect, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { EchoDeskLanding } from '@/components/landing';
import LoginForm from '@/components/LoginForm';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorMessage from '@/components/ErrorMessage';
import { toast } from 'sonner';

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { tenant, loading: tenantLoading, error } = useTenant();
  const { isAuthenticated, user, loading: authLoading, login } = useAuth();

  const handleOAuthCallback = useCallback(() => {
    if (typeof window === 'undefined') return;

    const facebookStatus = searchParams.get('facebook_status');
    const message = searchParams.get('message');
    const pages = searchParams.get('pages');

    // Handle Facebook OAuth callback
    if (facebookStatus) {
      if (facebookStatus === 'connected') {
        const successMessage = message || `Successfully connected ${pages || '0'} Facebook page(s)`;
        toast.success('✅ Facebook Connected', {
          description: successMessage,
        });
      } else if (facebookStatus === 'error') {
        const errorMessage = message || 'Failed to connect Facebook';
        toast.error('❌ Facebook Connection Failed', {
          description: decodeURIComponent(errorMessage),
        });
      }

      // Clean up URL parameters
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }

  }, [searchParams]);

  useEffect(() => {
    // Handle OAuth callback parameters
    handleOAuthCallback();
  }, [handleOAuthCallback]);

  // Redirect authenticated users on tenant subdomains to tickets
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (tenant && isAuthenticated && user && !authLoading && !tenantLoading) {
      // User is authenticated on a tenant subdomain, redirect to tickets
      router.replace('/tickets');
    }
  }, [tenant, isAuthenticated, user, authLoading, tenantLoading, router]);

  // Show error if tenant loading failed
  if (error) {
    return <ErrorMessage error={error} />;
  }

  // Default to loading state - this prevents flash of login page
  if (tenantLoading || authLoading) {
    return <LoadingSpinner />;
  }

  // If tenant exists (subdomain), handle authentication
  if (tenant) {
    // If authenticated, show loading while redirect happens
    if (isAuthenticated && user) {
      return <LoadingSpinner message="Redirecting to dashboard..." />;
    }

    // Only show login form if we're EXPLICITLY not authenticated
    // This ensures loading screen shows first
    if (isAuthenticated === false) {
      return <LoginForm tenant={tenant} onLogin={login} />;
    }

    // Default to loading for any uncertain state
    return <LoadingSpinner />;
  }

  // If no tenant (main domain), show landing page only after loading completes
  if (!tenantLoading) {
    return <EchoDeskLanding />;
  }

  // Final fallback to loading
  return <LoadingSpinner />;
}

export default function Home() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <HomeContent />
    </Suspense>
  );
}
