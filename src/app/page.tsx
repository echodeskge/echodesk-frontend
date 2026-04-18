import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { pickRouteMessages } from '@/lib/pick-messages';
import { getTranslations } from 'next-intl/server';
import HomeContent from './HomeContent';
import { FALLBACK_FEATURES } from '@/data/pricing-fallback';
import { SoftwareApplicationSchema } from '@/components/seo/SoftwareApplicationSchema';
import { FAQPageSchema } from '@/components/seo/FAQPageSchema';
import { buildSeoMetadata } from '@/lib/seo-metadata';
import type { Feature } from '@/types/package';

export function generateMetadata(): Promise<Metadata> {
  return buildSeoMetadata({ namespace: 'seo.home', path: '/' });
}

// `headers()` inside the component body auto-opts the route into dynamic
// rendering, so we don't need `export const dynamic = 'force-dynamic'`.
// Avoiding the explicit flag also avoids Next.js's aggressive streaming
// mode, which was pushing <title>/<meta name="description"> out of
// <head> and into <body> (Lighthouse then marked the page as missing a
// description).

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
  // Resolve the FAQ translator eagerly so FAQPageSchema can render
  // synchronously — preserves head-positioning of <title>/<meta>.
  const tFaq = tenantSubdomain ? null : await getTranslations('landing.faq');
  return (
    <NextIntlClientProvider messages={pickRouteMessages(messages as Record<string, unknown>, ['auth', 'landing'])}>
      {!tenantSubdomain && tFaq && (
        <>
          <SoftwareApplicationSchema features={initialFeatures} />
          <FAQPageSchema t={tFaq} />
        </>
      )}
      <HomeContent
        initialTenantSubdomain={tenantSubdomain}
        initialFeatures={initialFeatures}
      />
    </NextIntlClientProvider>
  );
}
