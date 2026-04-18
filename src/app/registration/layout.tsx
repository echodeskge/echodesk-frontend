import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { pickRouteMessages } from '@/lib/pick-messages';
import { ogImage } from '@/lib/og';

const NAMESPACES = ['auth', 'landing'];

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('seo.registration');
  const og = ogImage({ title: t('ogTitle'), subtitle: t('ogSubtitle'), tag: t('ogTag') });
  return {
    title: t('title'),
    description: t('description'),
    keywords: t('keywords'),
    openGraph: { title: t('title'), description: t('description'), images: [og] },
    twitter: { title: t('title'), description: t('description'), images: [og] },
    alternates: { canonical: '/registration' },
  };
}

export default async function RegistrationLayout({ children }: { children: React.ReactNode }) {
  const messages = await getMessages();
  return (
    <NextIntlClientProvider messages={pickRouteMessages(messages as Record<string, unknown>, NAMESPACES)}>
      {children}
    </NextIntlClientProvider>
  );
}
