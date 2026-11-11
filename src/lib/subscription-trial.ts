/**
 * Trial fields of `GET /api/subscription/me/`, typed locally until the
 * generated client is regenerated: `is_trial`, `trial_ends_at`,
 * `trial_days_remaining`, `has_saved_card`. Each is read from the top level
 * first and then from the nested `subscription` object, so both the current
 * and the upcoming payload shapes work.
 */

export interface TrialStatus {
  isTrial: boolean;
  /** ISO datetime, null when the API did not send one. */
  trialEndsAt: string | null;
  /** Whole days left (never negative); null when unknown. */
  daysRemaining: number | null;
  /** `true` / `false` from the API; null when the field is absent. */
  hasSavedCard: boolean | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

type Dict = Record<string, unknown>;

function asDict(value: unknown): Dict | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Dict) : null;
}

function pick(data: Dict | null, key: string): unknown {
  if (!data) return undefined;
  if (data[key] !== undefined) return data[key];
  const nested = asDict(data.subscription);
  return nested ? nested[key] : undefined;
}

export function readTrialStatus(data: unknown, now: Date = new Date()): TrialStatus {
  const dict = asDict(data);
  const isTrial = pick(dict, 'is_trial') === true;

  const rawEnd = pick(dict, 'trial_ends_at');
  const trialEndsAt = typeof rawEnd === 'string' && !Number.isNaN(Date.parse(rawEnd)) ? rawEnd : null;

  const rawDays = pick(dict, 'trial_days_remaining');
  let daysRemaining: number | null = null;
  if (typeof rawDays === 'number' && Number.isFinite(rawDays)) {
    daysRemaining = Math.max(0, Math.floor(rawDays));
  } else if (trialEndsAt) {
    daysRemaining = Math.max(0, Math.ceil((Date.parse(trialEndsAt) - now.getTime()) / DAY_MS));
  }

  const rawCard = pick(dict, 'has_saved_card');
  const hasSavedCard = typeof rawCard === 'boolean' ? rawCard : null;

  return { isTrial, trialEndsAt, daysRemaining, hasSavedCard };
}

/** The in-app "add a card" prompt: on trial and the API says no card is saved. */
export function needsCardPrompt(status: TrialStatus): boolean {
  return status.isTrial && status.hasSavedCard === false;
}
