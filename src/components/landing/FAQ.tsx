'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

const FAQ_KEYS = [
  'whatIsEchodesk',
  'channels',
  'calling',
  'gelBilling',
  'freeTrial',
  'competitors',
  'dataResidency',
] as const;

/**
 * Homepage FAQ accordion. The same question/answer set is exposed as
 * FAQPage JSON-LD by FAQPageSchema (server component) so Googlebot
 * reads it in the initial HTML — that's what unlocks the FAQ rich result.
 */
export function FAQ() {
  const t = useTranslations('landing.faq');
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="container py-16">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10 space-y-3">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">{t('heading')}</h2>
          <p className="text-muted-foreground text-lg">{t('subheading')}</p>
        </div>

        <div className="space-y-3">
          {FAQ_KEYS.map((key, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div key={key} className="rounded-xl border bg-card">
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="flex w-full items-center justify-between gap-4 p-4 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="font-semibold">{t(`items.${key}.question`)}</span>
                  {isOpen ? (
                    <Minus className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <Plus className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  )}
                </button>
                <div
                  className={cn(
                    'grid overflow-hidden transition-all duration-200',
                    isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
                  )}
                >
                  <div className="min-h-0">
                    <div className="px-4 pb-4 text-muted-foreground leading-relaxed">
                      {t(`items.${key}.answer`)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export { FAQ_KEYS };
