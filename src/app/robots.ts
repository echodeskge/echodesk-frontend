import type { MetadataRoute } from 'next';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  `https://${process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'echodesk.ge'}`;

/**
 * Marketing-site robots.txt. Tenant subdomains (`*.echodesk.ge`) serve a
 * login-gated app — robots.txt is per-host so those subdomains aren't
 * covered by this file, but they also don't produce crawlable public
 * pages to worry about.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/registration?*', // bare page is fine; pre-filled deep-links aren't useful
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
