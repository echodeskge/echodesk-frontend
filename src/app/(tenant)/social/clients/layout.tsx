import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { pickRouteMessages } from '@/lib/pick-messages';

// The client rail reuses the Messages rail editors (tags, notes, tickets),
// whose strings live in `messagesBeta.rail`. A nested provider replaces the
// parent /social namespaces, so they are listed again here.
const NAMESPACES = ['socialClients', 'messagesBeta', 'chat', 'social'];

export default async function SocialClientsLayout({ children }: { children: React.ReactNode }) {
  const messages = await getMessages();
  return (
    <NextIntlClientProvider messages={pickRouteMessages(messages as Record<string, unknown>, NAMESPACES)}>
      {children}
    </NextIntlClientProvider>
  );
}
