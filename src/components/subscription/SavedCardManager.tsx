'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  AlertCircle,
  Check,
  Star,
  Plus
} from 'lucide-react';
import { getSavedCard, removeSavedCard, setDefaultCard, addNewCard } from '@/api/generated/api';
import { toast } from 'sonner';

interface SavedCard {
  id: number;
  card_type: string;
  masked_card_number: string;
  card_expiry: string;
  saved_at: string;
  is_active: boolean;
  is_default: boolean;
}

export const SavedCardManager: React.FC = () => {
  const t = useTranslations('subscription.savedCards');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  // Check for card addition result in URL
  useEffect(() => {
    const cardAdded = searchParams.get('card_added');
    if (cardAdded === 'success') {
      toast.success(t('messages.addSuccess'));
      queryClient.invalidateQueries({ queryKey: ['savedCards'] });
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (cardAdded === 'failed') {
      toast.error(t('messages.addFailed'));
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [searchParams, queryClient, t]);

  // Fetch saved cards (now returns an array)
  const { data: savedCards, isLoading, error } = useQuery<SavedCard[]>({
    queryKey: ['savedCards'],
    queryFn: getSavedCard,
    retry: false,
  });

  // Remove card mutation
  const removeMutation = useMutation({
    mutationFn: async (cardId: number) => {
      // Call removeSavedCard with axios - need to pass card_id in request body
      const axios = (await import('axios')).default;
      const response = await axios.delete('/api/payments/saved-card/', {
        data: { card_id: cardId }
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedCards'] });
      toast.success(t('messages.removeSuccess'));
      setShowDeleteDialog(false);
      setCardToDelete(null);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || t('messages.removeFailed'));
    },
  });

  // Set default card mutation
  const setDefaultMutation = useMutation({
    mutationFn: (cardId: number) => setDefaultCard({ card_id: cardId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedCards'] });
      toast.success(t('messages.defaultSuccess'));
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || t('messages.defaultFailed'));
    },
  });

  // Add new card mutation
  const addCardMutation = useMutation({
    mutationFn: (makeDefault: boolean) => addNewCard({ make_default: makeDefault }),
    onSuccess: (data) => {
      // Redirect to payment URL to add card
      if (data.payment_url) {
        window.location.href = data.payment_url;
      }
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || t('messages.initiateFailed'));
    },
  });

  const handleRemove = (cardId: number) => {
    setCardToDelete(cardId);
    setShowDeleteDialog(true);
  };

  const confirmRemove = () => {
    if (cardToDelete) {
      removeMutation.mutate(cardToDelete);
    }
  };

  const handleSetDefault = (cardId: number) => {
    setDefaultMutation.mutate(cardId);
  };

  const handleAddNewCard = () => {
    // Add card without making it default (user can set default later)
    addCardMutation.mutate(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            {t('title')}
          </CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <p className="text-sm text-muted-foreground">{t('loading')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No cards saved or error
  if (error || !savedCards || savedCards.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                {t('title')}
              </CardTitle>
              <CardDescription>{t('description')}</CardDescription>
            </div>
            <Button
              onClick={handleAddNewCard}
              disabled={addCardMutation.isPending}
            >
              {addCardMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              {t('addCard')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t('noCards')}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Helper function to format card type display
  const getCardIcon = (cardType: string) => {
    const type = cardType.toLowerCase();
    if (type === 'visa') return '💳';
    if (type === 'mc' || type === 'mastercard') return '💳';
    return '💳';
  };

  const countLabel = savedCards.length === 1 ? t('card') : t('cards');

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                {t('title')}
              </CardTitle>
              <CardDescription>
                {t('descriptionWithCount', { count: savedCards.length, countLabel })}
              </CardDescription>
            </div>
            <Button
              onClick={handleAddNewCard}
              disabled={addCardMutation.isPending}
              variant="outline"
            >
              {addCardMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              {t('addCard')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Cards List */}
          <div className="space-y-3">
            {savedCards.map((card) => {
              const cardTypeDisplay = card.card_type.toUpperCase();
              const cardIcon = getCardIcon(card.card_type);
              const isDefault = card.is_default;

              return (
                <div
                  key={card.id}
                  className={`flex items-center justify-between p-4 border rounded-lg transition-all ${
                    isDefault
                      ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'
                      : 'bg-gradient-to-r from-slate-50 to-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="text-3xl">{cardIcon}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{cardTypeDisplay} {card.masked_card_number}</p>
                        {isDefault && (
                          <Badge variant="default" className="bg-blue-600">
                            <Star className="h-3 w-3 mr-1" />
                            {t('default')}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{t('expires')} {card.card_expiry}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('added')} {new Date(card.saved_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isDefault && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetDefault(card.id)}
                        disabled={setDefaultMutation.isPending}
                      >
                        {setDefaultMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-1" />
                            {t('setDefault')}
                          </>
                        )}
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRemove(card.id)}
                      disabled={removeMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      {t('remove')}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Info Alert */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              {t('autoRenewal.autoCharge')}
            </AlertDescription>
          </Alert>

          {/* Information */}
          <div className="pt-2 border-t">
            <h4 className="text-sm font-semibold mb-2">{t('autoRenewal.title')}</h4>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>• {t('autoRenewal.secureStorage')}</li>
              <li>• {t('autoRenewal.autoCharge')}</li>
              <li>• {t('autoRenewal.notifications')}</li>
              <li>• {t('autoRenewal.manage')}</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('removeDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('removeDialog.description')}
              {savedCards.find(c => c.id === cardToDelete)?.is_default &&
                ` ${t('removeDialog.defaultWarning')}`}
              {" "}{t('removeDialog.warning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeMutation.isPending}>{t('removeDialog.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemove}
              disabled={removeMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeMutation.isPending ? t('removeDialog.removing') : t('removeDialog.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
