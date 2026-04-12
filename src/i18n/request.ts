import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

const SUPPORTED_LOCALES = ['ka', 'en'] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
const DEFAULT_LOCALE: SupportedLocale = 'ka';

function normalizeLocale(locale?: string): SupportedLocale {
  if (!locale) return DEFAULT_LOCALE;
  return (SUPPORTED_LOCALES as readonly string[]).includes(locale)
    ? (locale as SupportedLocale)
    : DEFAULT_LOCALE;
}

export default getRequestConfig(async () => {
  // Get locale from cookie and safely fall back to Georgian for unsupported locales
  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get('NEXT_LOCALE')?.value);

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
