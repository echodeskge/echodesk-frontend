"use client";

import { Users, MessageSquare, HardDrive } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
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
      <Card className="w-full">
        <CardHeader>
          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="h-16 bg-gray-200 rounded animate-pulse" />
            <div className="h-16 bg-gray-200 rounded animate-pulse" />
            <div className="h-16 bg-gray-200 rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>
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
    if (!check) return "text-gray-600";
    if (status.isExceeded) return "text-red-600";
    if (status.isNearLimit) return "text-amber-600";
    return "text-green-600";
  };

  const getProgressColor = (check: unknown, status: LimitStatus) => {
    if (!check) return "";
    if (status.isExceeded) return "bg-red-500";
    if (status.isNearLimit) return "bg-amber-500";
    return "";
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>
          {t('description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Users */}
        <div>
          <div className="flex justify-between mb-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">{t('activeUsers')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${getUsageColor(usage_limits?.users, usersStatus)}`}>
                {usage?.current_users || 0} / {limits?.max_users || t('unlimited')}
              </span>
              {usersStatus.isExceeded && (
                <Badge variant="destructive" className="text-xs">
                  {t('badges.limitExceeded')}
                </Badge>
              )}
              {usersStatus.isNearLimit && (
                <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">
                  {t('badges.nearLimit')}
                </Badge>
              )}
            </div>
          </div>
          <Progress
            value={usersStatus.percentUsed}
            className={`h-2 ${getProgressColor(usage_limits?.users, usersStatus)}`}
          />
        </div>

        {/* WhatsApp Messages */}
        <div>
          <div className="flex justify-between mb-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">{t('whatsappMessages')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${getUsageColor(usage_limits?.whatsapp, whatsappStatus)}`}>
                {usage?.whatsapp_messages_used || 0} /{" "}
                {limits?.max_whatsapp_messages === -1
                  ? t('unlimited')
                  : limits?.max_whatsapp_messages || 0}
              </span>
              {whatsappStatus.isExceeded && (
                <Badge variant="destructive" className="text-xs">
                  {t('badges.limitExceeded')}
                </Badge>
              )}
              {whatsappStatus.isNearLimit && (
                <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">
                  {t('badges.nearLimit')}
                </Badge>
              )}
            </div>
          </div>
          {limits?.max_whatsapp_messages !== -1 && (
            <Progress
              value={whatsappStatus.percentUsed}
              className={`h-2 ${getProgressColor(usage_limits?.whatsapp, whatsappStatus)}`}
            />
          )}
        </div>

        {/* Storage */}
        <div>
          <div className="flex justify-between mb-2">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">{t('storageUsed')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${getUsageColor(usage_limits?.storage, storageStatus)}`}>
                {formatStorage(usage?.storage_used_gb || 0)} /{" "}
                {formatStorage(limits?.max_storage_gb || 0)}
              </span>
              {storageStatus.isExceeded && (
                <Badge variant="destructive" className="text-xs">
                  {t('badges.limitExceeded')}
                </Badge>
              )}
              {storageStatus.isNearLimit && (
                <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">
                  {t('badges.nearLimit')}
                </Badge>
              )}
            </div>
          </div>
          <Progress
            value={storageStatus.percentUsed}
            className={`h-2 ${getProgressColor(usage_limits?.storage, storageStatus)}`}
          />
        </div>
      </CardContent>
    </Card>
  );
}
