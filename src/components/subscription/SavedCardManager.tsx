'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CreditCard,
  Trash2,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { getSavedCard, removeSavedCard } from '@/api/generated/api';
import { toast } from 'sonner';

interface SavedCard {
  id: number;
  card_type: string;
  masked_card_number: string;
  card_expiry: string;
  saved_at: string;
  is_active: boolean;
}

export const SavedCardManager: React.FC = () => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const queryClient = useQueryClient();

  // Fetch saved card
  const { data: savedCard, isLoading, error } = useQuery<SavedCard>({
    queryKey: ['savedCard'],
    queryFn: getSavedCard,
    retry: false,
  });

  // Remove card mutation
  const removeMutation = useMutation({
    mutationFn: removeSavedCard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedCard'] });
      toast.success('Card removed successfully');
      setShowDeleteDialog(false);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Failed to remove card');
    },
  });

  const handleRemove = () => {
    removeMutation.mutate();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Saved Payment Method
          </CardTitle>
          <CardDescription>Manage your saved payment card for recurring payments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No card saved or error (card not found)
  if (error || !savedCard) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Saved Payment Method
          </CardTitle>
          <CardDescription>Manage your saved payment card for recurring payments</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No saved payment method found. When you register with a trial payment, your card will be saved here for automatic renewals.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Format card type display
  const cardTypeDisplay = savedCard.card_type.toUpperCase();
  const cardIcon = savedCard.card_type.toLowerCase() === 'visa' ? '💳' :
                   savedCard.card_type.toLowerCase() === 'mc' ? '💳' : '💳';

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Saved Payment Method
          </CardTitle>
          <CardDescription>Manage your saved payment card for recurring payments</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Card Display */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-gradient-to-r from-slate-50 to-slate-100">
            <div className="flex items-center gap-3">
              <div className="text-3xl">{cardIcon}</div>
              <div>
                <p className="font-semibold">{cardTypeDisplay} {savedCard.masked_card_number}</p>
                <p className="text-sm text-muted-foreground">Expires {savedCard.card_expiry}</p>
              </div>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              disabled={removeMutation.isPending}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Remove
            </Button>
          </div>

          {/* Info Alert */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              This card will be automatically charged for subscription renewals. Removing it will require manual payment.
            </AlertDescription>
          </Alert>

          {/* Saved Date */}
          <p className="text-xs text-muted-foreground">
            Card saved on {new Date(savedCard.saved_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>

          {/* Information */}
          <div className="pt-2 border-t">
            <h4 className="text-sm font-semibold mb-2">About Auto-Renewal</h4>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>• Your card is securely stored by Bank of Georgia</li>
              <li>• Charges occur automatically before subscription expiration</li>
              <li>• You'll receive email notifications before charges</li>
              <li>• You can remove your card anytime to disable auto-renewal</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Saved Card?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this payment method? You will need to manually pay for future subscription renewals.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={removeMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeMutation.isPending ? 'Removing...' : 'Remove Card'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
