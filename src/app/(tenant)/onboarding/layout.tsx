import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { pickRouteMessages } from '@/lib/pick-messages';

// `onboarding` ships globally (the header chip); the inbox step reuses the
// Telegram / e-mail / widget connect forms, which read `social.*`.
const NAMESPACES = ['onboarding', 'social'];

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const messages = await getMessages();
  return (
    <NextIntlClientProvider messages={pickRouteMessages(messages as Record<string, unknown>, NAMESPACES)}>
      {children}
    </NextIntlClientProvider>
  );
}
