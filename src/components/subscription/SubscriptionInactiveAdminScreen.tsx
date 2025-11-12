"use client";

import { AlertCircle, CreditCard, ExternalLink } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTranslations } from "next-intl";
import Link from "next/link";

interface SubscriptionInactiveAdminScreenProps {
  subscription?: any;
  onMakePayment?: () => void;
  isLoading?: boolean;
}

export function SubscriptionInactiveAdminScreen({
  subscription,
  onMakePayment,
  isLoading = false,
}: SubscriptionInactiveAdminScreenProps) {
  const t = useTranslations('subscription');

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-64 bg-gray-200 rounded animate-pulse mt-2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="h-32 bg-gray-200 rounded animate-pulse" />
              <div className="h-24 bg-gray-200 rounded animate-pulse" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { package: currentPackage, subscription: subDetails } = subscription || {};
  const monthlyCost = subDetails?.monthly_cost || 0;
  const agentCount = subDetails?.agent_count || 0;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-3xl space-y-6">
        {/* Main Alert */}
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <AlertTitle className="text-red-900 text-lg font-semibold">
            Subscription Inactive
          </AlertTitle>
          <AlertDescription className="text-red-800">
            Your subscription is currently inactive. Please add a payment method or make a payment to reactivate your account and continue using EchoDesk.
          </AlertDescription>
        </Alert>

        {/* Current Plan Details */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  Current Subscription Plan
                  <Badge variant="destructive">Inactive</Badge>
                </CardTitle>
                <CardDescription>
                  Reactivate your subscription to continue using all features
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Plan Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Plan Type</p>
                <p className="text-lg font-semibold">
                  {currentPackage?.display_name || "Feature-based"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Agent Count</p>
                <p className="text-lg font-semibold">{agentCount} agents</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Monthly Cost</p>
                <p className="text-lg font-semibold text-blue-600">
                  {monthlyCost.toFixed(2)}₾
                </p>
              </div>
            </div>

            {/* Features List */}
            {subscription?.features && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Included Features:
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(subscription.features)
                    .filter(([_, enabled]) => enabled)
                    .map(([feature, _]) => (
                      <Badge key={feature} variant="outline">
                        {feature.replace(/_/g, " ")}
                      </Badge>
                    ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-4 space-y-3">
              {/* Card Saving Notice */}
              <Alert className="border-blue-200 bg-blue-50">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-sm text-blue-800">
                  Your payment card will be securely saved for automatic future payments.
                </AlertDescription>
              </Alert>

              {onMakePayment && (
                <Button
                  onClick={onMakePayment}
                  size="lg"
                  className="w-full"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Make Payment ({monthlyCost.toFixed(2)}₾)
                </Button>
              )}
            </div>

            {/* Link to full subscription page */}
            <div className="pt-2">
              <Link href="/settings/subscription" className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
                View full subscription settings
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Help Text */}
        <Alert>
          <AlertDescription className="text-sm text-gray-600">
            <p className="font-medium mb-1">Need help?</p>
            <p>
              If you're experiencing issues with payment or have questions about your subscription,
              please contact our support team or check your subscription settings.
            </p>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
