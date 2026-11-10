"use client";

import { Users, MessageSquare, HardDrive } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { TonePill } from "@/components/redesign/pill";
import { SettingsSection } from "@/components/redesign/settings";
import { useTranslations } from "next-intl";
import type { UsageLimitCheck } from "@/contexts/SubscriptionContext";

/** Usage at or above this percentage of the limit counts as "near limit". */
export const NEAR_LIMIT_PERCENT = 80;

export interface LimitStatus {
  isExceeded: boolean;
  isNearLimit: boolean;
  /** 0-100, for the progress bar. */
  percentUsed: number;
}

/**
 * Derive the card's display state from the backend's usage_limits entry
 * (tenants/permissions.py check_subscription_limit:
 * { within_limit, current, limit (null = unlimited), usage_percentage }).
 *
 * Exceeded = over the limit (current > limit) and not within it per the
 * backend; reaching the limit exactly (e.g. every seat used) is "near limit",
 * not exceeded. A null limit is unlimited and never exceeded.
 */
export function getLimitStatus(check?: Partial<UsageLimitCheck> | null): LimitStatus {
  if (!check) return { isExceeded: false, isNearLimit: false, percentUsed: 0 };
  const current = Number(check.current) || 0;
  const limit = check.limit ?? null;
  const percentage = Number(check.usage_percentage) || 0;
  const isExceeded = limit !== null && current > limit && check.within_limit !== true;
  const isNearLimit = !isExceeded && limit !== null && percentage >= NEAR_LIMIT_PERCENT;
  return {
    isExceeded,
    isNearLimit,
    percentUsed: Math.min(100, Math.max(0, percentage)),
  };
}

interface UsageStatsCardProps {
  subscription?: any;
  isLoading?: boolean;
}

export function UsageStatsCard({
  subscription,
  isLoading = false,
}: UsageStatsCardProps) {
  const t = useTranslations('subscription.usageStats');
  if (isLoading) {
    return (
      <SettingsSection title={t('title')} hint={t('description')} testId="usage-stats">
        <div className="flex flex-col gap-4 px-4 py-3.5" aria-busy="true">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </SettingsSection>
    );
  }

  if (!subscription || !subscription.has_subscription) {
    return null;
  }

  const { limits, usage, usage_limits } = subscription;

  const formatStorage = (gb: number) => {
    if (gb < 1) {
      return `${(gb * 1024).toFixed(0)} MB`;
    }
    return `${gb.toFixed(1)} GB`;
  };

  const usersStatus = getLimitStatus(usage_limits?.users);
  const whatsappStatus = getLimitStatus(usage_limits?.whatsapp);
  const storageStatus = getLimitStatus(usage_limits?.storage);

  const getUsageColor = (check: unknown, status: LimitStatus) => {
    if (!check) return "text-muted-foreground";
    if (status.isExceeded) return "text-red-600";
    if (status.isNearLimit) return "text-amber-600";
    return "text-green-600";
  };

  const getProgressColor = (check: unknown, status: LimitStatus) => {
    if (!check) return "";
    // Colour the filled indicator (the Progress child), not the track.
    if (status.isExceeded) return "[&>div]:bg-red-500";
    if (status.isNearLimit) return "[&>div]:bg-amber-500";
    return "";
  };

  const badges = (status: LimitStatus) => (
    <>
      {status.isExceeded && <TonePill tone="danger">{t('badges.limitExceeded')}</TonePill>}
      {status.isNearLimit && <TonePill tone="warning">{t('badges.nearLimit')}</TonePill>}
    </>
  );

  const row = (
    key: string,
    Icon: typeof Users,
    label: string,
    value: string,
    check: unknown,
    status: LimitStatus,
    showBar = true
  ) => (
    <div key={key} className="flex flex-col gap-2 border-b px-4 py-3.5 last:border-b-0" data-testid={`usage-${key}`}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <span className="flex min-w-0 items-center gap-2 text-[13px] font-medium">
          <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
          {label}
        </span>
        <span className="flex flex-wrap items-center gap-2">
          <span className={`text-[13px] font-medium tabular-nums ${getUsageColor(check, status)}`}>{value}</span>
          {badges(status)}
        </span>
      </div>
      {showBar && (
        <Progress value={status.percentUsed} className={`h-1.5 ${getProgressColor(check, status)}`} />
      )}
    </div>
  );

  return (
    <SettingsSection title={t('title')} hint={t('description')} testId="usage-stats">
      {row(
        "users",
        Users,
        t('activeUsers'),
        `${usage?.current_users || 0} / ${limits?.max_users || t('unlimited')}`,
        usage_limits?.users,
        usersStatus
      )}
      {row(
        "whatsapp",
        MessageSquare,
        t('whatsappMessages'),
        `${usage?.whatsapp_messages_used || 0} / ${
          limits?.max_whatsapp_messages === -1 ? t('unlimited') : limits?.max_whatsapp_messages || 0
        }`,
        usage_limits?.whatsapp,
        whatsappStatus,
        limits?.max_whatsapp_messages !== -1
      )}
      {row(
        "storage",
        HardDrive,
        t('storageUsed'),
        `${formatStorage(usage?.storage_used_gb || 0)} / ${formatStorage(limits?.max_storage_gb || 0)}`,
        usage_limits?.storage,
        storageStatus
      )}
    </SettingsSection>
  );
}
