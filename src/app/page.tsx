'use client';

import { useEffect, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import LandingPage from '@/components/LandingPage';
import LoginForm from '@/components/LoginForm';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorMessage from '@/components/ErrorMessage';

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
        showNotification('success', '✅ Facebook Connected', successMessage);
      } else if (facebookStatus === 'error') {
        const errorMessage = message || 'Failed to connect Facebook';
        showNotification('error', '❌ Facebook Connection Failed', decodeURIComponent(errorMessage));
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
      router.push('/tickets');
    }
  }, [tenant, isAuthenticated, user, authLoading, tenantLoading, router]);

  const showNotification = (type: 'success' | 'error', title: string, message: string) => {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      background: ${type === 'success' ? '#d4f4dd' : '#f8d7da'};
      color: ${type === 'success' ? '#28a745' : '#721c24'};
      border: 1px solid ${type === 'success' ? '#28a745' : '#f5c6cb'};
      border-radius: 8px;
      padding: 16px 20px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      max-width: 400px;
      font-family: system-ui, -apple-system, sans-serif;
      animation: slideIn 0.3s ease-out;
    `;

    notification.innerHTML = `
      <div style="display: flex; align-items: flex-start; gap: 12px;">
        <div style="flex: 1;">
          <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">${title}</div>
          <div style="font-size: 13px; line-height: 1.4;">${message}</div>
        </div>
        <button onclick="this.parentElement.parentElement.remove()" style="
          background: transparent;
          border: none;
          font-size: 18px;
          cursor: pointer;
          color: inherit;
          padding: 0;
          line-height: 1;
        ">×</button>
      </div>
    `;

    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => notification.remove(), 300);
      }
    }, 5000);
  };

  // Show loading spinner while checking tenant and auth
  if (tenantLoading || authLoading) {
    return <LoadingSpinner />;
  }

  // Show error if tenant loading failed
  if (error) {
    return <ErrorMessage error={error} />;
  }

  // If tenant exists (subdomain), show login form
  // Authenticated users will be redirected to /tickets by useEffect above
  if (tenant) {
    if (isAuthenticated && user) {
      // Redirect will happen via useEffect
      return <LoadingSpinner message="Redirecting to dashboard..." />;
    } else {
      // User is not logged in, show login form
      return <LoginForm tenant={tenant} onLogin={login} />;
    }
  }

  // If no tenant (main domain), show landing page
  return <LandingPage />;
}

export default function Home() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <HomeContent />
    </Suspense>
  );
}
