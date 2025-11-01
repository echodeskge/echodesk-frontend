'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useTenantSubscription } from '@/hooks/api';

// Subscription feature flags
export type SubscriptionFeature =
  | 'ticket_management'
  | 'email_integration'
  | 'sip_calling'
  | 'facebook_integration'
  | 'instagram_integration'
  | 'whatsapp_integration'
  | 'advanced_analytics'
  | 'api_access'
  | 'custom_integrations'
  | 'priority_support'
  | 'dedicated_account_manager'
  | 'ecommerce_crm'
  | 'order_management'
  | 'user_management'
  | 'settings';

export interface SubscriptionPackage {
  id: number;
  name: string;
  pricing_model: string;
}

export interface SubscriptionDetails {
  is_active: boolean;
  starts_at: string;
  expires_at: string | null;
  monthly_cost: number;
  agent_count: number;
}

export interface SubscriptionFeatures {
  ticket_management: boolean;
  email_integration: boolean;
  sip_calling: boolean;
  facebook_integration: boolean;
  instagram_integration: boolean;
  whatsapp_integration: boolean;
  advanced_analytics: boolean;
  api_access: boolean;
  custom_integrations: boolean;
  priority_support: boolean;
  dedicated_account_manager: boolean;
  ecommerce_crm: boolean;
  order_management: boolean;
  user_management: boolean;
  settings: boolean;
}

export interface SubscriptionLimits {
  max_users: number | null;
  max_whatsapp_messages: number;
  max_storage_gb: number;
}

export interface SubscriptionUsage {
  current_users: number;
  whatsapp_messages_used: number;
  storage_used_gb: number;
}

export interface UsageLimitCheck {
  within_limit: boolean;
  current: number;
  limit: number | null;
  usage_percentage: number;
}

export interface SubscriptionInfo {
  has_subscription: boolean;
  package?: SubscriptionPackage;
  subscription?: SubscriptionDetails;
  features: SubscriptionFeatures;
  limits?: SubscriptionLimits;
  usage?: SubscriptionUsage;
  usage_limits?: {
    users: UsageLimitCheck;
    whatsapp: UsageLimitCheck;
    storage: UsageLimitCheck;
  };
  error?: string;
}

interface SubscriptionContextType {
  subscription: SubscriptionInfo | null;
  loading: boolean;
  error: string | null;
  hasFeature: (feature: SubscriptionFeature) => boolean;
  isWithinLimit: (limitType: 'users' | 'whatsapp' | 'storage') => boolean;
  refreshSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();

  // Use React Query hook for subscription data
  const {
    data: subscriptionData,
    isLoading: loading,
    error: queryError,
    refetch
  } = useTenantSubscription();

  // Process the subscription data or use defaults
  const subscription: SubscriptionInfo | null = subscriptionData || (queryError ? {
    has_subscription: false,
    features: {
      ticket_management: true,  // Always allow basic features
      email_integration: true,
      sip_calling: false,
      facebook_integration: false,
      instagram_integration: false,
      whatsapp_integration: false,
      advanced_analytics: false,
      api_access: false,
      custom_integrations: false,
      priority_support: false,
      dedicated_account_manager: false,
      ecommerce_crm: false,
      order_management: false,
      user_management: false,
      settings: true,  // Always allow settings access
    },
    error: 'Failed to load subscription',
  } : null);

  const error = queryError ? 'Failed to load subscription' : null;

  const hasFeature = (feature: SubscriptionFeature): boolean => {
    // Superadmins (staff/superuser) have access to ALL features
    if (user?.is_staff || user?.is_superuser) {
      return true;
    }

    // Lock ALL features if no subscription exists
    if (!subscription || !subscription.has_subscription) {
      return false;
    }

    return subscription.features[feature] || false;
  };

  const isWithinLimit = (limitType: 'users' | 'whatsapp' | 'storage'): boolean => {
    if (!subscription || !subscription.usage_limits) {
      return true; // Assume within limits if we can't check
    }

    return subscription.usage_limits[limitType]?.within_limit ?? true;
  };

  const refreshSubscription = async () => {
    await refetch();
  };

  const value: SubscriptionContextType = {
    subscription,
    loading,
    error,
    hasFeature,
    isWithinLimit,
    refreshSubscription,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = (): SubscriptionContextType => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

// Convenience hook for checking features
export const useFeature = (feature: SubscriptionFeature): boolean => {
  const { hasFeature } = useSubscription();
  return hasFeature(feature);
};

// Convenience hook for checking limits
export const useLimit = (limitType: 'users' | 'whatsapp' | 'storage'): boolean => {
  const { isWithinLimit } = useSubscription();
  return isWithinLimit(limitType);
};
