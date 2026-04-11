import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { pickRouteMessages } from '@/lib/pick-messages';
import { SettingsSidebar } from './settings-sidebar';

const NAMESPACES = ['settings', 'social', 'ecommerceSettings', 'invoices', 'bookingSettings', 'leave', 'users', 'groups', 'callsSettings'];

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const messages = await getMessages();
  return (
    <NextIntlClientProvider messages={pickRouteMessages(messages as Record<string, unknown>, NAMESPACES)}>
      <div className="flex h-[calc(100vh-64px)]">
        <SettingsSidebar />
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </NextIntlClientProvider>
  );
}
