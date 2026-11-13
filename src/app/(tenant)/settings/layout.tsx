import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { pickRouteMessages } from '@/lib/pick-messages';
import { SettingsShell } from './_components/settings-shell';

// `landing.pricing.stepper`: the shared EmployeeCount control (Settings →
// Subscription seat card) keeps its strings with the landing pricing block;
// pick just that sub-tree rather than the whole landing bundle.
const NAMESPACES = ['settings', 'social', 'autoPosting', 'ecommerceSettings', 'ecommerceUi', 'ecommerceOrders', 'invoices', 'bookingSettings', 'leave', 'users', 'groups', 'callsSettings', 'calls', 'subscription', 'notificationPreferences', 'ratingStatistics', 'pbxSettings', 'imageGalleryPicker', 'landing.pricing.stepper'];

// Full-height settings shell (design Settings screen): grouped nav, header
// breadcrumb + search, and the scrolling content column with the save bar slot.
export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const messages = await getMessages();
  return (
    <NextIntlClientProvider messages={pickRouteMessages(messages as Record<string, unknown>, NAMESPACES)}>
      <SettingsShell>{children}</SettingsShell>
    </NextIntlClientProvider>
  );
}
