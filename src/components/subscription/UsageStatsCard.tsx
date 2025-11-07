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

  const getUsageColor = (limit: any) => {
    if (!limit) return "text-gray-600";
    if (limit.is_exceeded) return "text-red-600";
    if (limit.is_near_limit) return "text-amber-600";
    return "text-green-600";
  };

  const getProgressColor = (limit: any) => {
    if (!limit) return "";
    if (limit.is_exceeded) return "bg-red-500";
    if (limit.is_near_limit) return "bg-amber-500";
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
              <span className={`text-sm font-medium ${getUsageColor(usage_limits?.users)}`}>
                {usage?.current_users || 0} / {limits?.max_users || t('unlimited')}
              </span>
              {usage_limits?.users?.is_exceeded && (
                <Badge variant="destructive" className="text-xs">
                  {t('badges.limitExceeded')}
                </Badge>
              )}
              {usage_limits?.users?.is_near_limit && !usage_limits?.users?.is_exceeded && (
                <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">
                  {t('badges.nearLimit')}
                </Badge>
              )}
            </div>
          </div>
          <Progress
            value={usage_limits?.users?.percent_used || 0}
            className={`h-2 ${getProgressColor(usage_limits?.users)}`}
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
              <span className={`text-sm font-medium ${getUsageColor(usage_limits?.whatsapp)}`}>
                {usage?.whatsapp_messages_used || 0} /{" "}
                {limits?.max_whatsapp_messages === -1
                  ? t('unlimited')
                  : limits?.max_whatsapp_messages || 0}
              </span>
              {usage_limits?.whatsapp?.is_exceeded && (
                <Badge variant="destructive" className="text-xs">
                  {t('badges.limitExceeded')}
                </Badge>
              )}
              {usage_limits?.whatsapp?.is_near_limit && !usage_limits?.whatsapp?.is_exceeded && (
                <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">
                  {t('badges.nearLimit')}
                </Badge>
              )}
            </div>
          </div>
          {limits?.max_whatsapp_messages !== -1 && (
            <Progress
              value={usage_limits?.whatsapp?.percent_used || 0}
              className={`h-2 ${getProgressColor(usage_limits?.whatsapp)}`}
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
              <span className={`text-sm font-medium ${getUsageColor(usage_limits?.storage)}`}>
                {formatStorage(usage?.storage_used_gb || 0)} /{" "}
                {formatStorage(limits?.max_storage_gb || 0)}
              </span>
              {usage_limits?.storage?.is_exceeded && (
                <Badge variant="destructive" className="text-xs">
                  {t('badges.limitExceeded')}
                </Badge>
              )}
              {usage_limits?.storage?.is_near_limit && !usage_limits?.storage?.is_exceeded && (
                <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">
                  {t('badges.nearLimit')}
                </Badge>
              )}
            </div>
          </div>
          <Progress
            value={usage_limits?.storage?.percent_used || 0}
            className={`h-2 ${getProgressColor(usage_limits?.storage)}`}
          />
        </div>
      </CardContent>
    </Card>
  );
}
