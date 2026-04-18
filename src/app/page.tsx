import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { pickRouteMessages } from '@/lib/pick-messages';
import HomeContent from './HomeContent';
import { FALLBACK_FEATURES } from '@/data/pricing-fallback';
import { SoftwareApplicationSchema } from '@/components/seo/SoftwareApplicationSchema';
import { ogImage } from '@/lib/og';
import type { Feature } from '@/types/package';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('seo.home');
  const og = ogImage({ title: t('ogTitle'), subtitle: t('ogSubtitle'), tag: t('ogTag') });
  return {
    title: t('title'),
    description: t('description'),
    keywords: t('keywords'),
    openGraph: {
      title: t('title'),
      description: t('description'),
      images: [og],
    },
    twitter: {
      title: t('title'),
      description: t('description'),
      images: [og],
    },
  };
}

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

/**
 * Fetches the features catalogue server-side so pricing is fully rendered
 * before hydration. Falls back to a hardcoded list if the API is
 * unreachable — better bad-price SEO than "Loading features…" in the HTML
 * response seen by Google/Bing/Perplexity.
 */
async function fetchFeaturesServer(): Promise<Feature[]> {
  const apiDomain = process.env.NEXT_PUBLIC_API_DOMAIN || 'api.echodesk.ge';
  // On the root marketing domain there's no tenant — use the base API host.
  const url = `https://${apiDomain}/api/features/`;
  try {
    const response = await fetch(url, {
      // Keep fresh-ish — ISR handles the rest via revalidate (disabled here,
      // but upstream CDNs can still cache the HTML briefly).
      next: { revalidate: 300 },
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`features API ${response.status}`);
    const data = (await response.json()) as { results?: Feature[] };
    const results = data.results || [];
    return results.length > 0 ? results : FALLBACK_FEATURES;
  } catch {
    return FALLBACK_FEATURES;
  }
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
  // Only fetch features when we're rendering the marketing page — tenant
  // subdomains render a login form and don't need pricing data.
  const initialFeatures = tenantSubdomain ? [] : await fetchFeaturesServer();
  return (
    <NextIntlClientProvider messages={pickRouteMessages(messages as Record<string, unknown>, ['auth', 'landing'])}>
      {!tenantSubdomain && <SoftwareApplicationSchema features={initialFeatures} />}
      <HomeContent
        initialTenantSubdomain={tenantSubdomain}
        initialFeatures={initialFeatures}
      />
    </NextIntlClientProvider>
  );
}
