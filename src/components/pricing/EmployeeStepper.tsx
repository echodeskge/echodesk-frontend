'use client';

import { useTranslations } from 'next-intl';
import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { EMPLOYEE_STEP, MAX_EMPLOYEES, MIN_EMPLOYEES, clampEmployees } from '@/lib/pricing';

interface EmployeeStepperProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
}

/**
 * One employee count drives every pack card and the calculator.
 * −/+ buttons around a big tabular figure, plus a 5–200 step-5 slider.
 */
export function EmployeeStepper({ value, onChange, className }: EmployeeStepperProps) {
  const t = useTranslations('landing.pricing.stepper');
  const set = (n: number) => onChange(clampEmployees(n));

  return (
    <div className={cn('mx-auto w-full max-w-xl space-y-4 text-center', className)}>
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">{t('label')}</h3>
        <p className="text-sm text-muted-foreground">{t('hint', { min: MIN_EMPLOYEES })}</p>
      </div>

      <div className="flex items-center justify-center gap-4">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={t('decrease')}
          disabled={value <= MIN_EMPLOYEES}
          onClick={() => set(value - EMPLOYEE_STEP)}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <div className="min-w-[9rem]">
          <div className="text-5xl font-black tabular-nums leading-none" data-testid="employee-count">
            {value}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">{t('value', { n: value })}</div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={t('increase')}
          disabled={value >= MAX_EMPLOYEES}
          onClick={() => set(value + EMPLOYEE_STEP)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2 px-1">
        <Slider
          value={[value]}
          onValueChange={([v]) => set(v)}
          min={MIN_EMPLOYEES}
          max={MAX_EMPLOYEES}
          step={EMPLOYEE_STEP}
          aria-label={t('label')}
        />
        <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
          <span>{MIN_EMPLOYEES}</span>
          <span>{MAX_EMPLOYEES}</span>
        </div>
      </div>
    </div>
  );
}
