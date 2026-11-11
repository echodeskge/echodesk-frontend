'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowRight, MessageSquare } from 'lucide-react';
import { MODULE_CATALOG } from '@/data/module-catalog';
import { cn } from '@/lib/utils';
import { AppMock } from './AppMock';
import { CONTAINER } from './SectionHeading';

/** Hero chips: real modules, same icons as the catalogue. */
const CHIPS = [
  { key: 'tickets', moduleKey: 'ticket_management' },
  { key: 'inbox', moduleKey: 'social_integrations' },
  { key: 'calls', moduleKey: 'ip_calling' },
] as const;

export function Hero() {
  const t = useTranslations('landing.hero');

  return (
    <section className={cn(CONTAINER, 'flex flex-col gap-14 pt-[72px]')} data-testid="hero">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] items-end gap-x-16 gap-y-8">
        <div className="flex flex-col gap-[22px]">
          <span className="inline-flex h-7 w-fit items-center gap-2 rounded-full border border-secondary/30 bg-secondary/[.08] px-3 text-xs font-semibold tracking-[.01em] text-secondary">
            <MessageSquare className="h-[13px] w-[13px]" aria-hidden="true" />
            {t('badge')}
          </span>
          <h1 className="text-[clamp(40px,5.4vw,66px)] font-extrabold leading-none tracking-[-.04em]">
            {t('title')}
          </h1>
        </div>

        <div className="flex max-w-[480px] flex-col gap-6">
          <p className="text-lg leading-7 text-muted-foreground">{t('subtitle')}</p>
          <div className="flex flex-wrap gap-2.5">
            <Link
              href="/registration"
              className="inline-flex h-[46px] items-center gap-2 rounded-[9px] bg-primary px-5 text-[15px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              {t('cta.primary')}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="#features"
              className="inline-flex h-[46px] items-center rounded-[9px] border px-5 text-[15px] font-semibold transition-colors hover:bg-accent"
            >
              {t('cta.secondary')}
            </Link>
          </div>
          <ul className="flex flex-wrap gap-[18px] text-sm text-muted-foreground" data-testid="hero-chips">
            {CHIPS.map((chip) => {
              const Icon = MODULE_CATALOG[chip.moduleKey].icon;
              return (
                <li key={chip.key} className="inline-flex items-center gap-2">
                  <Icon className="h-4 w-4 text-foreground" aria-hidden="true" />
                  {t(`chips.${chip.key}`)}
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <AppMock />
    </section>
  );
}
