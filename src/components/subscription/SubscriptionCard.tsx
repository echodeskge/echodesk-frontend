'use client';

import React from 'react';
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
  const { subscription, loading, error } = useSubscription();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <CardTitle>Loading subscription...</CardTitle>
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
            <CardTitle>No Active Subscription</CardTitle>
          </div>
          <CardDescription>
            {error || 'You don\'t have an active subscription. Please contact your administrator.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/settings/subscription">
            <Button>View Plans</Button>
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
            <h4 className="text-sm font-semibold">Usage</h4>

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
                  You have exceeded your WhatsApp message limit
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
              Expires: {new Date(sub.expires_at).toLocaleDateString()}
            </p>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-2">
          <Link href="/settings/subscription">
            <Button variant="outline" className="w-full">
              Manage Subscription
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
    { key: 'ticket_management', label: 'Ticket Management' },
    { key: 'email_integration', label: 'Email Integration' },
    { key: 'sip_calling', label: 'SIP Calling' },
    { key: 'facebook_integration', label: 'Facebook Integration' },
    { key: 'instagram_integration', label: 'Instagram Integration' },
    { key: 'whatsapp_integration', label: 'WhatsApp Integration' },
    { key: 'advanced_analytics', label: 'Advanced Analytics' },
    { key: 'api_access', label: 'API Access' },
    { key: 'custom_integrations', label: 'Custom Integrations' },
    { key: 'priority_support', label: 'Priority Support' },
    { key: 'dedicated_account_manager', label: 'Dedicated Account Manager' },
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
