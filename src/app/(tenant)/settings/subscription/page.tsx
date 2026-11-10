'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useTenantSubscription } from '@/hooks/api/useTenant';
import { useTenant } from '@/contexts/TenantContext';
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
import { Globe, CreditCard } from 'lucide-react';
import { Segmented } from '@/components/redesign/segmented';
import { StatGrid } from '@/components/redesign/stats';
import { TonePill } from '@/components/redesign/pill';
import { SettingsPage, SettingsSection } from '@/components/redesign/settings';
import { toast } from 'sonner';
import { useMyAccess } from '@/hooks/useMyAccess';
import { getApiErrorMessage } from '@/lib/utils';

type SubscriptionTab = 'features' | 'usage' | 'billing';

export default function SubscriptionPage() {
  const t = useTranslations('settings.subscription');
  const tSub = useTranslations('subscription');
  // Same tabs as before (default: features); only the active tab is mounted.
  const [activeTab, setActiveTab] = useState<SubscriptionTab>('features');

  // Queries
  const { data: subscription, isLoading: subscriptionLoading } = useTenantSubscription();
  const { tenant: tenantConfig } = useTenant();
  const { data: invoicesData, isLoading: invoicesLoading } = useInvoices();
  const { data: savedCardsData, isLoading: cardsLoading } = useSavedCard();

  // Mutations
  const addCardMutation = useAddNewCard();
  const removeCardMutation = useRemoveSavedCard();
  const setDefaultCardMutation = useSetDefaultCard();
  // Card and plan changes need staff, superuser or role admin (IsBillingAdmin).
  const { isBillingAdmin } = useMyAccess();

  // Determine payment provider from tenant config
  const paymentProvider = (tenantConfig as any)?.payment_provider || 'bog';
  const isPaddle = paymentProvider === 'paddle';

  // Handlers
  const handleAddCard = async () => {
    try {
      const result = await addCardMutation.mutateAsync({ make_default: false });
      if (result.payment_url) {
        window.location.href = result.payment_url;
      }
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, tSub('savedCards.messages.initiateFailed')));
      console.error('Add card error:', error);
    }
  };

  const handleRemoveCard = async (cardId: number) => {
    try {
      await removeCardMutation.mutateAsync({ card_id: cardId });
      toast.success(tSub('savedCards.messages.removeSuccess'));
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, tSub('savedCards.messages.removeFailed')));
      console.error('Remove card error:', error);
    }
  };

  const handleSetDefaultCard = async (cardId: number) => {
    try {
      await setDefaultCardMutation.mutateAsync({ card_id: cardId });
      toast.success(tSub('savedCards.messages.defaultSuccess'));
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, tSub('savedCards.messages.defaultFailed')));
      console.error('Set default card error:', error);
    }
  };

  const savedCards = Array.isArray(savedCardsData) ? savedCardsData : [];
  const invoices = invoicesData?.invoices || [];

  return (
    <SettingsPage
      icon={CreditCard}
      title={t('page.title')}
      description={t('page.description')}
      width="wide"
      testId="settings-subscription"
    >
      <Segmented<SubscriptionTab>
        value={activeTab}
        onChange={setActiveTab}
        options={[
          { value: 'features', label: t('tabs.features') },
          { value: 'usage', label: t('tabs.usage') },
          { value: 'billing', label: t('tabs.billing') },
        ]}
        ariaLabel={t('page.title')}
        className="self-start"
        testId="subscription-tabs"
      />

      {/* Features Tab */}
      {activeTab === 'features' && <FeatureManagementCard />}

      {/* Usage Tab */}
      {activeTab === 'usage' && (
        <>
          <UsageStatsCard
            subscription={subscription}
            isLoading={subscriptionLoading}
          />

          <SettingsSection title={t('page.usageDetails.title')} hint={t('page.usageDetails.description')} testId="usage-details">
            {subscription?.usage ? (
              <StatGrid
                className="p-4"
                items={[
                  { key: 'users', label: t('page.stats.currentUsers'), value: subscription.usage.current_users },
                  {
                    key: 'whatsapp',
                    label: t('page.stats.whatsappMessages'),
                    value: subscription.usage.whatsapp_messages_used?.toLocaleString(),
                  },
                  { key: 'storage', label: t('page.stats.storageUsed'), value: `${subscription.usage.storage_used_gb} GB` },
                ]}
              />
            ) : (
              <div className="h-4" />
            )}
          </SettingsSection>
        </>
      )}

      {/* Billing Tab */}
      {activeTab === 'billing' && (
        <>
          {isPaddle ? (
            /* Paddle-managed billing */
            <SettingsSection
              title={tSub('paymentMethods.title')}
              hint={tSub('managedByPaddle')}
              actions={
                <TonePill tone="neutral">
                  <Globe className="me-1 inline h-3 w-3 align-[-2px]" aria-hidden />
                  Paddle
                </TonePill>
              }
              testId="paddle-billing"
            >
              <p className="px-4 py-3.5 text-[13px] text-muted-foreground">
                {tSub('paddleBillingInfo')}
              </p>
            </SettingsSection>
          ) : (
            /* BOG saved card management */
            <PaymentMethodCard
              savedCards={savedCards}
              isLoading={cardsLoading}
              onAddCard={isBillingAdmin ? handleAddCard : undefined}
              onRemoveCard={isBillingAdmin ? handleRemoveCard : undefined}
              onSetDefaultCard={isBillingAdmin ? handleSetDefaultCard : undefined}
            />
          )}

          <InvoiceHistoryTable
            invoices={invoices}
            isLoading={invoicesLoading}
          />
        </>
      )}
    </SettingsPage>
  );
}
