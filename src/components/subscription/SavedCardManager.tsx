'use client';

import React, { useState, useEffect } from 'react';
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  CreditCard,
  Check,
  X,
  Loader2,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';
import { getSavedCardInfo, deleteSavedCard, createManualPayment } from '@/api/savedCard';
import type { SavedCardInfo } from '@/api/savedCard';

export const SavedCardManager: React.FC = () => {
  const [cardInfo, setCardInfo] = useState<SavedCardInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadCardInfo();
  }, []);

  const loadCardInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getSavedCardInfo();
      setCardInfo(data);
    } catch (err: any) {
      console.error('Failed to load saved card info:', err);
      setError(err.response?.data?.error || 'Failed to load saved card information');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCard = async () => {
    try {
      setDeleting(true);
      setError(null);
      setSuccessMessage(null);

      const result = await deleteSavedCard();
      setSuccessMessage(result.message);

      // Reload card info
      await loadCardInfo();
    } catch (err: any) {
      console.error('Failed to delete card:', err);
      setError(err.response?.data?.error || 'Failed to delete saved card');
    } finally {
      setDeleting(false);
    }
  };

  const handleManualPayment = async () => {
    try {
      setPaymentLoading(true);
      setError(null);

      const result = await createManualPayment();

      // Redirect to payment page
      window.location.href = result.payment_url;
    } catch (err: any) {
      console.error('Failed to create payment:', err);
      setError(err.response?.data?.error || 'Failed to create payment');
      setPaymentLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <CardTitle>Loading payment information...</CardTitle>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment Method
        </CardTitle>
        <CardDescription>
          Manage your saved payment card and auto-renewal settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Error Message */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Success Message */}
        {successMessage && (
          <Alert className="border-green-200 bg-green-50">
            <Check className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
          </Alert>
        )}

        {/* Card Status */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              {cardInfo?.has_saved_card ? (
                <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-full">
                  <Check className="h-5 w-5 text-green-600" />
                </div>
              ) : (
                <div className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-full">
                  <X className="h-5 w-5 text-gray-400" />
                </div>
              )}
              <div>
                <p className="font-medium">
                  {cardInfo?.has_saved_card ? 'Card Saved' : 'No Saved Card'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {cardInfo?.has_saved_card
                    ? 'Auto-renewal enabled - Your subscription will renew automatically'
                    : 'You will need to manually pay for renewals'}
                </p>
              </div>
            </div>
            <Badge variant={cardInfo?.auto_renew_enabled ? 'default' : 'secondary'}>
              {cardInfo?.auto_renew_enabled ? 'Auto-Renew ON' : 'Auto-Renew OFF'}
            </Badge>
          </div>

          {/* Card Details */}
          {cardInfo?.has_saved_card && cardInfo.last_payment_date && (
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <p className="text-sm">
                <span className="font-medium">Last Payment:</span>{' '}
                {new Date(cardInfo.last_payment_date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
              <p className="text-sm text-muted-foreground">
                Your card will be charged automatically before your subscription expires
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-4">
          {cardInfo?.has_saved_card ? (
            <>
              {/* Delete Saved Card */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="w-full" disabled={deleting}>
                    {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Remove Saved Card
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove Saved Card?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove your saved card and disable auto-renewal.
                      You will need to manually pay for future subscription renewals.
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteCard} className="bg-red-600 hover:bg-red-700">
                      Remove Card
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          ) : (
            <>
              {/* Manual Payment Button */}
              <Button
                onClick={handleManualPayment}
                disabled={paymentLoading}
                className="w-full"
              >
                {paymentLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Redirecting to payment...
                  </>
                ) : (
                  <>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Pay for Subscription
                  </>
                )}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                You will be redirected to Bank of Georgia to complete payment
              </p>
            </>
          )}
        </div>

        {/* Information */}
        <div className="pt-4 border-t">
          <h4 className="text-sm font-semibold mb-2">About Auto-Renewal</h4>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>• Your card is securely stored by Bank of Georgia</li>
            <li>• Charges occur automatically 2 days before expiration</li>
            <li>• You'll receive email notifications before charges</li>
            <li>• You can remove your card anytime to disable auto-renewal</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
