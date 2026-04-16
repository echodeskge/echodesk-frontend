import { headers } from 'next/headers';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { pickRouteMessages } from '@/lib/pick-messages';
import HomeContent from './HomeContent';

export default async function Home() {
  // Read the tenant hint set by middleware.ts when the request arrives on a
  // tenant subdomain (e.g. amanati.echodesk.ge). With this header present we
  // know at SSR time NOT to paint the main echodesk.ge landing page — the
  // client-side TenantProvider will still fetch the tenant config for branding.
  const h = await headers();
  const tenantSubdomain = h.get('x-tenant-subdomain');

  const messages = await getMessages();
  return (
    <NextIntlClientProvider messages={pickRouteMessages(messages as Record<string, unknown>, ['auth', 'landing'])}>
      <HomeContent initialTenantSubdomain={tenantSubdomain} />
    </NextIntlClientProvider>
  );
}
