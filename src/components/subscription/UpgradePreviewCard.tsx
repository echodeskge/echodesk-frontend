"use client";

import { ArrowRight, Calendar, DollarSign, AlertTriangle, TrendingUp } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTranslations } from "next-intl";

interface UpgradePreviewCardProps {
  preview?: any;
  upgradeType?: "immediate" | "scheduled";
  isLoading?: boolean;
}

export function UpgradePreviewCard({
  preview,
  upgradeType = "immediate",
  isLoading = false,
}: UpgradePreviewCardProps) {
  const t = useTranslations('subscription.upgradePreview');

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-20 bg-gray-200 rounded animate-pulse" />
            <div className="h-16 bg-gray-200 rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!preview) {
    return null;
  }

  const { current_package, new_package, pricing, timing, immediate_upgrade, scheduled_upgrade } = preview;
  const upgradeDetails = upgradeType === "immediate" ? immediate_upgrade : scheduled_upgrade;

  return (
    <Card className="w-full border-blue-200 bg-gradient-to-br from-blue-50/50 to-indigo-50/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          {t('title')}
        </CardTitle>
        <CardDescription>
          {t('description')}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Package Comparison */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-white border">
          <div className="space-y-1">
            <p className="text-xs text-gray-500">{t('currentPlanLabel')}</p>
            <p className="text-lg font-semibold">{current_package.name}</p>
            <p className="text-sm text-gray-600">{current_package.price} GEL/mo</p>
          </div>

          <ArrowRight className="h-6 w-6 text-gray-400 shrink-0 mx-4" />

          <div className="space-y-1">
            <p className="text-xs text-gray-500">{t('newPlanLabel')}</p>
            <p className="text-lg font-semibold text-blue-600">{new_package.name}</p>
            <p className="text-sm text-blue-700 font-medium">
              {new_package.price} GEL/mo
            </p>
          </div>
        </div>

        {/* Pricing Details */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-white">
            <span className="text-sm text-gray-600">{t('pricing.currentMonthlyCost')}</span>
            <span className="font-medium">{pricing.current_monthly_cost} GEL</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-white">
            <span className="text-sm text-gray-600">{t('pricing.newMonthlyCost')}</span>
            <span className="font-medium text-blue-600">
              {pricing.new_monthly_cost} GEL
            </span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-blue-100 border border-blue-200">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">
                {pricing.is_upgrade ? t('pricing.priceIncrease') : t('pricing.priceDecrease')}
              </span>
            </div>
            <span className={`font-semibold ${pricing.is_upgrade ? "text-blue-600" : "text-green-600"}`}>
              {pricing.is_upgrade ? "+" : "-"}{Math.abs(pricing.price_difference)} GEL
            </span>
          </div>
        </div>

        {/* Timing Information */}
        {upgradeType === "immediate" && (
          <Alert className="border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-medium text-amber-900">{t('immediate.title')}</p>
                <p className="text-sm text-amber-700">{upgradeDetails?.note}</p>
                {timing.days_remaining_in_period > 0 && (
                  <>
                    <p className="text-sm text-amber-700 mt-2">
                      {t('immediate.daysRemaining', { days: timing.days_remaining_in_period })}
                    </p>
                    {immediate_upgrade?.forfeited_amount > 0 && (
                      <p className="text-sm text-amber-700">
                        {t('immediate.forfeitedAmount', { amount: immediate_upgrade.forfeited_amount.toFixed(2) })}
                      </p>
                    )}
                  </>
                )}
                <p className="text-sm text-amber-600 font-medium mt-2">
                  {t('immediate.chargeNow', { amount: immediate_upgrade?.charge_now })}
                </p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {upgradeType === "scheduled" && (
          <Alert className="border-blue-200 bg-blue-50">
            <Calendar className="h-4 w-4 text-blue-600" />
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-medium text-blue-900">{t('scheduled.title')}</p>
                <p className="text-sm text-blue-700">{upgradeDetails?.note}</p>
                {scheduled_upgrade?.effective_date && (
                  <p className="text-sm text-blue-700 mt-2">
                    {t('scheduled.effectiveDate', {
                      date: new Date(scheduled_upgrade.effective_date).toLocaleDateString()
                    })}
                  </p>
                )}
                <p className="text-sm text-blue-600 font-medium mt-2">
                  {t('scheduled.chargeAtNextBilling', {
                    amount: scheduled_upgrade?.charge_at_next_billing
                  })}
                </p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          {pricing.is_upgrade && (
            <Badge className="bg-green-100 text-green-700 border-green-200">
              {t('badges.upgrade')}
            </Badge>
          )}
          {pricing.is_downgrade && (
            <Badge className="bg-gray-100 text-gray-700 border-gray-200">
              {t('badges.downgrade')}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
