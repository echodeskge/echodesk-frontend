import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { pickRouteMessages } from '@/lib/pick-messages';

// Templates reuse the WhatsApp compose dialog (messagesBeta) and the quick
// reply form (chat) — load those here instead of in every settings page.
// A nested provider replaces the parent's messages, so 'settings' is repeated.
const NAMESPACES = ['settings', 'social', 'chat', 'messagesBeta'];

export default async function SettingsTemplatesLayout({ children }: { children: React.ReactNode }) {
  const messages = await getMessages();
  return (
    <NextIntlClientProvider messages={pickRouteMessages(messages as Record<string, unknown>, NAMESPACES)}>
      {children}
    </NextIntlClientProvider>
  );
}
