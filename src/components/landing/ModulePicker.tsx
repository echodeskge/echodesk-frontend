'use client';

import { useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Feature } from '@/types/package';
import { MODULE_CATALOG } from '@/data/module-catalog';
import { formatGel, visibleModules, workspacePrice } from '@/lib/pricing';
import { useModuleCopy } from '@/components/pricing/use-module-copy';

const WORKSPACE_ROW = 'workspace';

interface ModulePickerProps {
  features: readonly Feature[];
  selectedKeys: readonly string[];
  prices: ReadonlyMap<string, number>;
  onToggle: (key: string) => void;
  onToggleAll: () => void;
  allOn: boolean;
  /** Key that was auto-enabled by a `requires` rule (shows the AI notice). */
  autoNotice?: string | null;
}

/**
 * "Select your modules" list (design: grouped rows with a switch, an inline
 * 20 px (i) button after the name that opens the module's bullets, and the
 * price on the right). The Workspace row is always on and shows "Included".
 * Pure presentation — the parent owns the selection.
 */
export function ModulePicker({ features, selectedKeys, prices, onToggle, onToggleAll, allOn, autoNotice }: ModulePickerProps) {
  const t = useTranslations('landing.pricing');
  const copy = useModuleCopy();
  const [infoOpen, setInfoOpen] = useState<string | null>(null);
  const modules = visibleModules(features);
  const byKey = new Map(features.map((f) => [f.key, f]));
  const selected = new Set(selectedKeys);
  const selectedCount = modules.filter((m) => selected.has(m.key)).length;
  const workspaceBullets = splitBullets(t('workspace.bullets'));
  const noticeName = autoNotice && byKey.get(autoNotice) ? copy(byKey.get(autoNotice)!).name : null;
  const toggleInfo = (key: string) => setInfoOpen((open) => (open === key ? null : key));

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border bg-background" data-testid="plan-builder">
      <div className="flex items-center justify-between gap-3 border-b px-[22px] py-[18px]">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-base font-bold">{t('builder.selectTitle')}</h3>
          <p className="text-[13px] text-muted-foreground">{t('builder.selectSubtitle')}</p>
        </div>
        <button
          type="button"
          onClick={onToggleAll}
          className="h-[30px] whitespace-nowrap rounded-[7px] border px-2.5 text-xs font-semibold transition-colors hover:bg-accent"
        >
          {allOn ? t('builder.clearOptional') : t('builder.selectAll')}
        </button>
      </div>

      {noticeName && (
        <div className="flex items-start gap-2 border-b bg-secondary/5 px-[22px] py-3 text-[13px]" role="status">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-secondary" aria-hidden="true" />
          <span>{t('builder.aiNotice', { module: noticeName })}</span>
        </div>
      )}

      <GroupHeader name={t('workspace.name')} meta={t('workspace.included')} />
      <Row
        testId={`module-${WORKSPACE_ROW}`}
        name={t('workspace.name')}
        desc={workspaceBullets.slice(0, 3).join(' · ')}
        badge={t('builder.alwaysOn')}
        checked
        locked
        infoOpen={infoOpen === WORKSPACE_ROW}
        onInfo={() => toggleInfo(WORKSPACE_ROW)}
        price={
          <>
            <span className="text-sm font-bold text-muted-foreground">{t('table.included')}</span>
            <span className="hidden text-[11px] text-muted-foreground tabular-nums min-[640px]:inline">
              {formatGel(workspacePrice(prices))} ₾ {t('perEmployeeMonth')}
            </span>
          </>
        }
      />
      {infoOpen === WORKSPACE_ROW && (
        <InfoPanel id={`module-${WORKSPACE_ROW}-info`} title={t('builder.info')} bullets={workspaceBullets} />
      )}

      <GroupHeader
        name={t('builder.groupModules')}
        meta={`· ${t('builder.selectedMeta', { n: selectedCount, total: modules.length })}`}
      />
      {modules.map((m) => {
        const c = copy(m);
        const meta = MODULE_CATALOG[m.key];
        const requires = (meta?.requires ?? []).filter((k) => byKey.has(k));
        const on = selected.has(m.key);
        return (
          <div key={m.key} className="contents">
            <Row
              testId={`module-${m.key}`}
              name={c.name}
              desc={c.desc}
              badge={requires.length > 0 ? t('builder.requires', { module: copy(byKey.get(requires[0])!).name }) : null}
              checked={on}
              onToggle={() => onToggle(m.key)}
              infoOpen={infoOpen === m.key}
              onInfo={() => toggleInfo(m.key)}
              price={
                <>
                  <span className="text-sm font-bold tabular-nums">{formatGel(prices.get(m.key) ?? 0)} ₾</span>
                  {/* Below 640 px the per-month label would squeeze the name column. */}
                  <span className="hidden text-[11px] text-muted-foreground min-[640px]:inline">{t('perEmployeeMonth')}</span>
                </>
              }
            />
            {infoOpen === m.key && <InfoPanel id={`module-${m.key}-info`} title={t('builder.info')} bullets={c.bullets} />}
          </div>
        );
      })}
    </div>
  );
}

