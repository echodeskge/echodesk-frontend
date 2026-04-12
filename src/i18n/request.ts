import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

const SUPPORTED_LOCALES = ['en', 'ka'] as const;

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const raw = cookieStore.get('NEXT_LOCALE')?.value || 'ka';
  const locale = SUPPORTED_LOCALES.includes(raw as any) ? raw : 'ka';

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
