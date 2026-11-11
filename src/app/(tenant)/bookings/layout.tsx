import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { pickRouteMessages } from '@/lib/pick-messages';
import { BookingsShell } from './_components/ui/page';

const NAMESPACES = [
  'bookingSettings',
  'bookingsUi',
  'bookingsDashboard',
  'bookingsServices',
  'bookingsCategories',
  'bookingsStaff',
  'bookingsBookings',
  'bookingsDetail',
  'bookingsClients',
  'bookingsCalendar',
  'bookingsAvailability',
];

export default async function BookingsLayout({ children }: { children: React.ReactNode }) {
  const messages = await getMessages();
  return (
    <NextIntlClientProvider messages={pickRouteMessages(messages as Record<string, unknown>, NAMESPACES)}>
      <BookingsShell>{children}</BookingsShell>
    </NextIntlClientProvider>
  );
}
