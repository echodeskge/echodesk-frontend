'use client';

import { useTranslations } from 'next-intl';
import { Check, Minus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { Feature } from '@/types/package';
import { EVERYTHING_SLUG, PACKS, type PackSlug } from '@/data/packs';
import { formatGel, packModuleKeys, perEmployeePrice, priceByKey, visibleModules } from '@/lib/pricing';
import { useModuleCopy } from './use-module-copy';

interface ModuleTableProps {
  features: readonly Feature[];
}

/**
 * Module × pack comparison: what each module does in one line, its price
 * per employee and which packs include it. A real `<table>` from `md` up;
 * one tab per pack below `md` so nothing scrolls horizontally at 390 px.
 */
export function ModuleTable({ features }: ModuleTableProps) {
  const t = useTranslations('landing.pricing');
  const copy = useModuleCopy();
  const prices = priceByKey(features);
  const modules = visibleModules(features);
  const slugs: PackSlug[] = [...PACKS.map((p) => p.slug), EVERYTHING_SLUG];
  const packKeys = new Map(slugs.map((s) => [s, new Set(packModuleKeys(s, features))]));
  const packTotal = (s: PackSlug) => perEmployeePrice([...(packKeys.get(s) ?? [])], prices);

  if (modules.length === 0) return null;

  return (
    <div className="space-y-4" data-testid="module-table">
      <div className="space-y-2 text-center">
        <h3 className="text-2xl font-bold">{t('table.title')}</h3>
        <p className="text-sm text-muted-foreground">{t('table.footnote')}</p>
      </div>

      {/* ≥ md: table */}
      <Card className="hidden overflow-hidden md:block">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3 text-left font-semibold">
                {t('table.module')}
              </th>
              <th scope="col" className="px-3 py-3 text-right font-semibold whitespace-nowrap">
                {t('table.price')}
              </th>
              {slugs.map((s) => (
                <th key={s} scope="col" className="px-3 py-3 text-center font-semibold">
                  {t(`packs.${s}.name`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-t text-muted-foreground">
              <td className="px-4 py-3">
                <div className="font-medium text-foreground">{t('workspace.name')}</div>
                <div className="text-xs">{t('workspace.included')}</div>
              </td>
              <td className="px-3 py-3 text-right tabular-nums whitespace-nowrap">
                {formatGel(perEmployeePrice([], prices))} ₾
              </td>
              {slugs.map((s) => (
                <td key={s} className="px-3 py-3 text-center">
                  <Included included />
                </td>
              ))}
            </tr>
            {modules.map((m) => {
              const c = copy(m);
              return (
                <tr key={m.key} className="border-t" data-testid={`table-row-${m.key}`}>
                  <td className="px-4 py-3">
                    <div className="font-medium">{c.name}</div>
                    {c.desc && <div className="text-xs text-muted-foreground">{c.desc}</div>}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums whitespace-nowrap">
                    {formatGel(prices.get(m.key) ?? 0)} ₾
                  </td>
                  {slugs.map((s) => (
                    <td key={s} className="px-3 py-3 text-center">
                      <Included included={packKeys.get(s)?.has(m.key) ?? false} />
                    </td>
                  ))}
                </tr>
              );
            })}
            <tr className="border-t bg-muted/30 font-semibold">
              <td className="px-4 py-3">{t('table.total')}</td>
              <td className="px-3 py-3" />
              {slugs.map((s) => (
                <td key={s} className="px-3 py-3 text-center tabular-nums whitespace-nowrap" data-testid={`table-total-${s}`}>
                  {formatGel(packTotal(s))} ₾
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </Card>

      {/* < md: one tab per pack */}
      <Tabs defaultValue={PACKS.find((p) => p.highlight)?.slug ?? slugs[0]} className="md:hidden">
        <TabsList className="grid w-full grid-cols-2 h-auto">
          {slugs.map((s) => (
            <TabsTrigger key={s} value={s} className="whitespace-normal text-xs leading-tight py-1.5">
              {t(`packs.${s}.name`)}
            </TabsTrigger>
          ))}
        </TabsList>
        {slugs.map((s) => (
          <TabsContent key={s} value={s}>
            <Card className="divide-y">
              <Row name={t('workspace.name')} desc={t('workspace.included')} price={perEmployeePrice([], prices)} included />
              {modules.map((m) => {
                const c = copy(m);
                return (
                  <Row
                    key={m.key}
                    name={c.name}
                    desc={c.desc}
                    price={prices.get(m.key) ?? 0}
                    included={packKeys.get(s)?.has(m.key) ?? false}
                  />
                );
              })}
              <div className="flex items-center justify-between gap-3 px-4 py-3 font-semibold">
                <span className="min-w-0">{t('table.total')}</span>
                <span className="tabular-nums whitespace-nowrap">{formatGel(packTotal(s))} ₾</span>
              </div>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function Included({ included }: { included: boolean }) {
  const t = useTranslations('landing.pricing.table');
  return included ? (
    <Check className="mx-auto h-4 w-4 text-success" aria-label={t('included')} />
  ) : (
    <Minus className="mx-auto h-4 w-4 text-muted-foreground/50" aria-label={t('notIncluded')} />
  );
}

function Row({
  name,
  desc,
  price,
  included,
}: {
  name: string;
  desc?: string;
  price: number;
  included: boolean;
}) {
  return (
    <div className={cn('flex items-start gap-3 px-4 py-3', !included && 'text-muted-foreground')}>
      <Included included={included} />
      <div className="min-w-0 flex-1">
        <div className={cn('text-sm font-medium', included && 'text-foreground')}>{name}</div>
        {desc && <div className="text-xs text-muted-foreground">{desc}</div>}
      </div>
      <div className="ml-auto whitespace-nowrap text-sm tabular-nums">{formatGel(price)} ₾</div>
    </div>
  );
}
