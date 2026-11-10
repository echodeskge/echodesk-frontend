'use client';

import React, { ReactNode } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Lock, AlertCircle, type LucideIcon } from 'lucide-react';
import { useSubscription, SubscriptionFeature } from '@/contexts/SubscriptionContext';
import { rdButton } from '@/components/redesign/buttons';
import { cn } from '@/lib/utils';

interface FeatureGateProps {
  feature: SubscriptionFeature;
  children: ReactNode;
  fallback?: ReactNode;
  showUpgrade?: boolean;
  customMessage?: string;
}

/** Theme-aware loading skeleton (one 40px row on `bg-muted`). */
function GateSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="h-10 w-full animate-pulse rounded-md bg-muted" data-testid="feature-gate-loading" />
  );
}

/** Locked block: 10px card, icon tile, title, description and the upgrade link. */
function GateBlock({
  icon: Icon,
  title,
  description,
  action,
  testId,
}: {
  icon: LucideIcon;
  title: string;
  description: ReactNode;
  action: string;
  testId: string;
}) {
  return (
    <div role="alert" className="my-4 flex gap-3 rounded-[10px] border bg-card p-4" data-testid={testId}>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon aria-hidden="true" size={16} />
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-[13px] text-muted-foreground [text-wrap:pretty]">{description}</p>
        <Link href="/settings/subscription" className={cn(rdButton.outline, 'mt-2 self-start')} data-testid={`${testId}-upgrade`}>
          {action}
        </Link>
      </div>
    </div>
  );
}

/**
 * FeatureGate component - Conditionally renders children based on subscription features
 *
 * Usage:
 * <FeatureGate feature="ip_calling">
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
  const t = useTranslations('featureGate');
  const { hasFeature, loading } = useSubscription();

  if (loading) {
    return <GateSkeleton label={t('loading')} />;
  }

  const featureEnabled = hasFeature(feature);

  if (!featureEnabled) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (showUpgrade) {
      return (
        <GateBlock
          icon={Lock}
          title={t('notAvailableTitle')}
          description={customMessage || t('notAvailableDescription')}
          action={t('upgradePlan')}
          testId="feature-gate-locked"
        />
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
  const t = useTranslations('featureGate');
  const { isWithinLimit, subscription, loading } = useSubscription();

  if (loading) {
    return <GateSkeleton label={t('loading')} />;
  }

  const withinLimit = isWithinLimit(limitType);

  if (!withinLimit) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (showWarning) {
      const limitInfo = subscription?.usage_limits?.[limitType];
      const usage =
        limitInfo && limitInfo.limit != null ? t('limitUsage', { current: limitInfo.current ?? 0, limit: limitInfo.limit }) : '';
      return (
        <GateBlock
          icon={AlertCircle}
          title={t('limitTitle')}
          description={t('limitDescription', { limit: t(`limits.${limitType}`), usage })}
          action={t('upgradePlan')}
          testId="limit-gate-reached"
        />
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
