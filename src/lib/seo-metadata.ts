import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  `https://${process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'echodesk.ge'}`;

const SITE_NAME = 'EchoDesk';
const OG_IMAGE_ALT =
  'EchoDesk — run your whole business from one place: social, calls, email, tickets, invoices, bookings, leave management.';

/**
 * Build a complete Metadata object from a `seo.<namespace>` i18n block.
 *
 * We rebuild the full openGraph + twitter payload on every page because
 * Next.js REPLACES (not merges) these fields when a child page sets them —
 * so leaving out `type`, `url`, `siteName`, or `card` in a per-page
 * generateMetadata drops those tags from the final HTML. Facebook then
 * warns about missing og:type / og:url, and Twitter falls back to
 * "summary" instead of "summary_large_image".
 *
 * og:image / twitter:image are NOT set here — Next.js auto-injects them
 * from the nearest opengraph-image.tsx file (or a sibling
 * twitter-image.tsx if present) when metadata.openGraph.images is
 * absent.
 */
export async function buildSeoMetadata(options: {
  namespace: string;
  path: string;
  /** Optional canonical override — defaults to SITE_URL + path. */
  canonical?: string;
}): Promise<Metadata> {
  const t = await getTranslations(options.namespace);
  const url = `${SITE_URL}${options.path === '/' ? '' : options.path}`;

  return {
    title: t('title'),
    description: t('description'),
    keywords: t('keywords'),
    alternates: {
      canonical: options.canonical ?? url,
    },
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      locale: 'ka_GE',
      alternateLocale: ['en_US'],
      url,
      title: t('title'),
      description: t('description'),
    },
    twitter: {
      card: 'summary_large_image',
      site: '@echodesk',
      creator: '@echodesk',
      title: t('title'),
      description: t('description'),
    },
  };
}

/** Exported so layout/root metadata can reuse the same alt text. */
export const DEFAULT_OG_IMAGE_ALT = OG_IMAGE_ALT;
