"use client";

import { CreditCard, MoreVertical, Plus, Trash2, Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { TonePill } from "@/components/redesign/pill";
import { rdButton } from "@/components/redesign/buttons";
import { ActionButton, SettingsNote, SettingsSection } from "@/components/redesign/settings";
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
      <SettingsSection title={t('title')} hint={t('description')} testId="payment-methods">
        <div className="flex flex-col gap-3 px-4 py-3.5" aria-busy="true">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </SettingsSection>
    );
  }

  return (
    <>
      <SettingsSection
        title={t('title')}
        hint={t('description')}
        actions={
          onAddCard ? (
            <ActionButton icon={Plus} onClick={onAddCard} testId="payment-add-card">
              {t('addCardButton')}
            </ActionButton>
          ) : undefined
        }
        testId="payment-methods"
      >
        {!savedCards || savedCards.length === 0 ? (
          <div className="px-4 py-3.5">
            <SettingsNote
              tone="neutral"
              icon={CreditCard}
              action={
                onAddCard ? (
                  <ActionButton icon={Plus} onClick={onAddCard} testId="payment-add-first-card">
                    {t('addFirstCard')}
                  </ActionButton>
                ) : undefined
              }
            >
              {t('noCards')}
            </SettingsNote>
          </div>
        ) : (
          <ul>
            {savedCards.map((card) => (
              <li
                key={card.id}
                className="flex min-h-14 items-center gap-3 border-b px-4 py-2.5 last:border-b-0"
                data-testid="payment-card-row"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <CreditCard className="h-4 w-4" aria-hidden />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[13px] font-medium">
                      {getCardIcon(card.card_type)} •••• {card.masked_card_number?.slice(-4)}
                    </span>
                    {card.is_default && (
                      <TonePill tone="info">
                        <Star className="me-1 inline h-3 w-3 fill-current align-[-2px]" aria-hidden />
                        {t('badges.default')}
                      </TonePill>
                    )}
                    {card.card_save_type === "subscription" && (
                      <TonePill tone="neutral">{t('badges.subscription')}</TonePill>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {t('cardExpires', { date: card.card_expiry || "N/A" })}
                  </span>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button type="button" className={rdButton.ghostIconSm} aria-label={t('title')}>
                      <MoreVertical className="h-4 w-4" aria-hidden />
                    </button>
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
      </SettingsSection>

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
