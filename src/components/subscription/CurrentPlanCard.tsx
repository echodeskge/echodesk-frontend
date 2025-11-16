"use client";

import { AlertCircle, Calendar, CreditCard, TrendingUp, Users, Layers } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTranslations } from "next-intl";

interface CurrentPlanCardProps {
  subscription?: any;
  onUpgrade?: () => void;
  onCancelScheduledUpgrade?: () => void;
  isLoading?: boolean;
}

export function CurrentPlanCard({
  subscription,
  onUpgrade,
  onCancelScheduledUpgrade,
  isLoading = false,
}: CurrentPlanCardProps) {
  const t = useTranslations('subscription.currentPlanCard');

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-48 bg-gray-200 rounded animate-pulse mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-12 bg-gray-200 rounded animate-pulse" />
            <div className="h-20 bg-gray-200 rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!subscription || !subscription.has_subscription) {
    return (
      <Card className="w-full border-amber-200 bg-amber-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            {t('noActiveSubscription')}
          </CardTitle>
          <CardDescription>
            {t('noActiveMessage')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onUpgrade} className="w-full sm:w-auto">
            {t('choosePlan')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const subDetails = subscription.subscription;
  const selectedFeatures = subscription.selected_features || [];
  const agentCount = subDetails?.agent_count || 1;
  const hasPendingUpgrade = subDetails?.pending_upgrade != null;

  // Calculate monthly cost from features
  const calculateMonthlyCost = () => {
    if (subDetails?.monthly_cost) return subDetails.monthly_cost;

    let totalCost = 0;
    selectedFeatures.forEach((feature: any) => {
      totalCost += (feature.price_per_user_gel || 0) * agentCount;
    });
    return totalCost;
  };

  const monthlyCost = calculateMonthlyCost();

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{t('currentPlanTitle')}</CardTitle>
        <CardDescription>
          {t('currentPlanDescription')}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Pending Upgrade Banner */}
        {hasPendingUpgrade && subDetails?.pending_upgrade && (
          <Alert className="border-blue-200 bg-blue-50">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            <AlertDescription>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-blue-900">
                    {t('pendingUpgrade.title')}
                  </p>
                  <p className="text-sm text-blue-700">
                    {t('pendingUpgrade.message', {
                      packageName: subDetails.pending_upgrade.feature_name || subDetails.pending_upgrade.package_name || 'New Feature',
                      date: new Date(subDetails.pending_upgrade.scheduled_for).toLocaleDateString()
                    })}
                  </p>
                  {subDetails.pending_upgrade.new_monthly_cost && (
                    <p className="text-sm text-blue-600 mt-1">
                      {t('pendingUpgrade.newCost', {
                        cost: subDetails.pending_upgrade.new_monthly_cost
                      })}
                    </p>
                  )}
                </div>
                {onCancelScheduledUpgrade && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onCancelScheduledUpgrade}
                    className="shrink-0"
                  >
                    {t('pendingUpgrade.cancelButton')}
                  </Button>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Current Features */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="h-5 w-5 text-primary" />
            <span className="font-medium">Active Features</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedFeatures.length > 0 ? (
              selectedFeatures.map((feature: any) => (
                <Badge key={feature.id || feature.code} variant="secondary" className="px-3 py-1">
                  {feature.name}
                </Badge>
              ))
            ) : (
              <Badge variant="outline" className="px-3 py-1">
                No features selected
              </Badge>
            )}
          </div>
          {subDetails?.is_trial && (
            <Badge variant="outline" className="mt-2">
              {t('badges.trialPeriod')}
            </Badge>
          )}
        </div>

        {/* Plan Details */}
        <div className="grid gap-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">Agent Count</span>
            </div>
            <span className="text-lg font-semibold">
              {agentCount} {agentCount === 1 ? 'agent' : 'agents'}
            </span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">{t('monthlyCost')}</span>
            </div>
            <span className="text-lg font-semibold">
              {monthlyCost.toFixed(2)} GEL
            </span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">{t('nextBillingDate')}</span>
            </div>
            <span className="text-sm font-medium">
              {subDetails?.next_billing_date
                ? new Date(subDetails.next_billing_date).toLocaleDateString()
                : "N/A"}
            </span>
          </div>

          {subDetails?.is_trial && subDetails?.trial_ends_at && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-200">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-900">
                  {t('trialEnds')}
                </span>
              </div>
              <span className="text-sm font-medium text-amber-900">
                {new Date(subDetails.trial_ends_at).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      </CardContent>

      {onUpgrade && (
        <CardFooter>
          <Button onClick={onUpgrade} className="w-full sm:w-auto">
            Manage Features
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
