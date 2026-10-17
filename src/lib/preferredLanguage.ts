import axios from '@/api/axios';

/** A user's notification language; null = follow the tenant language. */
export type PreferredLanguage = 'en' | 'ka' | null;

export const PREFERRED_LANGUAGES: Exclude<PreferredLanguage, null>[] = ['en', 'ka'];

const AUTH_TOKEN_KEY = 'echodesk_auth_token';

/** Whether a user is signed in (an auth token is stored). */
function hasAuthToken(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return !!window.localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return false;
  }
}

/**
 * Store the signed-in user's notification language (User.preferred_language)
 * via PATCH /api/auth/profile/update/.
 *
 * Best effort: never throws and is meant to be fired without awaiting, so a
 * failure can never block the UI language switch. Does nothing when no user is
 * signed in or the locale is not a supported notification language.
 * Returns whether the update was saved.
 */
export async function syncPreferredLanguage(locale: string): Promise<boolean> {
  if (!PREFERRED_LANGUAGES.includes(locale as 'en' | 'ka')) return false;
  if (!hasAuthToken()) return false;
  try {
    await axios.patch('/api/auth/profile/update/', { preferred_language: locale });
    return true;
  } catch {
    return false;
  }
}
