'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowRight, Check, Info, Lock, Sparkles, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type { Feature } from '@/types/package';
import { MODULE_CATALOG } from '@/data/module-catalog';
import { CONTACT_US_FROM, formatGel, monthlyTotal, perEmployeePrice, visibleModules } from '@/lib/pricing';
import { useModuleCopy } from './use-module-copy';

const CONTACT_EMAIL = 'info@echodesk.ge';

export interface PlanBuilderProps {
  features: readonly Feature[];
  employees: number;
  selectedKeys: readonly string[];
  prices: ReadonlyMap<string, number>;
  onToggle: (key: string) => void;
  /** Key that was auto-enabled by a `requires` rule (shows the AI notice). */
  autoNotice?: string | null;
  /** Primary CTA: a link (landing) or a button handler (registration). */
  ctaHref?: string;
  onCta?: () => void;
  ctaLabel: string;
  /** Optional slot rendered above the summary total (e.g. the trial line). */
  summaryExtra?: ReactNode;
  /** Switch ids must be unique when two builders are on one page. */
  idPrefix?: string;
}

/**
 * "Build your own": workspace strip + one card per sellable module with a
 * switch, and a sticky summary. Pure presentation — the parent owns state
 * through `usePlanSelection`.
 */
export function PlanBuilder({
  features,
  employees,
  selectedKeys,
  prices,
  onToggle,
  autoNotice,
  ctaHref,
  onCta,
  ctaLabel,
  summaryExtra,
  idPrefix = 'module',
}: PlanBuilderProps) {
  const t = useTranslations('landing.pricing');
  const copy = useModuleCopy();
  const modules = visibleModules(features);
  const byKey = new Map(features.map((f) => [f.key, f]));
  const selected = new Set(selectedKeys);
  const workspace = perEmployeePrice([], prices);
  const perEmployee = perEmployeePrice(selectedKeys, prices);
  const total = monthlyTotal(selectedKeys, prices, employees);

  const noticeName = autoNotice && byKey.get(autoNotice) ? copy(byKey.get(autoNotice)!).name : null;

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3" data-testid="plan-builder">
      <div className="space-y-4 lg:col-span-2">
        {/* Workspace strip — always included, never a toggle */}
        <div className="flex items-start gap-3 rounded-lg border border-dashed bg-muted/30 p-4">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <span className="font-semibold">
                {t('workspace.name')}{' '}
                <span className="font-normal text-muted-foreground">— {t('workspace.included')}</span>
              </span>
              <span className="ml-auto whitespace-nowrap font-semibold tabular-nums">
                {formatGel(workspace)} ₾{' '}
                <span className="text-xs font-normal text-muted-foreground">{t('perEmployeeMonth')}</span>
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{t('workspace.bullets')}</p>
          </div>
        </div>

        {noticeName && (
          <div className="flex items-start gap-2 rounded-lg border border-secondary/30 bg-secondary/5 p-3 text-sm" role="status">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
            <span>{t('builder.aiNotice', { module: noticeName })}</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {modules.map((m) => {
            const c = copy(m);
            const meta = MODULE_CATALOG[m.key];
            const price = prices.get(m.key) ?? 0;
            const on = selected.has(m.key);
            const requires = (meta?.requires ?? []).filter((k) => byKey.has(k));
            return (
              <ModuleCard
                key={m.key}
                id={`${idPrefix}-${m.key}`}
                featureKey={m.key}
                icon={meta?.icon}
                name={c.name}
                desc={c.desc}
                bullets={c.bullets}
                price={price}
                employees={employees}
                checked={on}
                onToggle={() => onToggle(m.key)}
                requiresLabel={
                  requires.length > 0
                    ? t('builder.requires', { module: copy(byKey.get(requires[0])!).name })
                    : null
                }
              />
            );
          })}
        </div>
      </div>

      <div className="lg:col-span-1">
        <Card className="lg:sticky lg:top-4 border-primary/30 bg-primary/5" data-testid="plan-summary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-secondary" />
              {t('builder.summary.title')}
            </CardTitle>
            <CardDescription>{t('builder.summary.description', { n: employees })}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2 text-sm">
              <SummaryLine name={t('workspace.name')} price={workspace} employees={employees} />
              {modules
                .filter((m) => selected.has(m.key))
                .map((m) => (
                  <SummaryLine key={m.key} name={copy(m).name} price={prices.get(m.key) ?? 0} employees={employees} />
                ))}
            </div>
            <Separator />
            <div className="flex items-end justify-between gap-3">
              <span className="font-semibold">{t('builder.summary.total')}</span>
              <div className="text-right">
                <div className="text-4xl font-bold tabular-nums leading-none" data-testid="plan-total">
                  {formatGel(total)} ₾
                </div>
                <div className="mt-1 text-xs text-muted-foreground tabular-nums">
                  {t('builder.summary.perEmployee', { price: formatGel(perEmployee) })}
                </div>
              </div>
            </div>
            {employees >= CONTACT_US_FROM && (
              <p className="text-sm text-muted-foreground" data-testid="contact-us">
                {t.rich('builder.summary.contact', {
                  email: (chunks) => (
                    <a className="font-medium text-foreground underline-offset-4 hover:underline" href={`mailto:${CONTACT_EMAIL}`}>
                      {chunks}
                    </a>
                  ),
                })}
              </p>
            )}
            {summaryExtra}
          </CardContent>
          <CardFooter className="flex-col gap-3">
            {ctaHref ? (
              <Button size="lg" className="w-full" asChild>
                <Link href={ctaHref} data-testid="plan-cta">
                  {ctaLabel}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <Button size="lg" className="w-full" type="button" onClick={onCta} data-testid="plan-cta">
                {ctaLabel}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
            <p className="text-xs text-muted-foreground">{t('builder.summary.note')}</p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

function SummaryLine({ name, price, employees }: { name: string; price: number; employees: number }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="min-w-0 truncate text-muted-foreground">{name}</span>
      <span className="whitespace-nowrap tabular-nums">
        {formatGel(price)} ₾ × {employees}
      </span>
    </div>
  );
}

interface ModuleCardProps {
  id: string;
  featureKey: string;
  icon?: LucideIcon;
  name: string;
  desc: string;
  bullets: string[];
  price: number;
  employees: number;
  checked: boolean;
  onToggle: () => void;
  requiresLabel: string | null;
}

function ModuleCard({
  id,
  featureKey,
  icon: Icon,
  name,
  desc,
  bullets,
  price,
  employees,
  checked,
  onToggle,
  requiresLabel,
}: ModuleCardProps) {
  const t = useTranslations('landing.pricing');
  return (
    <div
      data-testid={`module-${featureKey}`}
      className={cn(
        'flex min-w-0 cursor-pointer gap-3 rounded-lg border p-4 transition-colors',
        checked ? 'border-primary bg-background shadow-sm' : 'border-border hover:border-primary/40',
      )}
      onClick={(e) => {
        // The switch handles its own click; the rest of the card is a big target.
        if ((e.target as HTMLElement).closest('[data-slot="switch"]')) return;
        onToggle();
      }}
    >
      <Switch id={id} checked={checked} onCheckedChange={onToggle} aria-label={name} className="mt-1 shrink-0" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
          <label htmlFor={id} className="flex min-w-0 cursor-pointer items-center gap-2 font-semibold">
            {Icon && <Icon className="h-4 w-4 shrink-0 text-secondary" />}
            <span className="min-w-0">{name}</span>
          </label>
          <span className="ml-auto whitespace-nowrap font-semibold tabular-nums">
            {formatGel(price)} ₾{' '}
            <span className="text-xs font-normal text-muted-foreground">{t('perEmployeeMonth')}</span>
          </span>
        </div>
        {desc && <p className="text-sm text-muted-foreground">{desc}</p>}
        {bullets.length > 0 && (
          <ul className="space-y-0.5 text-xs text-muted-foreground">
            {bullets.map((b) => (
              <li key={b} className="flex items-start gap-1.5">
                <Check className="mt-0.5 h-3 w-3 shrink-0 text-success" />
                <span className="min-w-0">{b}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 pt-1 text-xs">
          {requiresLabel ? <span className="text-muted-foreground italic">{requiresLabel}</span> : <span />}
          {checked && (
            <span className="ml-auto whitespace-nowrap font-medium tabular-nums">
              = {formatGel(price * employees)} ₾ {t('perMonth')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
