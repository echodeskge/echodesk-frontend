'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { RefreshCw, SlidersHorizontal, TrendingUp, type LucideIcon } from 'lucide-react';
import { featuresList } from '@/api/generated/api';
import type { Feature } from '@/types/package';
import type { PackSlug } from '@/data/packs';
import { cn } from '@/lib/utils';
import {
  MIN_EMPLOYEES,
  defaultModuleKeys,
  packModuleKeys,
  registrationUrl,
  visibleModuleKeys,
} from '@/lib/pricing';
import { usePlanSelection } from '@/components/pricing/use-plan-selection';
import { CONTAINER, SectionHeading } from './SectionHeading';
import { PackPresets } from './PackPresets';
import { ModulePicker } from './ModulePicker';
import { PlanCard } from './PlanCard';
import { onModuleRequest } from './select-module';

/**
 * Landing `#pricing` (design: two-column builder + sticky "Your plan").
 * Packs sit above the builder as compact presets. Every number is computed
 * from the live `GET /api/features/` prices by key — nothing is hard-coded;
 * the math lives in `usePlanSelection` / `lib/pricing`.
 */
export function Pricing({ initialFeatures = [] }: { initialFeatures?: Feature[] }) {
  const t = useTranslations('landing.pricing');
  // Server-seeded so the first paint (and crawlers) already carry real GEL
  // prices; refetched client-side only when the seed was empty.
  const [features, setFeatures] = useState<Feature[]>(initialFeatures);
  const plan = usePlanSelection(features, MIN_EMPLOYEES);
  const { replace, toggle, selectedKeys } = plan;
  const builderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialFeatures.length > 0) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await featuresList();
        const all = (data.results || []) as Feature[];
        if (cancelled || all.length === 0) return;
        setFeatures(all);
      } catch {
        /* keep whatever we have */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialFeatures.length]);

  // When features arrive after mount, seed the default selection once.
  const seeded = useRef(initialFeatures.length > 0);
  useEffect(() => {
    if (seeded.current || features.length === 0) return;
    seeded.current = true;
    replace(defaultModuleKeys(features));
  }, [features, replace]);

  // A feature card asked for its module: switch it on (requires rules apply).
  useEffect(
    () =>
      onModuleRequest((key) => {
        if (!selectedKeys.includes(key)) toggle(key);
      }),
    [selectedKeys, toggle],
  );

  const loadPack = (slug: PackSlug) => {
    replace(packModuleKeys(slug, features));
    builderRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const allKeys = visibleModuleKeys(features);
  const allOn = allKeys.length > 0 && allKeys.every((k) => selectedKeys.includes(k));

  return (
    <section id="pricing" className="scroll-mt-[60px] border-t bg-muted/40">
      <div className={cn(CONTAINER, 'flex flex-col gap-10 py-[72px]')}>
        <SectionHeading eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')} />

        <PackPresets features={features} employees={plan.employees} onLoad={loadPack} />

        <div
          ref={builderRef}
          id="plan-builder"
          className="grid scroll-mt-[72px] grid-cols-[minmax(0,1fr)] items-start gap-6 min-[1000px]:grid-cols-[minmax(0,1.6fr)_minmax(300px,1fr)]"
        >
          <ModulePicker
            features={features}
            selectedKeys={selectedKeys}
            prices={plan.prices}
            onToggle={toggle}
            onToggleAll={() => replace(allOn ? [] : allKeys)}
            allOn={allOn}
            autoNotice={plan.autoNotice}
          />
          <PlanCard
            features={features}
            employees={plan.employees}
            onEmployeesChange={plan.setEmployees}
            selectedKeys={selectedKeys}
            prices={plan.prices}
            perEmployee={plan.perEmployee}
            total={plan.total}
            ctaHref={registrationUrl({ modules: selectedKeys, employees: plan.employees })}
          />
        </div>

        <Notes />
      </div>
    </section>
  );
}

const NOTES: { key: 'pay' | 'scale' | 'cancel'; icon: LucideIcon }[] = [
  { key: 'pay', icon: SlidersHorizontal },
  { key: 'scale', icon: TrendingUp },
  { key: 'cancel', icon: RefreshCw },
];

/** "Pay for what you use / Scale with confidence / Cancel anytime" row. */
function Notes() {
  const t = useTranslations('landing.pricing');
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] gap-6 rounded-2xl border bg-background p-7">
        {NOTES.map(({ key, icon: Icon }) => (
          <div key={key} className="flex flex-col gap-1.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-foreground">
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <h3 className="mt-1.5 text-[15px] font-bold">{t(`notes.${key}.title`)}</h3>
            <p className="text-sm text-muted-foreground">{t(`notes.${key}.desc`)}</p>
          </div>
        ))}
      </div>
      <p className="text-center text-[13px] text-muted-foreground">{t('billing.footer')}</p>
    </div>
  );
}
