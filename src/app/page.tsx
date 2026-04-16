import { headers } from 'next/headers';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { pickRouteMessages } from '@/lib/pick-messages';
import HomeContent from './HomeContent';

// Force per-request rendering so the tenant hint from middleware is read on
// every navigation/cold-load. Without this, Next.js may static-render the
// root page once and serve the same HTML to every hostname.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const RESERVED_SUBDOMAINS = new Set(['www', 'api', 'mail', 'admin']);

function extractTenantSubdomainFromHost(host: string | null, mainDomain: string): string | null {
  if (!host) return null;
  const clean = host.split(':')[0];
  if (clean === 'localhost' || clean.endsWith('.localhost') || clean === '127.0.0.1') return null;
  if (!clean.endsWith(`.${mainDomain}`)) return null;
  const sub = clean.slice(0, clean.length - mainDomain.length - 1);
  if (!sub || sub.includes('.')) return null;
  if (RESERVED_SUBDOMAINS.has(sub)) return null;
  return sub;
}

export default async function Home() {
  const h = await headers();
  // Prefer the middleware-set hint; fall back to deriving from the host header
  // directly so we're correct even if middleware is skipped by the hosting
  // platform for the root route.
  const hintFromMiddleware = h.get('x-tenant-subdomain');
  const mainDomain = process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'echodesk.ge';
  const hostHeader = h.get('host');
  const tenantSubdomain = hintFromMiddleware || extractTenantSubdomainFromHost(hostHeader, mainDomain);

  const messages = await getMessages();
  return (
    <NextIntlClientProvider messages={pickRouteMessages(messages as Record<string, unknown>, ['auth', 'landing'])}>
      <HomeContent initialTenantSubdomain={tenantSubdomain} />
    </NextIntlClientProvider>
  );
}