function splitBullets(joined: string): string[] {
  return joined
    .split('·')
    .map((s) => s.trim())
    .filter(Boolean);
}

function GroupHeader({ name, meta }: { name: string; meta: string }) {
  return (
    <div className="flex items-center gap-2.5 border-b bg-muted/50 px-[22px] py-2.5 text-[11px] font-bold uppercase tracking-[.08em] text-muted-foreground">
      {name}
      <span className="font-medium normal-case tracking-normal">{meta}</span>
    </div>
  );
}

interface RowProps {
  testId: string;
  name: string;
  desc: string;
  badge: string | null;
  checked: boolean;
  locked?: boolean;
  onToggle?: () => void;
  infoOpen: boolean;
  onInfo: () => void;
  price: ReactNode;
}

function Row({ testId, name, desc, badge, checked, locked, onToggle, infoOpen, onInfo, price }: RowProps) {
  const t = useTranslations('landing.pricing');
  const infoId = `${testId}-info`;
  return (
    <div
      data-testid={testId}
      className={cn(
        'flex items-center gap-3.5 border-b px-[22px] py-3.5 transition-colors',
        checked && !locked && 'bg-secondary/[.04]',
        locked ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-muted/60',
      )}
      onClick={(e) => {
        if (locked) return;
        if ((e.target as HTMLElement).closest('button')) return;
        onToggle?.();
      }}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={name}
        aria-disabled={locked || undefined}
        disabled={locked}
        onClick={onToggle}
        className={cn(
          'flex h-[22px] w-9 shrink-0 items-center rounded-full p-0.5 transition-colors',
          checked ? 'bg-primary' : 'bg-border',
          locked && 'opacity-75',
        )}
      >
        <span
          className={cn(
            'block h-[18px] w-[18px] rounded-full bg-background shadow-[0_1px_2px_rgb(0_0_0/.25)] ring-1 ring-black/10 transition-transform dark:ring-white/20',
            checked && 'translate-x-3.5',
          )}
        />
      </button>

      <span className="flex min-w-0 flex-1 flex-col gap-px">
        <span className="flex flex-wrap items-center gap-2 text-sm font-semibold leading-5">
          <span className="inline-flex items-center gap-1.5">
            {name}
            <button
              type="button"
              onClick={onInfo}
              aria-label={t('builder.info')}
              aria-expanded={infoOpen}
              aria-controls={infoId}
              title={t('builder.info')}
              className={cn(
                'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-accent hover:text-foreground',
                infoOpen ? 'bg-secondary/10 text-secondary' : 'text-muted-foreground',
              )}
            >
              <Info className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </span>
          {badge && (
            <span className="h-[18px] whitespace-nowrap rounded bg-secondary/10 px-1.5 text-[11px] font-semibold leading-[18px] text-secondary">
              {badge}
            </span>
          )}
        </span>
        <span className="text-[13px] text-muted-foreground">{desc}</span>
      </span>

      <span className="flex shrink-0 flex-col items-end text-right">{price}</span>
    </div>
  );
}

function InfoPanel({ id, title, bullets }: { id: string; title: string; bullets: string[] }) {
  return (
    <div
      id={id}
      className="flex flex-col gap-2.5 border-b bg-secondary/[.04] py-3.5 pl-[22px] pr-[22px] min-[640px]:pl-[72px]"
      data-testid={id}
    >
      <span className="text-xs font-bold uppercase tracking-[.06em] text-secondary">{title}</span>
      <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-x-5 gap-y-1.5">
        {bullets.map((b) => (
          <li key={b} className="flex items-start gap-2 text-[13px] leading-[19px]">
            <Check className="mt-[3px] h-3.5 w-3.5 shrink-0 text-green" aria-hidden="true" />
            {b}
          </li>
        ))}
      </ul>
    </div>
  );
}
