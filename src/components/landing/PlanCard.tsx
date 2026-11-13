'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowRight, Check } from 'lucide-react';
import type { Feature } from '@/types/package';
import { formatGel, visibleModules, workspacePrice } from '@/lib/pricing';
import { EmployeeCount } from '@/components/pricing/EmployeeCount';
import { useModuleCopy } from '@/components/pricing/use-module-copy';

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
 * Sticky "Your plan" card: the shared employee-count control (any whole
 * number from 1), one `price × n = total` line per selected module (and the
 * workspace), the monthly total and the registration CTA.
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
        <div className="flex flex-col">
          <label htmlFor="plan-employees" className="text-sm font-semibold">
            {t('builder.summary.teamSize')}
          </label>
          <span className="text-xs text-muted-foreground">{t('builder.summary.teamHint')}</span>
        </div>
        <EmployeeCount id="plan-employees" value={employees} onChange={onEmployeesChange} />
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
