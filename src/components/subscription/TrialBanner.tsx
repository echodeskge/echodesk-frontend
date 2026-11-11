'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Clock, CreditCard, X } from 'lucide-react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { needsCardPrompt, readTrialStatus } from '@/lib/subscription-trial';

export const TRIAL_BANNER_DISMISSED_KEY = 'echodesk.trialBanner.dismissed';

function readDismissed(): boolean {
  try {
    return window.sessionStorage.getItem(TRIAL_BANNER_DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

function writeDismissed(): void {
  try {
    window.sessionStorage.setItem(TRIAL_BANNER_DISMISSED_KEY, '1');
  } catch {
    // storage blocked: the banner simply comes back on the next page load
  }
}

/**
 * "Free trial — N days left · Add a card" strip at the top of the tenant
 * shell. Shown while `GET /api/subscription/me/` says `is_trial` and
 * `has_saved_card === false`; hidden once a card exists. Dismiss hides it for
 * the rest of the browser session.
 */
export function TrialBanner() {
  const t = useTranslations('subscription.trial');
  const { subscription } = useSubscription();
  const [dismissed, setDismissed] = useState(true);

  // sessionStorage is client-only: start hidden, then read it after mount.
  useEffect(() => {
    setDismissed(readDismissed());
  }, []);

  const status = readTrialStatus(subscription);
  if (dismissed || !needsCardPrompt(status)) return null;

  const days = status.daysRemaining ?? 0;

  return (
    <div
      role="status"
      data-testid="trial-banner"
      className="flex min-h-9 shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-amber-300/70 bg-amber-50 px-3 py-1.5 text-[13px] text-foreground dark:border-amber-700/50 dark:bg-amber-950/40"
    >
      <Clock className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
      <span className="font-medium" data-testid="trial-banner-days">
        {t('banner', { days })}
      </span>
      <span aria-hidden className="hidden text-muted-foreground sm:inline">
        ·
      </span>
      <Link
        href="/settings/subscription?tab=billing"
        data-testid="trial-banner-add-card"
        className="inline-flex items-center gap-1 font-semibold text-primary underline-offset-4 hover:underline"
      >
        <CreditCard className="h-3.5 w-3.5" aria-hidden />
        {t('addCard')}
      </Link>
      <button
        type="button"
        onClick={() => {
          writeDismissed();
          setDismissed(true);
        }}
        aria-label={t('dismiss')}
        title={t('dismiss')}
        data-testid="trial-banner-dismiss"
        className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
