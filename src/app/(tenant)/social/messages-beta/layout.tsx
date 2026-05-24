import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { pickRouteMessages } from '@/lib/pick-messages';

// Mirrors the top-level /messages-beta layout. The nested
// NextIntlClientProvider replaces the parent /social layout's namespace
// list, so we must re-include the chat + socialClients namespaces the
// reused legacy components (MessageBubble, ClientDetailPanel) depend on.
const NAMESPACES = ['messagesBeta', 'chat', 'socialClients'];

export default async function SocialMessagesBetaLayout({
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
