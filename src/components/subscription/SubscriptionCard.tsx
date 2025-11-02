'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  Check,
  X,
  CreditCard,
  Users,
  MessageSquare,
  HardDrive,
  AlertCircle,
  Loader2
} from 'lucide-react';
import Link from 'next/link';

export const SubscriptionCard: React.FC = () => {
  const t = useTranslations('subscription.card');
  const tFeatures = useTranslations('subscription.features');
  const { subscription, loading, error } = useSubscription();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <CardTitle>{t('loading')}</CardTitle>
          </div>
        </CardHeader>
      </Card>
    );
  }

  if (error || !subscription?.has_subscription) {
    return (
      <Card className="border-red-200">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <CardTitle>{t('noSubscription')}</CardTitle>
          </div>
          <CardDescription>
            {error || t('noSubscriptionMessage')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/settings/subscription">
            <Button>{t('viewPlans')}</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const { package: pkg, subscription: sub, usage_limits } = subscription;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              {pkg?.name}
            </CardTitle>
            <CardDescription>
              {sub?.monthly_cost}₾/month
              {pkg?.pricing_model === 'Agent-based' && ` • ${sub?.agent_count} agents`}
            </CardDescription>
          </div>
          <Badge variant={sub?.is_active ? 'default' : 'secondary'}>
            {sub?.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Usage Statistics */}
        {usage_limits && (
          <div className="space-y-4">
            <h4 className="text-sm font-semibold">{t('usage')}</h4>

            {/* Users */}
            {usage_limits.users.limit !== null && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>Users</span>
                  </div>
                  <span className="text-muted-foreground">
                    {usage_limits.users.current} / {usage_limits.users.limit}
                  </span>
                </div>
                <Progress
                  value={usage_limits.users.usage_percentage}
                  className={
                    usage_limits.users.usage_percentage > 80
                      ? 'bg-red-200'
                      : ''
                  }
                />
              </div>
            )}

            {/* WhatsApp Messages */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  <span>WhatsApp Messages</span>
                </div>
                <span className="text-muted-foreground">
                  {usage_limits.whatsapp.current.toLocaleString()} / {usage_limits.whatsapp.limit?.toLocaleString()}
                </span>
              </div>
              <Progress
                value={usage_limits.whatsapp.usage_percentage}
                className={
                  usage_limits.whatsapp.usage_percentage > 80
                    ? 'bg-red-200'
                    : ''
                }
              />
              {!usage_limits.whatsapp.within_limit && (
                <p className="text-xs text-red-500">
                  {t('exceedLimit')}
                </p>
              )}
            </div>

            {/* Storage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4" />
                  <span>Storage</span>
                </div>
                <span className="text-muted-foreground">
                  {usage_limits.storage.current} GB / {usage_limits.storage.limit} GB
                </span>
              </div>
              <Progress
                value={usage_limits.storage.usage_percentage}
                className={
                  usage_limits.storage.usage_percentage > 80
                    ? 'bg-red-200'
                    : ''
                }
              />
            </div>
          </div>
        )}

        {/* Subscription Period */}
        {sub?.expires_at && (
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              {t('expires')}: {new Date(sub.expires_at).toLocaleDateString()}
            </p>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-2">
          <Link href="/settings/subscription">
            <Button variant="outline" className="w-full">
              {t('manageSubscription')}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

interface FeatureListProps {
  showAll?: boolean;
}

export const FeatureList: React.FC<FeatureListProps> = ({ showAll = false }) => {
  const t = useTranslations('subscription.features');
  const { subscription, loading } = useSubscription();

  if (loading) {
    return <div className="animate-pulse space-y-2">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-6 bg-gray-200 rounded" />
      ))}
    </div>;
  }

  if (!subscription?.features) {
    return null;
  }

  const features = [
    { key: 'ticket_management', label: t('ticketManagement') },
    { key: 'email_integration', label: t('emailIntegration') },
    { key: 'sip_calling', label: t('sipCalling') },
    { key: 'facebook_integration', label: t('facebookIntegration') },
    { key: 'instagram_integration', label: t('instagramIntegration') },
    { key: 'whatsapp_integration', label: t('whatsappIntegration') },
    { key: 'advanced_analytics', label: t('advancedAnalytics') },
    { key: 'api_access', label: t('apiAccess') },
    { key: 'custom_integrations', label: t('customIntegrations') },
    { key: 'priority_support', label: t('prioritySupport') },
    { key: 'dedicated_account_manager', label: t('dedicatedAccountManager') },
  ] as const;

  const displayFeatures = showAll
    ? features
    : features.filter(f => subscription.features[f.key]);

  return (
    <div className="space-y-2">
      {displayFeatures.map(({ key, label }) => {
        const enabled = subscription.features[key];
        return (
          <div key={key} className="flex items-center gap-2 text-sm">
            {enabled ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <X className="h-4 w-4 text-gray-400" />
            )}
            <span className={enabled ? '' : 'text-muted-foreground line-through'}>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
};
