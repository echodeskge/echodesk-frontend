import type { Feature } from '@/types/package';
import { FALLBACK_FEATURES } from '@/data/pricing-fallback';

/**
 * Fetches the features catalogue server-side so pricing sections on
 * marketing / landing pages render fully in the initial HTML. Falls back
 * to a hardcoded list if the API is unreachable — better bad-price SEO
 * than "Loading features…" in the HTML seen by Google/Bing/Perplexity.
 *
 * Shared between `src/app/page.tsx` (homepage) and the landing-page
 * dynamic routes so they all hit the same 5-minute ISR cache.
 */
export async function fetchFeaturesServer(): Promise<Feature[]> {
  const apiDomain = process.env.NEXT_PUBLIC_API_DOMAIN || 'api.echodesk.ge';
  const url = `https://${apiDomain}/api/features/`;
  try {
    const response = await fetch(url, {
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
