'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { TenantConfig } from '@/types/tenant';
import { tenantService } from '@/services/tenantService';
import { useTenantConfig } from '@/hooks/api/useTenant';

interface TenantContextType {
  tenant: TenantConfig | null;
  loading: boolean;
  error: string | null;
  refreshTenant: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

interface TenantProviderProps {
  children: ReactNode;
}

export function TenantProvider({ children }: TenantProviderProps) {
  const [tenantIdentifier, setTenantIdentifier] = useState<string | null>(null);
  const [shouldLoadTenant, setShouldLoadTenant] = useState(false);

  // Determine tenant identifier from hostname
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hostname = window.location.hostname;
    const pathname = window.location.pathname;

    let identifier: string | null = null;

    // On localhost, check localStorage first for development mode
    if (hostname.includes('localhost')) {
      const storedTenant = localStorage.getItem('dev_tenant');
      if (storedTenant) {
        identifier = storedTenant;
      }
    } else {
      // On production, use subdomain-based detection
      identifier = tenantService.getSubdomainFromHostname(hostname);
    }

    // If on root path "/" with no tenant identifier, don't load tenant
    // This prevents infinite 401 loops when visiting the main landing page (echodesk.ge)
    if (pathname === '/' && !identifier) {
      setTenantIdentifier(null);
      setShouldLoadTenant(false);
      return;
    }

    setTenantIdentifier(identifier);
    setShouldLoadTenant(!!identifier);
  }, []);

  // Use React Query to fetch tenant config
  const {
    data: tenant,
    isLoading: loading,
    error: queryError,
    refetch
  } = useTenantConfig(tenantIdentifier, { enabled: shouldLoadTenant });

  const error = queryError
    ? (queryError instanceof Error ? queryError.message : 'Failed to load tenant')
    : (tenant === null && shouldLoadTenant ? `Tenant not found for identifier: ${tenantIdentifier}` : null);

  const refreshTenant = async () => {
    await refetch();
  };

  const value = {
    tenant,
    loading,
    error,
    refreshTenant,
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}
