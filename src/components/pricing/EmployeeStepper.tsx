'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { EmployeeCount } from './EmployeeCount';

interface EmployeeStepperProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
}

/**
 * Signup step 1 heading + the shared `EmployeeCount` control in its large
 * form. One count drives the pack header line, every module card and the
 * summary. Kept under its old name so `FeatureSelection` needs no change.
 */
export function EmployeeStepper({ value, onChange, className }: EmployeeStepperProps) {
  const t = useTranslations('landing.pricing.stepper');

  return (
    <div className={cn('mx-auto w-full max-w-xl space-y-4 text-center', className)}>
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">{t('label')}</h3>
        <p className="text-sm text-muted-foreground">{t('value', { n: value })}</p>
      </div>
      <EmployeeCount id="signup-employees" value={value} onChange={onChange} size="lg" />
    </div>
  );
}
