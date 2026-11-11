'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowRight, Check, Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Feature } from '@/types/package';
import {
  CONTACT_US_FROM,
  EMPLOYEE_STEP,
  MAX_EMPLOYEES,
  MIN_EMPLOYEES,
  clampEmployees,
  formatGel,
  visibleModules,
  workspacePrice,
} from '@/lib/pricing';
import { useModuleCopy } from '@/components/pricing/use-module-copy';

const CONTACT_EMAIL = 'info@echodesk.ge';
const PRESETS = [5, 10, 25, 50] as const;

interface PlanCardProps {
  features: readonly Feature[];
  employees: number;
  onEmployeesChange: (n: number) => void;
  selectedKeys: readonly string[];
  prices: ReadonlyMap<string, number>;
  perEmployee: number;
  total: number;
  ctaHref: string;
}

/**
 * Sticky "Your plan" card: team-size stepper + presets + slider, one
 * `price × n = total` line per selected module (and the workspace), the
 * monthly total, "50+ — contact us" and the registration CTA.
 */
export function PlanCard({
  features,
  employees,
  onEmployeesChange,
  selectedKeys,
  prices,
  perEmployee,
  total,
  ctaHref,
}: PlanCardProps) {
  const t = useTranslations('landing.pricing');
  const copy = useModuleCopy();
  const set = (n: number) => onEmployeesChange(clampEmployees(n));
  const selected = new Set(selectedKeys);
  const lines = [
    { key: 'workspace', name: t('workspace.name'), price: workspacePrice(prices) },
    ...visibleModules(features)
      .filter((m) => selected.has(m.key))
      .map((m) => ({ key: m.key, name: copy(m).name, price: prices.get(m.key) ?? 0 })),
  ];

  return (
    <div
      className="flex flex-col gap-[18px] rounded-2xl border border-secondary/50 bg-background p-[22px] shadow-[0_20px_50px_-30px_hsl(var(--secondary)/.5)] min-[1000px]:sticky min-[1000px]:top-[84px]"
      data-testid="plan-summary"
    >
      <div className="flex items-center gap-2">
        <Check className="h-[18px] w-[18px] text-secondary" aria-hidden="true" />
        <h3 className="text-base font-bold">{t('builder.summary.title')}</h3>
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-3">
          <span className="flex flex-col">
            <span className="text-sm font-semibold">{t('builder.summary.teamSize')}</span>
            <span className="text-xs text-muted-foreground">{t('builder.summary.teamHint')}</span>
          </span>
          <span className="inline-flex items-center overflow-hidden rounded-lg border">
            <button
              type="button"
              aria-label={t('stepper.decrease')}
              disabled={employees <= MIN_EMPLOYEES}
              onClick={() => set(employees - EMPLOYEE_STEP)}
              className="flex h-[34px] w-8 items-center justify-center transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Minus className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <span
              className="min-w-11 border-x text-center text-[15px] font-bold leading-[34px] tabular-nums"
              data-testid="employee-count"
            >
              {employees}
            </span>
            <button
              type="button"
              aria-label={t('stepper.increase')}
              disabled={employees >= MAX_EMPLOYEES}
              onClick={() => set(employees + EMPLOYEE_STEP)}
              className="flex h-[34px] w-8 items-center justify-center transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </span>
        </div>
        <input
          type="range"
          min={MIN_EMPLOYEES}
          max={MAX_EMPLOYEES}
          step={EMPLOYEE_STEP}
          value={employees}
          onChange={(e) => set(Number(e.target.value))}
          aria-label={t('stepper.label')}
          className="w-full cursor-pointer"
        />
        <div className="flex gap-1.5">
          {PRESETS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => set(n)}
              aria-pressed={employees === n}
              className={cn(
                'h-7 flex-1 rounded-md border text-xs font-semibold transition-colors hover:border-foreground',
                employees === n ? 'border-primary bg-primary text-primary-foreground' : 'border-border',
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="h-px bg-border" />

      <div className="flex flex-col gap-2">
        <span className="text-xs text-muted-foreground">
          {t('builder.summary.planSummary', { modules: lines.length - 1, n: employees })}
        </span>
        {lines.map((ln) => (
          <div key={ln.key} className="flex items-center justify-between gap-3 text-[13px]" data-testid={`line-${ln.key}`}>
            <span className="truncate text-muted-foreground">{ln.name}</span>
            <span className="whitespace-nowrap font-medium tabular-nums">
              {formatGel(ln.price)} ₾ × {employees} = {formatGel(ln.price * employees)} ₾
            </span>
          </div>
        ))}
      </div>

      <div className="h-px bg-border" />

      <div className="flex items-end justify-between gap-3">
        <span className="flex flex-col">
          <span className="text-[13px] font-semibold">{t('builder.summary.total')}</span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {t('builder.summary.perEmployee', { price: formatGel(perEmployee) })}
          </span>
        </span>
        <span
          className="text-4xl font-extrabold leading-none tracking-[-.04em] text-secondary tabular-nums"
          data-testid="plan-total"
        >
          {formatGel(total)} <span className="text-2xl">₾</span>
        </span>
      </div>

      {employees >= CONTACT_US_FROM && (
        <p className="text-xs text-muted-foreground" data-testid="contact-us">
          {t.rich('builder.summary.contact', {
            email: (chunks) => (
              <a className="font-medium text-foreground underline-offset-4 hover:underline" href={`mailto:${CONTACT_EMAIL}`}>
                {chunks}
              </a>
            ),
          })}
        </p>
      )}

      <Link
        href={ctaHref}
        data-testid="plan-cta"
        className="flex h-[46px] items-center justify-center gap-2 rounded-[9px] bg-primary text-[15px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
      >
        {t('builder.summary.cta')}
        <ArrowRight className="h-[15px] w-[15px]" aria-hidden="true" />
      </Link>
      <p className="text-center text-xs text-muted-foreground">{t('builder.summary.note')}</p>
    </div>
  );
}
