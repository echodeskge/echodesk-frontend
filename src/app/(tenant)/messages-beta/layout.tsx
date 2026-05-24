import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { pickRouteMessages } from '@/lib/pick-messages';

// `messagesBeta` carries every UI string for the /messages-beta page;
// `chat` + `socialClients` provide translations for the legacy components
// that the beta page reuses (MessageBubble, ClientDetailPanel, …).
const NAMESPACES = ['messagesBeta', 'chat', 'socialClients'];

export default async function MessagesBetaLayout({ children }: { children: React.ReactNode }) {
  const messages = await getMessages();
  return (
    <NextIntlClientProvider
      messages={pickRouteMessages(messages as Record<string, unknown>, NAMESPACES)}
    >
      {children}
    </NextIntlClientProvider>
  );
}
