import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import {
  fetchLandingPagesServer,
  type LandingPageType,
  type LandingPageListItem,
} from '@/hooks/useLandingPages';

/**
 * Builds the public URL for a landing page based on its type. Feature
 * pages live at root (`/{slug}`), comparisons at `/compare/{slug}`
 * (without the `compare-` prefix that the backend stores), and vertical
 * pages at `/for/{slug}` (without the `for-` prefix).
 */
function pathFor(page: LandingPageListItem): string {
  if (page.page_type === 'comparison') {
    return `/compare/${page.slug.replace(/^compare-/, '')}`;
  }
  if (page.page_type === 'vertical') {
    return `/for/${page.slug.replace(/^for-/, '')}`;
  }
  return `/${page.slug}`;
}

/**
 * Fetches a handful of sibling pages of the same type and shows up to 3
 * as clickable cards. Keeps the user exploring without a heavy nav.
 */
export async function RelatedLandingPages({
  currentSlug,
  pageType,
  locale,
}: {
  currentSlug: string;
  pageType: LandingPageType;
  locale: 'ka' | 'en';
}) {
  const heading = locale === 'ka' ? 'დაკავშირებული გვერდები' : 'Related pages';
  let related: LandingPageListItem[] = [];
  try {
    const list = await fetchLandingPagesServer({
      pageType,
      lang: locale,
      pageSize: 4,
    });
    related = list.results
      .filter((p) => p.slug !== currentSlug)
      .slice(0, 3);
  } catch {
    related = [];
  }

  if (related.length === 0) return null;

  return (
    <section className="container py-12 md:py-16">
      <h2 className="text-xl md:text-2xl font-semibold mb-6">{heading}</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {related.map((page) => (
          <Link
            key={page.id}
            href={pathFor(page)}
            className="group flex flex-col gap-2 rounded-2xl border bg-card p-5 transition-all hover:border-primary/50 hover:shadow-md"
          >
            {page.og_tag && (
              <span className="inline-flex items-center self-start rounded-full bg-secondary/10 dark:bg-blue-500/10 text-secondary dark:text-blue-300 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide">
                {page.og_tag}
              </span>
            )}
            <h3 className="text-lg font-semibold leading-tight transition-colors group-hover:text-primary">
              {page.title}
            </h3>
            {page.summary && (
              <p className="text-sm text-muted-foreground line-clamp-3">
                {page.summary}
              </p>
            )}
            <div className="mt-auto pt-2 flex items-center justify-end text-xs text-muted-foreground">
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
