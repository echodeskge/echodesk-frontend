'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { TenantConfig } from '@/types/tenant';
import { tenantService } from '@/services/tenantService';

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
  const [tenant, setTenant] = useState<TenantConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTenant = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get hostname from window (client-side only)
      if (typeof window === 'undefined') {
        setLoading(false);
        return;
      }

      const hostname = window.location.hostname;
      const subdomain = tenantService.getSubdomainFromHostname(hostname);

      if (!subdomain) {
        // Not a tenant domain, set tenant to null
        setTenant(null);
        setLoading(false);
        return;
      }

      const tenantConfig = await tenantService.getTenantBySubdomain(subdomain);
      
      if (tenantConfig) {
        setTenant(tenantConfig);
      } else {
        setError(`Tenant not found for subdomain: ${subdomain}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tenant');
    } finally {
      setLoading(false);
    }
  };

  const refreshTenant = async () => {
    await loadTenant();
  };

  useEffect(() => {
    loadTenant();
  }, []);

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
