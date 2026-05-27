import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { pickRouteMessages } from '@/lib/pick-messages';

// The socket inbox needs its own `messagesBeta` strings plus `chat` +
// `socialClients` for the reused legacy components (MessageBubble,
// ClientDetailPanel, …). The parent /social layout doesn't load `messagesBeta`,
// and the nested provider replaces its namespace list, so re-declare them here.
const NAMESPACES = ['messagesBeta', 'chat', 'socialClients'];

export default async function SocialMessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const messages = await getMessages();
  return (
    <NextIntlClientProvider
      messages={pickRouteMessages(messages as Record<string, unknown>, NAMESPACES)}
    >
      {children}
    </NextIntlClientProvider>
  );
}
