'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { featuresList } from '@/api/generated/api';
import type { Feature } from '@/types/package';
import type { PackSlug } from '@/data/packs';
import { MIN_EMPLOYEES, defaultModuleKeys, packModuleKeys, registrationUrl } from '@/lib/pricing';
import { BillingNotes } from '@/components/pricing/BillingNotes';
import { EmployeeStepper } from '@/components/pricing/EmployeeStepper';
import { ModuleTable } from '@/components/pricing/ModuleTable';
import { PackCards } from '@/components/pricing/PackCards';
import { PlanBuilder } from '@/components/pricing/PlanBuilder';
import { usePlanSelection } from '@/components/pricing/use-plan-selection';

/**
 * Landing `#pricing`: one employee stepper that drives three buyer-named
 * pack cards + "Everything", the module comparison table, and the
 * à-la-carte calculator. Every number is computed from the live
 * `GET /api/features/` prices by key — nothing is hard-coded.
 */
export function Pricing({ initialFeatures = [] }: { initialFeatures?: Feature[] }) {
  const t = useTranslations('landing.pricing');
  // Server-seeded so the first paint (and crawlers) already carry real GEL
  // prices; refetched client-side only when the seed was empty.
  const [features, setFeatures] = useState<Feature[]>(initialFeatures);
  const plan = usePlanSelection(features, MIN_EMPLOYEES);
  const { replace } = plan;
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

  const loadPack = (slug: PackSlug) => {
    replace(packModuleKeys(slug, features));
    builderRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section id="pricing" className="container py-16 space-y-12">
      <div className="mx-auto max-w-3xl space-y-4 text-center">
        <h2 className="text-3xl font-bold md:text-4xl">{t('title')}</h2>
        <p className="text-lg text-muted-foreground">{t('subtitle')}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Badge variant="outline">{t('chips.gel')}</Badge>
          <Badge variant="outline">{t('chips.monthly')}</Badge>
          <Badge variant="outline">{t('chips.cancel')}</Badge>
        </div>
      </div>

      <EmployeeStepper value={plan.employees} onChange={plan.setEmployees} />

      <PackCards features={features} employees={plan.employees} onLoad={loadPack} />

      <ModuleTable features={features} />

      <div ref={builderRef} id="plan-builder" className="scroll-mt-24 space-y-6">
        <div className="mx-auto max-w-2xl space-y-2 text-center">
          <h3 className="text-2xl font-bold">{t('builder.title')}</h3>
          <p className="text-muted-foreground">{t('builder.subtitle')}</p>
        </div>
        <PlanBuilder
          features={features}
          employees={plan.employees}
          selectedKeys={plan.selectedKeys}
          prices={plan.prices}
          onToggle={plan.toggle}
          autoNotice={plan.autoNotice}
          ctaHref={registrationUrl({ modules: plan.selectedKeys, employees: plan.employees })}
          ctaLabel={t('builder.summary.cta')}
        />
      </div>

      <BillingNotes />
    </section>
  );
}
