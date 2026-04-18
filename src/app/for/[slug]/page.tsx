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

export const revalidate = 300;

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  `https://${process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'echodesk.ge'}`;

async function resolveLocale(): Promise<'ka' | 'en'> {
  const cookieStore = await cookies();
  const raw = cookieStore.get('NEXT_LOCALE')?.value;
  return raw === 'en' ? 'en' : 'ka';
}

// Vertical landing pages (`/for/salons`, `/for/law-firms`) are stored
// with a `for-` prefix in the backend. Strip it for the URL param,
// re-add it when calling the API.

// No `generateStaticParams` — see src/app/[slug]/page.tsx for why.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const lang = await resolveLocale();
  const apiSlug = `for-${slug}`;
  const page = await fetchLandingPageServer(apiSlug, lang).catch(() => null);
  if (!page) {
    return { title: 'Not found' };
  }

  const url = `${SITE_URL}/for/${slug}`;
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

export default async function VerticalLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const lang = await resolveLocale();

  const h = await headers();
  const hintFromMiddleware = h.get('x-tenant-subdomain');
  const mainDomain = process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'echodesk.ge';
  const hostHeader = h.get('host');
  const tenantSubdomain =
    hintFromMiddleware || extractTenantSubdomainFromHost(hostHeader, mainDomain);
  if (tenantSubdomain) notFound();

  const apiSlug = `for-${slug}`;
  const [page, features, messages] = await Promise.all([
    fetchLandingPageServer(apiSlug, lang).catch(() => null),
    fetchFeaturesServer(),
    getMessages(),
  ]);

  if (!page || page.page_type !== 'vertical') notFound();

  const url = `${SITE_URL}/for/${slug}`;
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
