'use client';

import { useTranslations } from 'next-intl';
import { Landmark, RefreshCw, Smartphone } from 'lucide-react';

/**
 * Three billing facts replacing the old emoji card, plus the one-line
 * footer. No VAT statement until decision D7 is confirmed.
 */
export function BillingNotes() {
  const t = useTranslations('landing.pricing.billing');
  const items = [
    { icon: Landmark, text: t('gel') },
    { icon: RefreshCw, text: t('change') },
    { icon: Smartphone, text: t('included') },
  ];
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {items.map(({ icon: Icon, text }) => (
          <div key={text} className="flex items-start gap-3 rounded-lg border p-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-secondary/10 text-secondary">
              <Icon className="h-4 w-4" />
            </div>
            <p className="text-sm text-muted-foreground">{text}</p>
          </div>
        ))}
      </div>
      <p className="text-center text-sm text-muted-foreground">{t('footer')}</p>
    </div>
  );
}
