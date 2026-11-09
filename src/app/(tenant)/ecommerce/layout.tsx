import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { pickRouteMessages } from '@/lib/pick-messages';
import { EcShell } from './_components/ui/page';

const NAMESPACES = ['products', 'productAttributes', 'ecommerceOrders', 'ecommerceSettings', 'ecommerceAnalytics', 'ecommerceUi', 'clients', 'clientDetail', 'homepageBuilder', 'languages', 'orders', 'shippingMethods', 'promoCodes', 'reviews', 'imageGalleryPicker'];

export default async function EcommerceLayout({ children }: { children: React.ReactNode }) {
  const messages = await getMessages();
  return (
    <NextIntlClientProvider messages={pickRouteMessages(messages as Record<string, unknown>, NAMESPACES)}>
      <EcShell>{children}</EcShell>
    </NextIntlClientProvider>
  );
}
