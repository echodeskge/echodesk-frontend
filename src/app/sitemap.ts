import type { MetadataRoute } from 'next';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  `https://${process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'echodesk.ge'}`;

const BLOG_API =
  `${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.echodesk.ge'}/api/blog/public/posts/?page_size=500`;

/**
 * Auto-fetch published blog posts and append them to the sitemap. Failure
 * is silent — if the API is down at build time we still ship the static
 * entries.
 */
async function fetchBlogUrls(): Promise<MetadataRoute.Sitemap> {
  try {
    const res = await fetch(BLOG_API, {
      next: { revalidate: 300 },
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      results?: Array<{ slug: string; published_at: string; updated_at?: string }>;
    };
    return (data.results || []).map((p) => ({
      url: `${SITE_URL}/blog/${p.slug}`,
      lastModified: p.updated_at ? new Date(p.updated_at) : new Date(p.published_at),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }));
  } catch {
    return [];
  }
}

/**
 * Root sitemap for the marketing site (echodesk.ge). Tenant subdomains are
 * not listed — they're auth-gated apps and shouldn't appear in the index.
 *
 * Static entries for landing + policy pages, plus auto-fetched blog posts.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const blogUrls = await fetchBlogUrls();
  return [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/registration`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/docs`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/privacy-policy`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/terms-of-service`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/refund-policy`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    // Blog index itself (gets the biggest priority update-frequency bump).
    {
      url: `${SITE_URL}/blog`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    // Individual blog posts, fetched from the API at build time.
    ...blogUrls,
  ];
}
