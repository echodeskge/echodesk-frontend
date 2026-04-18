'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useConsent, type ConsentCategories } from '@/lib/consent';

/**
 * Cookie consent banner.
 *
 * Shown only when `status === 'pending'`. Offers three quick actions
 * (Accept all, Reject optional, Customize) and an expanded customize
 * mode with per-category toggles.
 */
export function CookieConsent() {
  const t = useTranslations('cookie');
  const { status, categories, accept, reject, setCategories } = useConsent();
  const [customizing, setCustomizing] = useState(false);
  const [draft, setDraft] = useState<ConsentCategories>(categories);

  if (status !== 'pending') return null;

  const updateDraft = (key: 'analytics' | 'marketing', value: boolean) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const savePreferences = () => {
    setCategories({ analytics: draft.analytics, marketing: draft.marketing });
  };

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-description"
      className="fixed inset-x-0 bottom-0 z-50 p-4 sm:p-6 pointer-events-none"
    >
      <Card
        className="mx-auto max-w-3xl shadow-2xl border animate-in slide-in-from-bottom-4 duration-300 pointer-events-auto bg-background"
      >
        <CardContent className="p-5 sm:p-6 space-y-4">
          <div className="space-y-2">
            <h2 id="cookie-consent-title" className="text-lg font-semibold">
              {t('title')}
            </h2>
            <p id="cookie-consent-description" className="text-sm text-muted-foreground">
              {t('description')}{' '}
              <Link
                href="/privacy-policy"
                className="underline underline-offset-2 hover:text-foreground"
              >
                {t('learnMore')}
              </Link>
            </p>
          </div>

          {customizing && (
            <div className="space-y-3 rounded-md border bg-muted/30 p-4">
              <CategoryRow
                title={t('categories.necessary.title')}
                description={t('categories.necessary.description')}
                checked
                disabled
              />
              <CategoryRow
                title={t('categories.analytics.title')}
                description={t('categories.analytics.description')}
                checked={draft.analytics}
                onChange={(v) => updateDraft('analytics', v)}
              />
              <CategoryRow
                title={t('categories.marketing.title')}
                description={t('categories.marketing.description')}
                checked={draft.marketing}
                onChange={(v) => updateDraft('marketing', v)}
              />
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:justify-end gap-2">
            {customizing ? (
              <Button onClick={savePreferences} className="sm:w-auto">
                {t('savePreferences')}
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setDraft(categories);
                    setCustomizing(true);
                  }}
                  className="sm:w-auto"
                >
                  {t('customize')}
                </Button>
                <Button variant="outline" onClick={reject} className="sm:w-auto">
                  {t('rejectOptional')}
                </Button>
                <Button onClick={accept} className="sm:w-auto">
                  {t('acceptAll')}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface CategoryRowProps {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (value: boolean) => void;
}

function CategoryRow({ title, description, checked, disabled, onChange }: CategoryRowProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 space-y-0.5">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={onChange}
        aria-label={title}
      />
    </div>
  );
}
