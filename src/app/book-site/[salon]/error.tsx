'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

/** Runtime error inside a booking page: stay in the booking site's own shell and language. */
export default function BookingError({ reset }: { error: Error; reset: () => void }) {
  const t = useTranslations('publicBooking');
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
      <h1 className="text-xl font-semibold">{t('errors.pageTitle')}</h1>
      <p className="text-sm text-muted-foreground">{t('errors.generic')}</p>
      <Button onClick={reset}>{t('manage.retry')}</Button>
    </div>
  );
}
