'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useTenantSubscription } from '@/hooks/api/useTenant';
import {
  useInvoices,
  useAddNewCard,
  useRemoveSavedCard,
  useSetDefaultCard,
  useSavedCard,
} from '@/hooks/api/usePayments';
import { UsageStatsCard } from '@/components/subscription/UsageStatsCard';
import { PaymentMethodCard } from '@/components/subscription/PaymentMethodCard';
import { InvoiceHistoryTable } from '@/components/subscription/InvoiceHistoryTable';
import { FeatureManagementCard } from '@/components/subscription/FeatureManagementCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

export default function SubscriptionPage() {
  const t = useTranslations('settings.subscription');

  // Queries
  const { data: subscription, isLoading: subscriptionLoading } = useTenantSubscription();
  const { data: invoicesData, isLoading: invoicesLoading } = useInvoices();
  const { data: savedCardsData, isLoading: cardsLoading } = useSavedCard();

  // Mutations
  const addCardMutation = useAddNewCard();
  const removeCardMutation = useRemoveSavedCard();
  const setDefaultCardMutation = useSetDefaultCard();

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

      <Tabs defaultValue="features" className="space-y-6">
        <TabsList>
          <TabsTrigger value="features">{t('tabs.features')}</TabsTrigger>
          <TabsTrigger value="usage">{t('tabs.usage')}</TabsTrigger>
          <TabsTrigger value="billing">{t('tabs.billing')}</TabsTrigger>
        </TabsList>

        {/* Features Tab */}
        <TabsContent value="features" className="space-y-6">
          <FeatureManagementCard />
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
    </div>
  );
}
