'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Dashboard from '@/components/Dashboard';
import LoginForm from '@/components/LoginForm';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorMessage from '@/components/ErrorMessage';
import { TenantInfo } from '@/types/auth';
import { TenantConfig } from '@/types/tenant';
import { tenantService } from '@/services/tenantService';

export default function TenantPage() {
  const params = useParams();
  const tenantSlug = params.tenant as string;
  const { isAuthenticated, user, loading: authLoading, login, logout } = useAuth();
  
  const [tenant, setTenant] = useState<TenantConfig | null>(null);
  const [tenantLoading, setTenantLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTenant = async () => {
      try {
        setTenantLoading(true);
        setError(null);

        if (!tenantSlug) {
          setError('No tenant specified');
          return;
        }

        // Convert tenant slug to subdomain format (e.g., "amanati-tenant" -> "amanati")
        const subdomain = tenantSlug.replace(/-tenant$/, '');
        
        const tenantConfig = await tenantService.getTenantBySubdomain(subdomain);
        
        if (tenantConfig) {
          setTenant(tenantConfig);
        } else {
          setError(`Tenant not found: ${subdomain}`);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tenant');
      } finally {
        setTenantLoading(false);
      }
    };

    loadTenant();
  }, [tenantSlug]);

  // Show loading spinner while checking tenant and auth
  if (tenantLoading || authLoading) {
    return <LoadingSpinner message={`Loading ${tenantSlug}...`} />;
  }

  // Show error if tenant loading failed
  if (error) {
    return <ErrorMessage error={error} />;
  }

  // Show error if no tenant found
  if (!tenant) {
    return <ErrorMessage error="Tenant not found" />;
  }

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
