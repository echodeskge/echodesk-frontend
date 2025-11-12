"use client";

import { AlertCircle, Mail, User, Phone } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTranslations } from "next-intl";

interface SubscriptionInactiveUserScreenProps {
  subscription?: any;
  tenantInfo?: {
    name?: string;
    admin_email?: string;
    admin_name?: string;
    phone?: string;
  };
  isLoading?: boolean;
}

export function SubscriptionInactiveUserScreen({
  subscription,
  tenantInfo,
  isLoading = false,
}: SubscriptionInactiveUserScreenProps) {
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
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { package: currentPackage, subscription: subDetails } = subscription || {};

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Main Alert */}
        <Alert className="border-amber-200 bg-amber-50">
          <AlertCircle className="h-5 w-5 text-amber-600" />
          <AlertTitle className="text-amber-900 text-lg font-semibold">
            Subscription Inactive
          </AlertTitle>
          <AlertDescription className="text-amber-800">
            The subscription for this account is currently inactive. Please contact your administrator to reactivate the subscription.
          </AlertDescription>
        </Alert>

        {/* Subscription Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Subscription Status
              <Badge variant="destructive">Inactive</Badge>
            </CardTitle>
            <CardDescription>
              Access to EchoDesk features is currently restricted
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">
                Your account subscription needs to be reactivated by an administrator.
                You will not be able to access EchoDesk features until the subscription is active.
              </p>
              {subDetails && (
                <div className="mt-4 pt-4 border-t space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Plan:</span>
                    <span className="font-medium">
                      {currentPackage?.display_name || "Feature-based"}
                    </span>
                  </div>
                  {subDetails.agent_count && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Agent Count:</span>
                      <span className="font-medium">{subDetails.agent_count} agents</span>
                    </div>
                  )}
                  {subDetails.expires_at && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Expired:</span>
                      <span className="font-medium text-red-600">
                        {new Date(subDetails.expires_at).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Contact Administrator Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Contact Administrator
            </CardTitle>
            <CardDescription>
              Reach out to your account administrator for assistance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {tenantInfo?.admin_email ? (
              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700">Email</p>
                  <a
                    href={`mailto:${tenantInfo.admin_email}`}
                    className="text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    {tenantInfo.admin_email}
                  </a>
                </div>
              </div>
            ) : null}

            {tenantInfo?.phone ? (
              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                <Phone className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700">Phone</p>
                  <a
                    href={`tel:${tenantInfo.phone}`}
                    className="text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    {tenantInfo.phone}
                  </a>
                </div>
              </div>
            ) : null}

            {!tenantInfo?.admin_email && !tenantInfo?.phone && (
              <Alert>
                <AlertDescription className="text-sm">
                  Please contact your system administrator to reactivate your subscription.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Help Information */}
        <Alert>
          <AlertDescription className="text-sm text-gray-600">
            <p className="font-medium mb-1">What does this mean?</p>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>Your account subscription has expired or is inactive</li>
              <li>Access to features is restricted until reactivation</li>
              <li>Only administrators can reactivate the subscription</li>
              <li>Contact your administrator using the information above</li>
            </ul>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
