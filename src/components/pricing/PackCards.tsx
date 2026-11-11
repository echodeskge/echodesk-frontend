'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  ArrowRight,
  CalendarCheck,
  Check,
  Layers,
  PhoneCall,
  ShoppingBag,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Feature } from '@/types/package';
import { EVERYTHING_SLUG, PACKS, type PackSlug } from '@/data/packs';
import {
  formatGel,
  packModuleKeys,
  perEmployeePrice,
  priceByKey,
  registrationUrl,
} from '@/lib/pricing';
import { useModuleCopy } from './use-module-copy';

const PACK_ICONS: Record<PackSlug, LucideIcon> = {
  bookings: CalendarCheck,
  shop: ShoppingBag,
  callcentre: PhoneCall,
  everything: Layers,
};

const CONTACT_EMAIL = 'info@echodesk.ge';

interface PackCardsProps {
  features: readonly Feature[];
  employees: number;
  /** "Load into calculator": the parent sets the builder state and scrolls. */
  onLoad?: (slug: PackSlug) => void;
}

/**
 * Three buyer-named packs + the "Everything" card. Every number is the live
 * sum of the module prices by key, so an admin price edit updates the cards.
 */
export function PackCards({ features, employees, onLoad }: PackCardsProps) {
  const t = useTranslations('landing.pricing');
  const prices = priceByKey(features);
  const byKey = new Map(features.map((f) => [f.key, f]));
  const copy = useModuleCopy();

  const moduleName = (key: string) => {
    const f = byKey.get(key);
    return f ? copy(f).name : key;
  };

  const cards = PACKS.map((pack) => ({
    ...pack,
    moduleKeys: packModuleKeys(pack.slug, features),
  })).filter((p) => p.moduleKeys.length > 0);

  const everythingKeys = packModuleKeys(EVERYTHING_SLUG, features);
  const everythingPrice = perEmployeePrice(everythingKeys, prices);

  return (
    <div className="space-y-6" data-testid="pack-cards">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {cards.map((pack) => {
          const Icon = PACK_ICONS[pack.slug];
          const perEmployee = perEmployeePrice(pack.moduleKeys, prices);
          const total = perEmployee * employees;
          return (
            <Card
              key={pack.slug}
              data-testid={`pack-${pack.slug}`}
              className={cn('flex flex-col', pack.highlight && 'ring-1 ring-secondary border-secondary/40')}
            >
              <CardHeader className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
                    <Icon className="h-5 w-5" />
                  </div>
                  {pack.highlight && (
                    <Badge variant="secondary" className="whitespace-nowrap">
                      {t('packs.mostPopular')}
                    </Badge>
                  )}
                </div>
                <div className="space-y-1">
                  <CardTitle className="text-xl">{t(`packs.${pack.slug}.name`)}</CardTitle>
                  <CardDescription>{t(`packs.${pack.slug}.audience`)}</CardDescription>
                </div>
                <p className="text-sm text-muted-foreground">{t(`packs.${pack.slug}.tagline`)}</p>
              </CardHeader>

              <CardContent className="flex-1 space-y-5">
                <PriceBlock perEmployee={perEmployee} total={total} employees={employees} />

                <ul className="space-y-2 text-sm">
                  {pack.moduleKeys.map((key) => (
                    <li key={key} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      <span className="min-w-0">{moduleName(key)}</span>
                    </li>
                  ))}
                  <li className="flex items-start gap-2 text-muted-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    <span className="min-w-0">{t('packs.workspaceIncluded')}</span>
                  </li>
                </ul>

                <AddonChips keys={pack.addonKeys} prices={prices} name={moduleName} available={byKey} />
              </CardContent>

              <CardFooter className="flex flex-col gap-2">
                <Button size="lg" className="w-full" asChild>
                  <Link
                    href={registrationUrl({ pack: pack.slug, modules: pack.moduleKeys, employees })}
                    data-testid={`pack-cta-${pack.slug}`}
                  >
                    {t(`packs.${pack.slug}.cta`)}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                {onLoad && (
                  <Button variant="ghost" size="sm" className="w-full" type="button" onClick={() => onLoad(pack.slug)}>
                    {t('packs.loadCalculator')}
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {everythingKeys.length > 0 && (
        <Card
          data-testid="pack-everything"
          className="border-secondary/30 bg-secondary/5"
        >
          <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-[1fr_auto] md:items-center">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">{t('packs.everything.name')}</h3>
                  <p className="text-sm text-muted-foreground">{t('packs.everything.tagline')}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {everythingKeys.map(moduleName).join(' · ')}
              </p>
            </div>
            <div className="flex flex-col gap-3 md:items-end">
              <PriceBlock perEmployee={everythingPrice} total={everythingPrice * employees} employees={employees} align="md:text-right" />
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button size="lg" asChild>
                  <Link
                    href={registrationUrl({ pack: EVERYTHING_SLUG, modules: everythingKeys, employees })}
                    data-testid="pack-cta-everything"
                  >
                    {t('packs.everything.cta')}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                {onLoad && (
                  <Button variant="ghost" type="button" onClick={() => onLoad(EVERYTHING_SLUG)}>
                    {t('packs.loadCalculator')}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      <p className="text-center text-sm text-muted-foreground">
        {t.rich('contactUs', {
          email: () => (
            <a className="font-medium text-foreground underline-offset-4 hover:underline" href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </a>
          ),
        })}
      </p>
    </div>
  );
}

function PriceBlock({
  perEmployee,
  total,
  employees,
  align,
}: {
  perEmployee: number;
  total: number;
  employees: number;
  align?: string;
}) {
  const t = useTranslations('landing.pricing');
  return (
    <div className={cn('space-y-1', align)}>
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="text-4xl font-black tabular-nums">{formatGel(perEmployee)} ₾</span>
        <span className="text-sm text-muted-foreground">{t('perEmployeeMonth')}</span>
      </div>
      <p className="text-sm text-muted-foreground tabular-nums" data-testid="pack-total">
        {t('forEmployees', { total: formatGel(total), n: employees })}
      </p>
    </div>
  );
}

function AddonChips({
  keys,
  prices,
  name,
  available,
}: {
  keys: readonly string[];
  prices: ReadonlyMap<string, number>;
  name: (key: string) => string;
  available: Map<string, Feature>;
}) {
  const t = useTranslations('landing.pricing');
  const chips = keys.filter((k) => available.has(k));
  if (chips.length === 0) return null;
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t('packs.addons')}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {chips.map((k) => (
          <Badge key={k} variant="outline" className="font-normal tabular-nums">
            {name(k)} +{formatGel(prices.get(k) ?? 0)} ₾
          </Badge>
        ))}
      </div>
    </div>
  );
}
