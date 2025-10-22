'use client';

import React, { ReactNode } from 'react';
import { useSubscription, SubscriptionFeature } from '@/contexts/SubscriptionContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Lock, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface FeatureGateProps {
  feature: SubscriptionFeature;
  children: ReactNode;
  fallback?: ReactNode;
  showUpgrade?: boolean;
  customMessage?: string;
}

/**
 * FeatureGate component - Conditionally renders children based on subscription features
 *
 * Usage:
 * <FeatureGate feature="sip_calling">
 *   <CallButton />
 * </FeatureGate>
 */
export const FeatureGate: React.FC<FeatureGateProps> = ({
  feature,
  children,
  fallback,
  showUpgrade = true,
  customMessage,
}) => {
  const { hasFeature, subscription, loading } = useSubscription();

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-200 rounded h-10 w-full" />
    );
  }

  const featureEnabled = hasFeature(feature);

  if (!featureEnabled) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (showUpgrade) {
      return (
        <Alert variant="destructive" className="my-4">
          <Lock className="h-4 w-4" />
          <AlertTitle>Feature Not Available</AlertTitle>
          <AlertDescription>
            {customMessage || `This feature is not included in your current plan.`}
            <div className="mt-2">
              <Link href="/settings/subscription">
                <Button variant="outline" size="sm">
                  Upgrade Plan
                </Button>
              </Link>
            </div>
          </AlertDescription>
        </Alert>
      );
    }

    return null;
  }

  return <>{children}</>;
};

interface LimitGateProps {
  limitType: 'users' | 'whatsapp' | 'storage';
  children: ReactNode;
  fallback?: ReactNode;
  showWarning?: boolean;
}

/**
 * LimitGate component - Conditionally renders based on usage limits
 *
 * Usage:
 * <LimitGate limitType="whatsapp">
 *   <SendWhatsAppButton />
 * </LimitGate>
 */
export const LimitGate: React.FC<LimitGateProps> = ({
  limitType,
  children,
  fallback,
  showWarning = true,
}) => {
  const { isWithinLimit, subscription, loading } = useSubscription();

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-200 rounded h-10 w-full" />
    );
  }

  const withinLimit = isWithinLimit(limitType);

  if (!withinLimit) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (showWarning) {
      const limitInfo = subscription?.usage_limits?.[limitType];
      return (
        <Alert variant="destructive" className="my-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Usage Limit Reached</AlertTitle>
          <AlertDescription>
            You have reached your {limitType} limit
            {limitInfo && ` (${limitInfo.current} / ${limitInfo.limit})`}.
            <div className="mt-2">
              <Link href="/settings/subscription">
                <Button variant="outline" size="sm">
                  Upgrade Plan
                </Button>
              </Link>
            </div>
          </AlertDescription>
        </Alert>
      );
    }

    return null;
  }

  return <>{children}</>;
};

// Higher-order component for feature gating
export function withFeatureGate<P extends object>(
  Component: React.ComponentType<P>,
  feature: SubscriptionFeature,
  options?: { fallback?: ReactNode; showUpgrade?: boolean }
) {
  const FeatureGatedComponent = (props: P) => (
    <FeatureGate
      feature={feature}
      fallback={options?.fallback}
      showUpgrade={options?.showUpgrade}
    >
      <Component {...props} />
    </FeatureGate>
  );

  FeatureGatedComponent.displayName = `withFeatureGate(${Component.displayName || Component.name || 'Component'})`;

  return FeatureGatedComponent;
}
