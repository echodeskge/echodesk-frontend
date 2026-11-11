'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowRight, CalendarCheck, Layers, PhoneCall, ShoppingBag, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Feature } from '@/types/package';
import { EVERYTHING_SLUG, PACKS, type PackSlug } from '@/data/packs';
import { formatGel, packModuleKeys, perEmployeePrice, priceByKey, registrationUrl } from '@/lib/pricing';
import { useModuleCopy } from '@/components/pricing/use-module-copy';

const PACK_ICONS: Record<PackSlug, LucideIcon> = {
  bookings: CalendarCheck,
  shop: ShoppingBag,
  callcentre: PhoneCall,
  everything: Layers,
};

interface PackPresetsProps {
  features: readonly Feature[];
  employees: number;
  /** "Load into calculator": the parent sets the builder state and scrolls. */
  onLoad: (slug: PackSlug) => void;
}

/**
 * Three buyer-named packs + "Everything" as compact preset cards above the
 * builder (decisions D8/D14). Every price is the live sum of the pack's
 * module prices (+ workspace) at render time.
 */
export function PackPresets({ features, employees, onLoad }: PackPresetsProps) {
  const t = useTranslations('landing.pricing');
  const copy = useModuleCopy();
  const prices = priceByKey(features);
  const byKey = new Map(features.map((f) => [f.key, f]));
  const moduleName = (key: string) => {
    const f = byKey.get(key);
    return f ? copy(f).name : key;
  };

  const cards = [...PACKS.map((p) => ({ slug: p.slug, highlight: !!p.highlight })), { slug: EVERYTHING_SLUG, highlight: false }]
    .map((p) => ({ ...p, moduleKeys: packModuleKeys(p.slug, features) }))
    .filter((p) => p.moduleKeys.length > 0);

  if (cards.length === 0) return null;

  return (
    <div className="flex flex-col gap-4" data-testid="pack-cards">
      <p className="text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{t('packs.pick')}</span> {t('packs.orBuild')}
      </p>
      {/* px variants only: Tailwind emits `min-[…px]` blocks before the rem breakpoints, so a `sm:` rule would win. */}
      <div className="grid grid-cols-1 gap-3 min-[640px]:grid-cols-2 min-[1000px]:grid-cols-4">
        {cards.map((pack) => {
          const Icon = PACK_ICONS[pack.slug];
          const perEmployee = perEmployeePrice(pack.moduleKeys, prices);
          const total = perEmployee * employees;
          return (
            <div
              key={pack.slug}
              data-testid={`pack-${pack.slug}`}
              className={cn(
                'flex flex-col gap-3 rounded-2xl border bg-background p-[18px]',
                pack.highlight && 'border-secondary/50 shadow-[0_20px_50px_-30px_hsl(var(--secondary)/.5)]',
              )}
            >
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1 text-[15px] font-bold leading-5 tracking-[-.01em]">
                  {t(`packs.${pack.slug}.name`)}
                </span>
              </div>
              {/* Own line: next to a long Georgian pack name the badge would collide with the title. */}
              {pack.highlight && (
                <span className="w-fit rounded bg-secondary/10 px-1.5 text-[11px] font-semibold leading-[18px] text-secondary">
                  {t('packs.mostPopular')}
                </span>
              )}
              <p className="text-[13px] leading-[18px] text-muted-foreground">{t(`packs.${pack.slug}.audience`)}</p>
              <div className="flex flex-col">
                <span className="flex flex-wrap items-baseline gap-x-1.5">
                  <span className="text-[26px] font-extrabold leading-none tracking-[-.03em] tabular-nums">
                    {formatGel(perEmployee)} ₾
                  </span>
                  <span className="text-xs text-muted-foreground">{t('perEmployeeMonth')}</span>
                </span>
                <span className="mt-1 text-xs text-muted-foreground tabular-nums" data-testid="pack-total">
                  {t('forEmployees', { total: formatGel(total), n: employees })}
                </span>
              </div>
              <p className="text-xs leading-[18px] text-muted-foreground">{pack.moduleKeys.map(moduleName).join(' · ')}</p>
              <div className="mt-auto flex flex-col gap-1.5 pt-1">
                <Link
                  href={registrationUrl({ pack: pack.slug, modules: pack.moduleKeys, employees })}
                  data-testid={`pack-cta-${pack.slug}`}
                  className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-center text-[13px] font-semibold leading-[18px] text-primary-foreground transition-opacity hover:opacity-90"
                >
                  {t(`packs.${pack.slug}.cta`)}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
                <button
                  type="button"
                  onClick={() => onLoad(pack.slug)}
                  className="h-8 rounded-lg text-xs font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  {t('packs.loadCalculator')}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
