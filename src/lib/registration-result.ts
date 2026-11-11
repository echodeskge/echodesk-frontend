/**
 * Hand-off from the signup form to `/registration/success`.
 *
 * `POST /api/register/` answers with the new tenant (`frontend_url`) and the
 * subscription (`trial_expires`). The flow stores what the success page
 * needs in sessionStorage — it lives only for this tab and never contains
 * the password.
 */

export const REGISTRATION_RESULT_KEY = 'echodesk.registration.result';

/** Length of the free trial `POST /api/register/` opens (days). */
export const TRIAL_DAYS = 30;

export interface RegistrationResult {
  company_name: string;
  admin_email: string;
  /** The tenant's own web address, e.g. `https://acme.echodesk.ge`. */
  frontend_url: string | null;
  /** ISO datetime when the trial ends. */
  trial_ends_at: string;
}

interface RegisterResponseLike {
  frontend_url?: string;
  tenant?: Record<string, unknown>;
  subscription?: Record<string, unknown>;
}

/** Trial end from the register response, or 30 days from now when missing. */
export function trialEndFromResponse(response: RegisterResponseLike | null | undefined, now = new Date()): string {
  const raw = response?.subscription?.trial_expires ?? response?.subscription?.expires_at;
  if (typeof raw === 'string' && !Number.isNaN(Date.parse(raw))) return new Date(raw).toISOString();
  return new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

export function saveRegistrationResult(result: RegistrationResult): void {
  try {
    window.sessionStorage.setItem(REGISTRATION_RESULT_KEY, JSON.stringify(result));
  } catch {
    // Private mode / blocked storage: the success page falls back to generic copy.
  }
}

export function readRegistrationResult(): RegistrationResult | null {
  try {
    const raw = window.sessionStorage.getItem(REGISTRATION_RESULT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RegistrationResult>;
    if (typeof parsed.trial_ends_at !== 'string') return null;
    return {
      company_name: typeof parsed.company_name === 'string' ? parsed.company_name : '',
      admin_email: typeof parsed.admin_email === 'string' ? parsed.admin_email : '',
      frontend_url: typeof parsed.frontend_url === 'string' ? parsed.frontend_url : null,
      trial_ends_at: parsed.trial_ends_at,
    };
  } catch {
    return null;
  }
}

/** Long date in the UI locale, e.g. "11 December 2026" / "11 დეკემბერი, 2026". */
export function formatTrialDate(value: string | Date, locale: string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale === 'ka' ? 'ka-GE' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}
