import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { pickRouteMessages } from '@/lib/pick-messages';
import { extractTenantSubdomainFromHost } from '@/lib/tenant-subdomain';
import { fetchLandingPageServer } from '@/hooks/useLandingPages';
import { fetchFeaturesServer } from '@/lib/fetch-features';
import { LandingPageView } from '@/components/landing-page/LandingPageView';

// 5-minute ISR — matches the blog. Do NOT set `export const dynamic`;
// letting Next resolve rendering mode from `headers()`/`cookies()` keeps
// <title>/<meta name="description"> flushed into <head> rather than
// pushed mid-stream into <body> (Phase 2 regression).
export const revalidate = 300;

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  `https://${process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'echodesk.ge'}`;

async function resolveLocale(): Promise<'ka' | 'en'> {
  const cookieStore = await cookies();
  const raw = cookieStore.get('NEXT_LOCALE')?.value;
  return raw === 'en' ? 'en' : 'ka';
}

// Note: no `generateStaticParams`. Calling it would ask Next.js to
// prerender at build time, but the root layout resolves locale via
// `cookies()` in src/i18n/request.ts — dynamic APIs aren't available
// during static generation, so the prerender fails with
// DynamicServerError. Letting the page render on-demand + caching via
// the 5-min ISR gives the same effect for SEO without the build error.

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const lang = await resolveLocale();
  const page = await fetchLandingPageServer(slug, lang).catch(() => null);
  if (!page) {
    return { title: 'Not found' };
  }

  const url = `${SITE_URL}/${slug}`;
  const title = page.meta_title || page.title;
  const description = page.meta_description || page.summary;
  return {
    title,
    description,
    keywords: (page.keywords || []).join(', '),
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      siteName: 'EchoDesk',
      locale: lang === 'ka' ? 'ka_GE' : 'en_US',
      url,
      title,
      description,
    },
    twitter: {
      card: 'summary_large_image',
      site: '@echodesk',
      creator: '@echodesk',
      title,
      description,
    },
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function FeatureLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const lang = await resolveLocale();

  // Tenant-subdomain guard — marketing pages must 404 on tenant hosts
  // (e.g. alpha.echodesk.ge). The tenant app serves a login form at `/`
  // and has no concept of marketing slugs.
  const h = await headers();
  const hintFromMiddleware = h.get('x-tenant-subdomain');
  const mainDomain = process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'echodesk.ge';
  const hostHeader = h.get('host');
  const tenantSubdomain =
    hintFromMiddleware || extractTenantSubdomainFromHost(hostHeader, mainDomain);
  if (tenantSubdomain) notFound();

  const [page, features, messages] = await Promise.all([
    fetchLandingPageServer(slug, lang).catch(() => null),
    fetchFeaturesServer(),
    getMessages(),
  ]);

  if (!page || page.page_type !== 'feature') notFound();

  const url = `${SITE_URL}/${slug}`;
  return (
    <NextIntlClientProvider
      messages={pickRouteMessages(
        messages as Record<string, unknown>,
        ['auth', 'landing'],
      )}
    >
      <LandingPageView
        page={page}
        locale={lang}
        url={url}
        initialFeatures={features}
      />
    </NextIntlClientProvider>
  );
}
