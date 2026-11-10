'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/api/axios';
import { TonePill } from '@/components/redesign/pill';
import { ActionButton, SettingsNote, SettingsSection } from '@/components/redesign/settings';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Plus,
  Minus,
  Loader2,
  Check,
  CreditCard,
  ExternalLink,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface Feature {
  id: number;
  key: string;
  name: string;
  description: string;
  price_per_user_gel: number;
  price_unlimited_gel?: number;
  monthly_cost_for_current_agents: number;
  is_selected: boolean;
  icon?: string;
}

interface AvailableFeaturesResponse {
  agent_count: number;
  features_by_category: Record<string, Feature[]>;
}

interface AddFeatureResponse {
  success: boolean;
  requires_payment?: boolean;
  requires_authentication?: boolean;
  payment_url?: string;
  message: string;
  feature: {
    id: number;
    key: string;
    name: string;
    price_per_user_gel: number;
  };
  prorated_cost: number;
  new_monthly_cost: number;
  days_remaining: number;
  payment_charged?: boolean;
}

interface RemoveFeatureResponse {
  success: boolean;
  message: string;
  feature: {
    id: number;
    key: string;
    name: string;
  };
  cost_reduction: number;
  new_monthly_cost: number;
}

export function FeatureManagementCard() {
  const t = useTranslations('subscription.featureManagement');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    feature: Feature | null;
    action: 'add' | 'remove';
  }>({
    open: false,
    feature: null,
    action: 'add',
  });

  // Fetch available features
  const { data: featuresData, isLoading } = useQuery<AvailableFeaturesResponse>({
    queryKey: ['available-features'],
    queryFn: async () => {
      const response = await axiosInstance.get('/api/subscription/features/available/');
      return response.data;
    },
  });

  // Add feature mutation
  const addFeatureMutation = useMutation<AddFeatureResponse, Error, number>({
    mutationFn: async (featureId: number) => {
      const response = await axiosInstance.post('/api/subscription/features/add/', {
        feature_id: featureId,
        charge_immediately: true,
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (data.requires_payment || data.requires_authentication) {
        // Redirect to payment page
        if (data.payment_url) {
          toast.info(t('toasts.redirecting'));
          window.location.href = data.payment_url;
        }
      } else if (data.success) {
        toast.success(data.message);
        if (data.payment_charged) {
          toast.success(t('toasts.charged', { amount: data.prorated_cost.toFixed(2) }));
        }
        queryClient.invalidateQueries({ queryKey: ['available-features'] });
        queryClient.invalidateQueries({ queryKey: ['tenant-subscription'] });
      }
    },
    onError: (error: any) => {
      // 403s from the staff-only billing endpoints come back as {detail}.
      const errorMessage = getApiErrorMessage(error, t('toasts.addFailed'));
      toast.error(errorMessage);
    },
  });

  // Remove feature mutation
  const removeFeatureMutation = useMutation<RemoveFeatureResponse, Error, number>({
    mutationFn: async (featureId: number) => {
      const response = await axiosInstance.post('/api/subscription/features/remove/', {
        feature_id: featureId,
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      toast.info(t('toasts.reduced', { amount: data.cost_reduction.toFixed(2) }));
      queryClient.invalidateQueries({ queryKey: ['available-features'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-subscription'] });
    },
    onError: (error: any) => {
      const errorMessage = getApiErrorMessage(error, t('toasts.removeFailed'));
      toast.error(errorMessage);
    },
  });

  const handleToggleFeature = (feature: Feature) => {
    setConfirmDialog({
      open: true,
      feature,
      action: feature.is_selected ? 'remove' : 'add',
    });
  };

  const confirmAction = () => {
    if (!confirmDialog.feature) return;

    if (confirmDialog.action === 'add') {
      addFeatureMutation.mutate(confirmDialog.feature.id);
    } else {
      removeFeatureMutation.mutate(confirmDialog.feature.id);
    }

    setConfirmDialog({ open: false, feature: null, action: 'add' });
  };

  if (isLoading) {
    return (
      <SettingsSection title={t('title')} hint={t('loading')} testId="feature-management">
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
        </div>
      </SettingsSection>
    );
  }

  if (!featuresData) {
    return (
      <SettingsSection title={t('title')} testId="feature-management">
        <div className="px-4 py-3.5">
          <SettingsNote tone="danger">{t('loadFailed')}</SettingsNote>
        </div>
      </SettingsSection>
    );
  }

  const { agent_count, features_by_category } = featuresData;
  const busy = addFeatureMutation.isPending || removeFeatureMutation.isPending;

  return (
    <>
      <SettingsSection
        title={t('title')}
        hint={t('description')}
        actions={<TonePill tone="neutral">{t('agents', { count: agent_count })}</TonePill>}
        testId="feature-management"
      >
        {Object.entries(features_by_category).map(([category, features]) => (
          <div key={category} className="border-b last:border-b-0">
            <div className="border-b bg-muted/20 px-4 py-2 text-[11px] font-semibold uppercase tracking-[.05em] text-muted-foreground">
              {category}
            </div>
            {features.map((feature) => (
              <div
                key={feature.id}
                className="flex flex-col gap-3 border-b px-4 py-3.5 last:border-b-0 sm:flex-row sm:items-center sm:gap-4"
                data-testid="feature-row"
                data-selected={feature.is_selected || undefined}
              >
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13px] font-medium">{feature.name}</span>
                    {feature.is_selected && (
                      <TonePill tone="success">
                        <Check className="me-1 inline h-3 w-3 align-[-2px]" aria-hidden />
                        {t('active')}
                      </TonePill>
                    )}
                  </div>
                  <p className="text-xs leading-[17px] text-muted-foreground">
                    {feature.description}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs">
                    <span className="font-medium tabular-nums">
                      {t('pricePerAgent', { price: feature.price_per_user_gel.toFixed(2) })}
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {t('total', { price: feature.monthly_cost_for_current_agents.toFixed(2) })}
                    </span>
                  </div>
                </div>
                <ActionButton
                  tone={feature.is_selected ? 'danger' : 'default'}
                  onClick={() => handleToggleFeature(feature)}
                  disabled={busy}
                  className="self-start sm:self-auto"
                  testId={`feature-toggle-${feature.key}`}
                >
                  {busy ? (
                    <Loader2 className="h-[13px] w-[13px] animate-spin" aria-hidden />
                  ) : feature.is_selected ? (
                    <>
                      <Minus className="h-[13px] w-[13px]" aria-hidden />
                      {t('remove')}
                    </>
                  ) : (
                    <>
                      <Plus className="h-[13px] w-[13px]" aria-hidden />
                      {t('add')}
                    </>
                  )}
                </ActionButton>
              </div>
            ))}
          </div>
        ))}
      </SettingsSection>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ ...confirmDialog, open: false })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.action === 'add' ? t('dialog.addTitle') : t('dialog.removeTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              {confirmDialog.feature && confirmDialog.action === 'add' && (
                <>
                  <p>
                    {t.rich('dialog.addIntro', { name: confirmDialog.feature.name, b: (chunks) => <strong>{chunks}</strong> })}
                  </p>
                  <div className="bg-blue-50 p-3 rounded-lg text-sm">
                    <p className="font-medium text-blue-900">{t('dialog.costBreakdown')}</p>
                    <ul className="mt-2 space-y-1 text-blue-800">
                      <li>
                        {t('dialog.monthlyCost', { price: confirmDialog.feature.monthly_cost_for_current_agents.toFixed(2) })}
                      </li>
                      <li>
                        {t('dialog.proratedNow')}
                      </li>
                    </ul>
                  </div>
                  <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg">
                    <CreditCard className="h-4 w-4" />
                    <span className="text-sm">{t('dialog.cardCharged')}</span>
                  </div>
                </>
              )}
              {confirmDialog.feature && confirmDialog.action === 'remove' && (
                <>
                  <p>
                    {t.rich('dialog.removeIntro', { name: confirmDialog.feature.name, b: (chunks) => <strong>{chunks}</strong> })}
                  </p>
                  <div className="bg-amber-50 p-3 rounded-lg text-sm">
                    <p className="font-medium text-amber-900">{t('dialog.note')}</p>
                    <ul className="mt-2 space-y-1 text-amber-800">
                      <li>
                        {t('dialog.costReduced', { price: confirmDialog.feature.monthly_cost_for_current_agents.toFixed(2) })}
                      </li>
                      <li>
                        {t('dialog.nextCycle')}
                      </li>
                      <li>
                        {t('dialog.loseAccess')}
                      </li>
                    </ul>
                  </div>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAction}>
              {confirmDialog.action === 'add' ? t('dialog.addTitle') : t('dialog.removeTitle')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
