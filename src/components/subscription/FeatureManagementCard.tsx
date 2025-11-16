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
          toast.info('Redirecting to payment...');
          window.location.href = data.payment_url;
        }
      } else if (data.success) {
        toast.success(data.message);
        if (data.payment_charged) {
          toast.success(`Charged ${data.prorated_cost.toFixed(2)} GEL for prorated cost`);
        }
        queryClient.invalidateQueries({ queryKey: ['available-features'] });
        queryClient.invalidateQueries({ queryKey: ['tenant-subscription'] });
      }
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || 'Failed to add feature';
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
      toast.info(`Monthly cost reduced by ${data.cost_reduction.toFixed(2)} GEL`);
      queryClient.invalidateQueries({ queryKey: ['available-features'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-subscription'] });
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || 'Failed to remove feature';
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
          <CardTitle>Feature Management</CardTitle>
          <CardDescription>Loading available features...</CardDescription>
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
          <CardTitle>Feature Management</CardTitle>
          <CardDescription>Unable to load features</CardDescription>
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
            Feature Management
            <Badge variant="outline">
              {agent_count} {agent_count === 1 ? 'Agent' : 'Agents'}
            </Badge>
          </CardTitle>
          <CardDescription>
            Add or remove features from your subscription. Prices shown are monthly costs for your current agent count.
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
                            Active
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {feature.description}
                      </p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-sm font-medium">
                          {feature.price_per_user_gel.toFixed(2)} GEL / agent / month
                        </span>
                        <span className="text-sm text-muted-foreground">
                          Total: {feature.monthly_cost_for_current_agents.toFixed(2)} GEL / month
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
                            Remove
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-1" />
                            Add
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
              {confirmDialog.action === 'add' ? 'Add Feature' : 'Remove Feature'}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              {confirmDialog.feature && confirmDialog.action === 'add' && (
                <>
                  <p>
                    You are about to add <strong>{confirmDialog.feature.name}</strong> to your subscription.
                  </p>
                  <div className="bg-blue-50 p-3 rounded-lg text-sm">
                    <p className="font-medium text-blue-900">Cost Breakdown:</p>
                    <ul className="mt-2 space-y-1 text-blue-800">
                      <li>
                        Monthly cost: {confirmDialog.feature.monthly_cost_for_current_agents.toFixed(2)} GEL
                      </li>
                      <li>
                        Prorated cost will be charged immediately based on remaining days in your billing cycle
                      </li>
                    </ul>
                  </div>
                  <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg">
                    <CreditCard className="h-4 w-4" />
                    <span className="text-sm">Your saved card will be charged for the prorated amount</span>
                  </div>
                </>
              )}
              {confirmDialog.feature && confirmDialog.action === 'remove' && (
                <>
                  <p>
                    You are about to remove <strong>{confirmDialog.feature.name}</strong> from your subscription.
                  </p>
                  <div className="bg-amber-50 p-3 rounded-lg text-sm">
                    <p className="font-medium text-amber-900">Note:</p>
                    <ul className="mt-2 space-y-1 text-amber-800">
                      <li>
                        Your monthly cost will be reduced by {confirmDialog.feature.monthly_cost_for_current_agents.toFixed(2)} GEL
                      </li>
                      <li>
                        The reduction will take effect on your next billing cycle
                      </li>
                      <li>
                        You will lose access to this feature immediately
                      </li>
                    </ul>
                  </div>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAction}>
              {confirmDialog.action === 'add' ? 'Add Feature' : 'Remove Feature'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
