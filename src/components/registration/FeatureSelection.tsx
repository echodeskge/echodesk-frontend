'use client';

import { useTranslations } from 'next-intl';
import { ArrowLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { Feature } from '@/types/package';
import type { PackSlug } from '@/data/packs';
import { EmployeeStepper } from '@/components/pricing/EmployeeStepper';
import { PlanBuilder } from '@/components/pricing/PlanBuilder';
import { formatGel, perEmployeePrice } from '@/lib/pricing';

interface FeatureSelectionProps {
  features: Feature[];
  loading: boolean;
  /** Selected module keys (workspace implied). */
  selectedKeys: readonly string[];
  prices: ReadonlyMap<string, number>;
  employees: number;
  /** Pack the visitor arrived with (header card); null for a blank start. */
  pack: PackSlug | null;
  autoNotice?: string | null;
  onToggle: (key: string) => void;
  onEmployeesChange: (count: number) => void;
  onContinue: () => void;
  onBack: () => void;
}

/**
 * Signup step 1 — "Review your plan": the same module cards, stepper and
 * summary as the landing calculator, pre-set from the URL and editable.
 */
export function FeatureSelection({
  features,
  loading,
  selectedKeys,
  prices,
  employees,
  pack,
  autoNotice,
  onToggle,
  onEmployeesChange,
  onContinue,
  onBack,
}: FeatureSelectionProps) {
  const t = useTranslations('landing.pricing');
  const tAuth = useTranslations('auth');

  if (loading) {
    return (
      <div className="py-16 text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
        <p className="mt-4 text-muted-foreground">{t('registration.loading')}</p>
      </div>
    );
  }

  const perEmployee = perEmployeePrice(selectedKeys, prices);

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="space-y-4 text-center">
        <Button variant="ghost" onClick={onBack} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {tAuth('backToHome')}
        </Button>
        <h1 className="text-4xl font-bold">
          {pack ? t('registration.reviewTitle') : t('registration.buildTitle')}
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">{t('registration.subtitle')}</p>
      </div>

      {pack && (
        <Card className="mx-auto max-w-2xl border-secondary/30 bg-secondary/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex min-w-0 items-center gap-2">
              <Check className="h-5 w-5 shrink-0 text-success" />
              <div className="min-w-0">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t('registration.yourPack')}
                </div>
                <div className="font-semibold">{t(`packs.${pack}.name`)}</div>
              </div>
            </div>
            <div className="ml-auto whitespace-nowrap text-sm tabular-nums text-muted-foreground">
              {formatGel(perEmployee)} ₾ × {employees} ={' '}
              <span className="font-semibold text-foreground">{formatGel(perEmployee * employees)} ₾</span>{' '}
              {t('perMonth')}
            </div>
          </CardContent>
        </Card>
      )}

      <EmployeeStepper value={employees} onChange={onEmployeesChange} />

      <PlanBuilder
        features={features}
        employees={employees}
        selectedKeys={selectedKeys}
        prices={prices}
        onToggle={onToggle}
        autoNotice={autoNotice}
        onCta={onContinue}
        ctaLabel={t('registration.continue')}
        idPrefix="signup-module"
        summaryExtra={
          <p className="text-sm text-muted-foreground" data-testid="trial-note">
            {t('registration.trialNote')}
          </p>
        }
      />
    </div>
  );
}
