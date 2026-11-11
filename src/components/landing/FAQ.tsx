'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FAQ_KEYS } from './faq-keys';
import { CONTAINER, SectionHeading } from './SectionHeading';

/**
 * Homepage FAQ accordion (design: heading on the left, hairline list on
 * the right). The same question/answer set is exposed as FAQPage JSON-LD
 * by FAQPageSchema (server component) so Googlebot reads it in the
 * initial HTML — that's what unlocks the FAQ rich result.
 */
export function FAQ() {
  const t = useTranslations('landing.faq');
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section
      id="faq"
      className={cn(
        CONTAINER,
        'grid scroll-mt-[60px] grid-cols-1 items-start gap-10 py-[72px] min-[1000px]:grid-cols-3',
      )}
    >
      <SectionHeading eyebrow={t('eyebrow')} title={t('heading')} subtitle={t('subheading')} className="max-w-[420px]" />

      <div className="flex flex-col border-t min-[1000px]:col-span-2" data-testid="faq-list">
        {FAQ_KEYS.map((key, idx) => {
          const isOpen = openIndex === idx;
          const panelId = `faq-${key}`;
          return (
            <div key={key} className="border-b">
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                aria-expanded={isOpen}
                aria-controls={panelId}
                className="flex w-full items-center justify-between gap-4 px-1 py-[18px] text-left text-base font-semibold transition-colors hover:text-secondary"
              >
                {t(`items.${key}.question`)}
                {isOpen ? (
                  <Minus className="h-[18px] w-[18px] shrink-0 text-muted-foreground" aria-hidden="true" />
                ) : (
                  <Plus className="h-[18px] w-[18px] shrink-0 text-muted-foreground" aria-hidden="true" />
                )}
              </button>
              {isOpen && (
                <p id={panelId} className="pb-[18px] pl-1 pr-10 text-[15px] leading-6 text-muted-foreground">
                  {t(`items.${key}.answer`)}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
