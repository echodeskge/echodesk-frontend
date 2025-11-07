"use client";

import { CreditCard, MoreVertical, Plus, Trash2, Star } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useState } from "react";
import { useTranslations } from "next-intl";

interface PaymentMethodCardProps {
  savedCards?: any[];
  isLoading?: boolean;
  onAddCard?: () => void;
  onRemoveCard?: (cardId: number) => void;
  onSetDefaultCard?: (cardId: number) => void;
}

export function PaymentMethodCard({
  savedCards,
  isLoading = false,
  onAddCard,
  onRemoveCard,
  onSetDefaultCard,
}: PaymentMethodCardProps) {
  const t = useTranslations('subscription.paymentMethods');
  const [cardToDelete, setCardToDelete] = useState<number | null>(null);

  const getCardIcon = (cardType: string) => {
    const type = cardType?.toLowerCase();
    if (type?.includes("visa")) return "💳 Visa";
    if (type?.includes("mastercard")) return "💳 Mastercard";
    if (type?.includes("amex")) return "💳 Amex";
    return "💳";
  };

  const handleRemoveCard = (cardId: number) => {
    setCardToDelete(cardId);
  };

  const confirmRemove = () => {
    if (cardToDelete && onRemoveCard) {
      onRemoveCard(cardToDelete);
    }
    setCardToDelete(null);
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-16 bg-gray-200 rounded animate-pulse" />
            <div className="h-16 bg-gray-200 rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('title')}</CardTitle>
              <CardDescription>
                {t('description')}
              </CardDescription>
            </div>
            {onAddCard && (
              <Button onClick={onAddCard} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                {t('addCardButton')}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!savedCards || savedCards.length === 0 ? (
            <Alert>
              <CreditCard className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p>{t('noCards')}</p>
                  {onAddCard && (
                    <Button onClick={onAddCard} size="sm" variant="outline" className="mt-2">
                      <Plus className="h-4 w-4 mr-1" />
                      {t('addFirstCard')}
                    </Button>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          ) : (
            <ul className="space-y-3">
              {savedCards.map((card) => (
                <li
                  key={card.id}
                  className="flex justify-between items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100">
                      <CreditCard className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {getCardIcon(card.card_type)} •••• {card.masked_card_number?.slice(-4)}
                        </span>
                        {card.is_default && (
                          <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                            <Star className="h-3 w-3 mr-1 fill-blue-700" />
                            {t('badges.default')}
                          </Badge>
                        )}
                        {card.card_save_type === "subscription" && (
                          <Badge variant="outline" className="text-xs">
                            {t('badges.subscription')}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {t('cardExpires', { date: card.card_expiry || "N/A" })}
                      </p>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {!card.is_default && onSetDefaultCard && (
                        <DropdownMenuItem
                          onClick={() => onSetDefaultCard(card.id)}
                        >
                          <Star className="h-4 w-4 mr-2" />
                          {t('actions.setDefault')}
                        </DropdownMenuItem>
                      )}
                      {onRemoveCard && (
                        <DropdownMenuItem
                          onClick={() => handleRemoveCard(card.id)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {t('actions.removeCard')}
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={cardToDelete !== null} onOpenChange={(open) => !open && setCardToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('removeDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('removeDialog.description')}
              {savedCards?.find(c => c.id === cardToDelete)?.is_default && (
                <span className="block mt-2 text-amber-600 font-medium">
                  {t('removeDialog.defaultCardWarning')}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('removeDialog.cancelButton')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemove} className="bg-red-600 hover:bg-red-700">
              {t('removeDialog.confirmButton')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
