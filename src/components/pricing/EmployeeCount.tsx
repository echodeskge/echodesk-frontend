'use client';

import { useEffect, useId, useState, type KeyboardEvent } from 'react';
import { useTranslations } from 'next-intl';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EMPLOYEE_STEP, MIN_EMPLOYEES, clampEmployees } from '@/lib/pricing';

/** Quick shortcuts — a convenience, never a limit. */
export const EMPLOYEE_CHIPS = [1, 3, 5, 10, 20] as const;

export interface EmployeeCountProps {
  value: number;
  onChange: (value: number) => void;
  /** `md` = compact row (plan card, settings); `lg` = big centred figure (signup step 1). */
  size?: 'md' | 'lg';
  /** Show the 1 · 3 · 5 · 10 · 20 shortcuts (default: true). */
  chips?: boolean;
  /** Show the "from 1 employee · change any time" hint (default: true). */
  hint?: boolean;
  disabled?: boolean;
  id?: string;
  className?: string;
}

/**
 * The one employee-count control of the product: − / + by one, an editable
 * integer input (min 1, no max) and optional quick chips. Every path goes
 * through `clampEmployees`, so the parent always receives a whole number ≥ 1.
 * The input keeps a local draft while typing so the field can be emptied;
 * it commits on every valid keystroke, on Enter and on blur.
 */
export function EmployeeCount({
  value,
  onChange,
  size = 'md',
  chips = true,
  hint = true,
  disabled = false,
  id,
  className,
}: EmployeeCountProps) {
  const t = useTranslations('landing.pricing.stepper');
  const autoId = useId();
  const inputId = id ?? `employees-${autoId}`;
  const [draft, setDraft] = useState(String(value));

  // Follow external changes (chips, URL prefill, a saved count).
  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = (n: number) => onChange(clampEmployees(n));

  const onInput = (raw: string) => {
    setDraft(raw);
    if (/^\d+$/.test(raw.trim()) && Number(raw) >= MIN_EMPLOYEES) commit(Number(raw));
  };

  const onBlur = () => {
    const n = clampEmployees(Number(draft));
    setDraft(String(n));
    if (n !== value) onChange(n);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onBlur();
    }
  };

  const large = size === 'lg';
  const buttonClass = cn(
    'flex shrink-0 items-center justify-center transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40',
    large ? 'h-12 w-12 rounded-xl border' : 'h-9 w-9',
  );

  return (
    <div
      className={cn('flex flex-col gap-3', large && 'items-center text-center', className)}
      data-testid="employee-count-control"
    >
      <div
        className={cn(
          'flex items-center',
          large ? 'justify-center gap-3' : 'w-fit gap-0 overflow-hidden rounded-lg border bg-background',
        )}
      >
        <button
          type="button"
          aria-label={t('decrease')}
          disabled={disabled || value <= MIN_EMPLOYEES}
          onClick={() => commit(value - EMPLOYEE_STEP)}
          className={buttonClass}
        >
          <Minus className={large ? 'h-5 w-5' : 'h-3.5 w-3.5'} aria-hidden="true" />
        </button>
        <input
          id={inputId}
          type="number"
          inputMode="numeric"
          min={MIN_EMPLOYEES}
          step={EMPLOYEE_STEP}
          value={draft}
          disabled={disabled}
          onChange={(e) => onInput(e.target.value)}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          aria-label={t('label')}
          data-testid="employee-count"
          className={cn(
            'min-w-0 bg-transparent text-center font-bold tabular-nums outline-none [appearance:textfield] focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
            large
              ? 'h-16 w-32 rounded-xl border text-5xl leading-none'
              : 'h-9 w-[4.5rem] border-x text-base leading-9',
          )}
        />
        <button
          type="button"
          aria-label={t('increase')}
          disabled={disabled}
          onClick={() => commit(value + EMPLOYEE_STEP)}
          className={buttonClass}
        >
          <Plus className={large ? 'h-5 w-5' : 'h-3.5 w-3.5'} aria-hidden="true" />
        </button>
      </div>

      {chips && (
        <div
          className={cn('flex flex-wrap items-center gap-1.5', large && 'justify-center')}
          role="group"
          aria-label={t('quick')}
        >
          <span className="mr-0.5 text-xs text-muted-foreground" aria-hidden="true">
            {t('quick')}:
          </span>
          {EMPLOYEE_CHIPS.map((n) => (
            <button
              key={n}
              type="button"
              disabled={disabled}
              onClick={() => commit(n)}
              aria-pressed={value === n}
              data-testid={`employee-chip-${n}`}
              className={cn(
                'h-7 min-w-8 flex-none rounded-full border px-2.5 text-xs font-semibold transition-colors hover:border-foreground disabled:cursor-not-allowed disabled:opacity-40',
                value === n ? 'border-primary bg-primary text-primary-foreground' : 'border-border',
              )}
            >
              {n}
            </button>
          ))}
        </div>
      )}

      {hint && (
        <p className="text-xs text-muted-foreground" data-testid="employee-count-hint">
          {t('hint')}
        </p>
      )}
    </div>
  );
}
