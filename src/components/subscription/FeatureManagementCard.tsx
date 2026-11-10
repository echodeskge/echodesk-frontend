'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/api/axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
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
      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('loading')}</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!featuresData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('loadFailed')}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { agent_count, features_by_category } = featuresData;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            {t('title')}
            <Badge variant="outline">
              {t('agents', { count: agent_count })}
            </Badge>
          </CardTitle>
          <CardDescription>
            {t('description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.entries(features_by_category).map(([category, features]) => (
            <div key={category} className="space-y-4">
              <h3 className="text-lg font-semibold">{category}</h3>
              <div className="space-y-3">
                {features.map((feature) => (
                  <div
                    key={feature.id}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      feature.is_selected ? 'bg-green-50 border-green-200' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{feature.name}</h4>
                        {feature.is_selected && (
                          <Badge variant="default" className="bg-green-600">
                            <Check className="h-3 w-3 mr-1" />
                            {t('active')}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {feature.description}
                      </p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-sm font-medium">
                          {t('pricePerAgent', { price: feature.price_per_user_gel.toFixed(2) })}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {t('total', { price: feature.monthly_cost_for_current_agents.toFixed(2) })}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <Button
                        variant={feature.is_selected ? 'destructive' : 'default'}
                        size="sm"
                        onClick={() => handleToggleFeature(feature)}
                        disabled={addFeatureMutation.isPending || removeFeatureMutation.isPending}
                      >
                        {addFeatureMutation.isPending || removeFeatureMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : feature.is_selected ? (
                          <>
                            <Minus className="h-4 w-4 mr-1" />
                            {t('remove')}
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-1" />
                            {t('add')}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <Separator />
            </div>
          ))}
        </CardContent>
      </Card>

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
