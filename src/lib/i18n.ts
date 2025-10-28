export type Locale = 'en' | 'ka';

export const locales: Locale[] = ['ka', 'en'];
export const defaultLocale: Locale = 'ka';

export const localeNames: Record<Locale, string> = {
  en: 'English',
  ka: 'ქართული',
};
