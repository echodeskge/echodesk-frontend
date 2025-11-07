'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useTenantSubscription } from '@/hooks/api/useTenant';
import {
  useInvoices,
  useAddNewCard,
  useRemoveSavedCard,
  useSetDefaultCard,
  useImmediateUpgrade,
  useScheduleUpgrade,
  useCancelScheduledUpgrade,
  useSavedCard,
} from '@/hooks/api/usePayments';
import { CurrentPlanCard } from '@/components/subscription/CurrentPlanCard';
import { UsageStatsCard } from '@/components/subscription/UsageStatsCard';
import { PaymentMethodCard } from '@/components/subscription/PaymentMethodCard';
import { InvoiceHistoryTable } from '@/components/subscription/InvoiceHistoryTable';
import { ChangePlanDialog } from '@/components/subscription/ChangePlanDialog';
import { FeatureList } from '@/components/subscription/SubscriptionCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function SubscriptionPage() {
  const t = useTranslations('settings.subscription');
  const router = useRouter();
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

  // Queries
  const { data: subscription, isLoading: subscriptionLoading, refetch: refetchSubscription } = useTenantSubscription();
  const { data: invoicesData, isLoading: invoicesLoading } = useInvoices();
  const { data: savedCardsData, isLoading: cardsLoading } = useSavedCard();

  // Mutations
  const addCardMutation = useAddNewCard();
  const removeCardMutation = useRemoveSavedCard();
  const setDefaultCardMutation = useSetDefaultCard();
  const immediateUpgradeMutation = useImmediateUpgrade();
  const scheduleUpgradeMutation = useScheduleUpgrade();
  const cancelScheduledUpgradeMutation = useCancelScheduledUpgrade();

  // Handlers
  const handleAddCard = async () => {
    try {
      const result = await addCardMutation.mutateAsync({ make_default: false });
      if (result.payment_url) {
        // Redirect to BOG payment page
        window.location.href = result.payment_url;
      }
    } catch (error: any) {
      toast.error('Failed to initiate card addition');
      console.error('Add card error:', error);
    }
  };

  const handleRemoveCard = async (cardId: number) => {
    try {
      await removeCardMutation.mutateAsync({ card_id: cardId });
      toast.success('Card removed successfully');
    } catch (error: any) {
      toast.error('Failed to remove card');
      console.error('Remove card error:', error);
    }
  };

  const handleSetDefaultCard = async (cardId: number) => {
    try {
      await setDefaultCardMutation.mutateAsync({ card_id: cardId });
      toast.success('Default card updated');
    } catch (error: any) {
      toast.error('Failed to set default card');
      console.error('Set default card error:', error);
    }
  };

  const handleImmediateUpgrade = async (packageId: number) => {
    try {
      const result = await immediateUpgradeMutation.mutateAsync({ package_id: packageId });

      if (result.payment_url) {
        toast.success('Redirecting to payment...');
        // Redirect to BOG payment page
        setTimeout(() => {
          window.location.href = result.payment_url;
        }, 1000);
      } else {
        toast.success('Upgrade initiated successfully');
        setShowUpgradeDialog(false);
        refetchSubscription();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to initiate upgrade');
      console.error('Immediate upgrade error:', error);
    }
  };

  const handleScheduledUpgrade = async (packageId: number) => {
    try {
      await scheduleUpgradeMutation.mutateAsync({ package_id: packageId });
      toast.success('Upgrade scheduled successfully');
      setShowUpgradeDialog(false);
      refetchSubscription();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to schedule upgrade');
      console.error('Scheduled upgrade error:', error);
    }
  };

  const handleCancelScheduledUpgrade = async () => {
    try {
      await cancelScheduledUpgradeMutation.mutateAsync();
      toast.success('Scheduled upgrade cancelled');
      refetchSubscription();
    } catch (error: any) {
      toast.error('Failed to cancel scheduled upgrade');
      console.error('Cancel upgrade error:', error);
    }
  };

  const currentPackageId = subscription?.package?.id;
  const savedCards = Array.isArray(savedCardsData) ? savedCardsData : [];
  const invoices = invoicesData?.invoices || [];

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t('page.title')}</h1>
        <p className="text-muted-foreground">
          {t('page.description')}
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">{t('tabs.overview')}</TabsTrigger>
          <TabsTrigger value="features">{t('tabs.features')}</TabsTrigger>
          <TabsTrigger value="usage">{t('tabs.usage')}</TabsTrigger>
          <TabsTrigger value="billing">{t('tabs.billing')}</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CurrentPlanCard
              subscription={subscription}
              onUpgrade={() => setShowUpgradeDialog(true)}
              onCancelScheduledUpgrade={handleCancelScheduledUpgrade}
              isLoading={subscriptionLoading}
            />

            <UsageStatsCard
              subscription={subscription}
              isLoading={subscriptionLoading}
            />
          </div>
        </TabsContent>

        {/* Features Tab */}
        <TabsContent value="features" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                {t('featuresSection.title')}
              </CardTitle>
              <CardDescription>
                {t('featuresSection.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FeatureList showAll={false} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('featuresSection.allTitle')}</CardTitle>
              <CardDescription>
                {t('featuresSection.allDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FeatureList showAll={true} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Usage Tab */}
        <TabsContent value="usage" className="space-y-6">
          <UsageStatsCard
            subscription={subscription}
            isLoading={subscriptionLoading}
          />

          <Card>
            <CardHeader>
              <CardTitle>{t('page.usageDetails.title')}</CardTitle>
              <CardDescription>
                {t('page.usageDetails.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {subscription?.usage && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">{t('page.stats.currentUsers')}</p>
                      <p className="text-2xl font-bold">{subscription.usage.current_users}</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">{t('page.stats.whatsappMessages')}</p>
                      <p className="text-2xl font-bold">
                        {subscription.usage.whatsapp_messages_used?.toLocaleString()}
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">{t('page.stats.storageUsed')}</p>
                      <p className="text-2xl font-bold">{subscription.usage.storage_used_gb} GB</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="space-y-6">
          <PaymentMethodCard
            savedCards={savedCards}
            isLoading={cardsLoading}
            onAddCard={handleAddCard}
            onRemoveCard={handleRemoveCard}
            onSetDefaultCard={handleSetDefaultCard}
          />

          <InvoiceHistoryTable
            invoices={invoices}
            isLoading={invoicesLoading}
          />
        </TabsContent>
      </Tabs>

      {/* Upgrade Dialog */}
      <ChangePlanDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        currentPackageId={currentPackageId}
        onConfirmImmediate={handleImmediateUpgrade}
        onConfirmScheduled={handleScheduledUpgrade}
      />
    </div>
  );
}
