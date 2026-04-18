/**
 * Build the URL for the dynamic OG image route at `/og`. The route
 * renders a branded 1200×630 card with EchoDesk wordmark, the provided
 * title + subtitle, an optional tag badge, and the GEL wedge footer.
 *
 * Usage inside Next.js `generateMetadata`:
 *
 *   openGraph: { images: [ogImage({ title, subtitle, tag: 'CRM' })] }
 *
 * The returned URL is root-relative; metadataBase resolves it to an
 * absolute URL for the <meta property="og:image"> tag. Keep titles
 * short (under 60 chars) to avoid auto-shrinking the hero typography.
 */
export function ogImage(params: {
  title: string;
  subtitle?: string;
  /** Short all-caps label rendered in the top-right pill (e.g. "CRM", "PRICING", "COMPARE"). */
  tag?: string;
}): string {
  const sp = new URLSearchParams();
  sp.set('title', params.title);
  if (params.subtitle) sp.set('subtitle', params.subtitle);
  if (params.tag) sp.set('tag', params.tag);
  return `/og?${sp.toString()}`;
}
