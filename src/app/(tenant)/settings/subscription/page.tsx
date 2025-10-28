'use client';

import React, { useState } from 'react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { SubscriptionCard, FeatureList } from '@/components/subscription/SubscriptionCard';
import { SavedCardManager } from '@/components/subscription/SavedCardManager';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  CreditCard,
  Package,
  Clock,
  TrendingUp,
  Users,
  MessageSquare,
  HardDrive,
  CheckCircle2,
  Lock,
  ShoppingCart
} from 'lucide-react';
import Link from 'next/link';
import { UpgradeDialog } from '@/components/subscription/UpgradeDialog';

export default function SubscriptionPage() {
  const { subscription, loading } = useSubscription();
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

  // Check if user has no subscription
  const hasNoSubscription = !subscription?.has_subscription;

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Subscription & Billing</h1>
        <p className="text-muted-foreground">
          Manage your subscription plan, view usage statistics, and upgrade your account
        </p>
      </div>

      {/* No Subscription Banner */}
      {hasNoSubscription && (
        <Card className="mb-6 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-amber-100 rounded-full">
                <Lock className="h-6 w-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-1">No Active Subscription</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  You currently don't have an active subscription. All features are locked until you purchase a plan.
                </p>
                <Button
                  onClick={() => setShowUpgradeDialog(true)}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Purchase a Plan
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SubscriptionCard />

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
                <CardDescription>Your current usage at a glance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {subscription?.usage_limits && (
                  <>
                    {subscription.usage_limits.users.limit && (
                      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <span className="text-sm font-medium">Users</span>
                        </div>
                        <span className="text-sm">
                          {subscription.usage_limits.users.current} / {subscription.usage_limits.users.limit}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        <span className="text-sm font-medium">WhatsApp</span>
                      </div>
                      <span className="text-sm">
                        {subscription.usage_limits.whatsapp.current.toLocaleString()} / {subscription.usage_limits.whatsapp.limit?.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2">
                        <HardDrive className="h-4 w-4" />
                        <span className="text-sm font-medium">Storage</span>
                      </div>
                      <span className="text-sm">
                        {subscription.usage_limits.storage.current} GB / {subscription.usage_limits.storage.limit} GB
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Upgrade Call to Action */}
          {!hasNoSubscription && (
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  <CardTitle>Need More Features?</CardTitle>
                </div>
                <CardDescription>
                  Upgrade to a higher tier plan to unlock more features and higher limits
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => setShowUpgradeDialog(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  View Available Plans
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Features Tab */}
        <TabsContent value="features" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Included Features
              </CardTitle>
              <CardDescription>
                Features available in your current plan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FeatureList showAll={false} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>All Features</CardTitle>
              <CardDescription>
                Complete feature comparison for all plans
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FeatureList showAll={true} />

              <div className="mt-6 p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-3">
                  Want access to more features? Upgrade your plan to unlock additional capabilities.
                </p>
                <Button variant="outline">Contact Sales</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Usage Tab */}
        <TabsContent value="usage" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {subscription?.usage_limits && (
              <>
                {/* Users Card */}
                {subscription.usage_limits.users.limit && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Users
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold mb-2">
                        {subscription.usage_limits.users.current}
                        <span className="text-sm font-normal text-muted-foreground ml-1">
                          / {subscription.usage_limits.users.limit}
                        </span>
                      </div>
                      <Badge variant={subscription.usage_limits.users.within_limit ? "default" : "destructive"}>
                        {subscription.usage_limits.users.usage_percentage.toFixed(0)}% Used
                      </Badge>
                    </CardContent>
                  </Card>
                )}

                {/* WhatsApp Card */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      WhatsApp Messages
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold mb-2">
                      {subscription.usage_limits.whatsapp.current.toLocaleString()}
                      <span className="text-sm font-normal text-muted-foreground ml-1">
                        / {subscription.usage_limits.whatsapp.limit?.toLocaleString()}
                      </span>
                    </div>
                    <Badge variant={subscription.usage_limits.whatsapp.within_limit ? "default" : "destructive"}>
                      {subscription.usage_limits.whatsapp.usage_percentage.toFixed(0)}% Used
                    </Badge>
                  </CardContent>
                </Card>

                {/* Storage Card */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <HardDrive className="h-5 w-5" />
                      Storage
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold mb-2">
                      {subscription.usage_limits.storage.current}
                      <span className="text-sm font-normal text-muted-foreground ml-1">
                        / {subscription.usage_limits.storage.limit} GB
                      </span>
                    </div>
                    <Badge variant={subscription.usage_limits.storage.within_limit ? "default" : "destructive"}>
                      {subscription.usage_limits.storage.usage_percentage.toFixed(0)}% Used
                    </Badge>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Usage Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Monitor your usage regularly</p>
                  <p className="text-sm text-muted-foreground">
                    Keep track of your monthly usage to avoid hitting limits
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Upgrade before reaching limits</p>
                  <p className="text-sm text-muted-foreground">
                    Plan ahead and upgrade when you're at 80% capacity
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Contact support for custom limits</p>
                  <p className="text-sm text-muted-foreground">
                    Need higher limits? We can create a custom plan for you
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Current Plan */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Current Plan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {subscription?.package && subscription?.subscription && (
                  <>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-semibold">{subscription.package.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {subscription.subscription.monthly_cost}₾ per month
                        </p>
                      </div>
                      <Badge>{subscription.subscription.is_active ? 'Active' : 'Inactive'}</Badge>
                    </div>

                    {subscription.subscription.expires_at && (
                      <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
                        <Clock className="h-4 w-4" />
                        <div>
                          <p className="text-sm font-medium">Next billing date</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(subscription.subscription.expires_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Saved Card Manager */}
            <SavedCardManager />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Billing History</CardTitle>
              <CardDescription>Your payment history and invoices</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                No billing history available yet. Invoices will appear here after your first payment.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Upgrade Dialog */}
      <UpgradeDialog
        isOpen={showUpgradeDialog}
        onClose={() => setShowUpgradeDialog(false)}
      />
    </div>
  );
}
