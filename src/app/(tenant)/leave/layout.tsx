import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { pickRouteMessages } from '@/lib/pick-messages';
import { LeaveShell } from './_components/ui/leave-page';

const NAMESPACES = ['leave'];

export default async function LeaveLayout({ children }: { children: React.ReactNode }) {
  const messages = await getMessages();
  return (
    <NextIntlClientProvider messages={pickRouteMessages(messages as Record<string, unknown>, NAMESPACES)}>
      <LeaveShell>{children}</LeaveShell>
    </NextIntlClientProvider>
  );
}
