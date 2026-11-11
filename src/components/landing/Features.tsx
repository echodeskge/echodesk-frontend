'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowUpRight, Check, Users, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Feature } from '@/types/package';
import { MODULE_CATALOG } from '@/data/module-catalog';
import { formatGel, priceByKey, visibleModules, workspacePrice } from '@/lib/pricing';
import { useModuleCopy } from '@/components/pricing/use-module-copy';
import { CONTAINER, SectionHeading } from './SectionHeading';
import { requestModule } from './select-module';

const INBOX_KEY = 'social_integrations';

/**
 * Bordered 3×3 grid: the eight sellable modules from the live catalogue
 * (names, taglines and bullets shared with the pricing section through
 * `useModuleCopy`) plus the Workspace card that every pack includes.
 * A module card links to `#pricing` and preselects itself in the builder.
 */
export function Features({ features }: { features: readonly Feature[] }) {
  const t = useTranslations('landing.features');
  const tp = useTranslations('landing.pricing');
  const copy = useModuleCopy();
  const prices = priceByKey(features);
  const modules = visibleModules(features);
  const workspaceBullets = splitBullets(tp('workspace.bullets'));
  const inboxChannels = splitBullets(t('inboxChannels'));

  return (
    <section id="features" className={cn(CONTAINER, 'flex scroll-mt-[72px] flex-col gap-10 pb-[72px] pt-12')}>
      <SectionHeading eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')} />

      <div
        className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border bg-border sm:grid-cols-2 lg:grid-cols-3"
        data-testid="feature-grid"
      >
        {modules.map((m) => {
          const c = copy(m);
          const price = prices.get(m.key) ?? 0;
          const isInbox = m.key === INBOX_KEY;
          return (
            <FeatureCard
              key={m.key}
              testId={`feature-${m.key}`}
              icon={MODULE_CATALOG[m.key]?.icon}
              title={c.name}
              desc={c.desc}
              bullets={isInbox ? [] : c.bullets}
              href="#pricing"
              onClick={() => requestModule(m.key)}
              footer={
                <>
                  <span className="font-semibold tabular-nums text-foreground">
                    {formatGel(price)} ₾{' '}
                    <span className="font-normal text-muted-foreground">{tp('perEmployeeMonth')}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-secondary">
                    {t('addToPlan')}
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                </>
              }
            >
              {isInbox && (
                <div className="flex flex-col gap-2" data-testid="inbox-channels">
                  <ul className="flex flex-wrap gap-1.5">
                    {inboxChannels.map((ch) => (
                      <li
                        key={ch}
                        className="inline-flex h-6 items-center rounded-md border bg-muted/40 px-2 text-xs font-medium"
                      >
                        {ch}
                      </li>
                    ))}
                  </ul>
                  <span className="text-xs text-muted-foreground">{t('inboxNote')}</span>
                </div>
              )}
            </FeatureCard>
          );
        })}

        <FeatureCard
          testId="feature-workspace"
          icon={Users}
          title={tp('workspace.name')}
          desc={t('workspaceTag')}
          bullets={workspaceBullets}
          className="sm:col-span-2 lg:col-span-1"
          footer={
            <span className="font-semibold text-foreground">
              {formatGel(workspacePrice(prices))} ₾{' '}
              <span className="font-normal text-muted-foreground">{tp('perEmployeeMonth')}</span>
              <span className="ml-2 rounded bg-secondary/10 px-1.5 py-0.5 text-[11px] font-semibold text-secondary">
                {tp('table.included')}
              </span>
            </span>
          }
        />
      </div>
    </section>
  );
}

function splitBullets(joined: string): string[] {
  return joined
    .split('·')
    .map((s) => s.trim())
    .filter(Boolean);
}

interface FeatureCardProps {
  testId: string;
  icon?: LucideIcon;
  title: string;
  desc: string;
  bullets: string[];
  href?: string;
  onClick?: () => void;
  footer?: ReactNode;
  children?: ReactNode;
  className?: string;
}

function FeatureCard({ testId, icon: Icon, title, desc, bullets, href, onClick, footer, children, className }: FeatureCardProps) {
  const body = (
    <>
      <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-secondary/10 text-secondary">
        {Icon && <Icon className="h-[19px] w-[19px]" aria-hidden="true" />}
      </span>
      <span className="flex flex-col gap-1.5">
        <span className="flex items-center gap-1.5 text-base font-bold tracking-[-.01em]">
          {title}
          {href && <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />}
        </span>
        <span className="text-sm leading-[21px] text-muted-foreground">{desc}</span>
      </span>
      {children}
      {bullets.length > 0 && (
        <ul className="flex flex-col gap-1 text-[13px] leading-[19px]">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-2">
              <Check className="mt-[3px] h-3.5 w-3.5 shrink-0 text-green" aria-hidden="true" />
              <span className="min-w-0">{b}</span>
            </li>
          ))}
        </ul>
      )}
      {footer && <span className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1 text-[13px]">{footer}</span>}
    </>
  );
  const cls = cn('flex flex-col gap-3.5 bg-background px-6 py-[26px] transition-colors', className);
  if (href) {
    return (
      <a href={href} onClick={onClick} className={cn(cls, 'hover:bg-muted/50')} data-testid={testId}>
        {body}
      </a>
    );
  }
  return (
    <div className={cls} data-testid={testId}>
      {body}
    </div>
  );
}
