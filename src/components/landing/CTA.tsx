'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CONTAINER } from './SectionHeading';

/** Closing band (design: primary surface, blurred indigo glow, one CTA). */
export function CTA() {
  const t = useTranslations('landing.cta');

  return (
    <section className={cn(CONTAINER, 'pb-20')} data-testid="cta">
      <div className="relative flex flex-col items-start gap-5 overflow-hidden rounded-[20px] bg-primary px-[clamp(24px,5vw,64px)] py-[clamp(40px,6vw,72px)] text-primary-foreground">
        <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-secondary/50 blur-[80px]" />
        <h2 className="relative max-w-[620px] text-[clamp(28px,3.6vw,42px)] font-extrabold leading-[1.08] tracking-[-.03em]">
          {t('title')}
        </h2>
        <p className="relative max-w-[560px] text-[17px] opacity-85">{t('subtitle')}</p>
        <div className="relative flex flex-wrap items-center gap-4">
          <Link
            href="/registration"
            className="inline-flex h-[46px] items-center gap-2 rounded-[9px] bg-background px-5 text-[15px] font-semibold text-foreground transition-opacity hover:opacity-90"
          >
            {t('button')}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <span className="text-[13px] opacity-75">{t('noCreditCard')}</span>
        </div>
      </div>
    </section>
  );
}
