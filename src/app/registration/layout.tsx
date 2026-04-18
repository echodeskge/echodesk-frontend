import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { pickRouteMessages } from '@/lib/pick-messages';
import { buildSeoMetadata } from '@/lib/seo-metadata';

const NAMESPACES = ['auth', 'landing'];

export function generateMetadata(): Promise<Metadata> {
  return buildSeoMetadata({ namespace: 'seo.registration', path: '/registration' });
}

export default async function RegistrationLayout({ children }: { children: React.ReactNode }) {
  const messages = await getMessages();
  return (
    <NextIntlClientProvider messages={pickRouteMessages(messages as Record<string, unknown>, NAMESPACES)}>
      {children}
    </NextIntlClientProvider>
  );
}
