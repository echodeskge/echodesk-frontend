import { Header, Footer, Pricing } from '@/components/landing';
import { BlogFaq } from '@/components/blog/BlogFaq';
import { LandingPageSchema } from '@/components/seo/LandingPageSchema';
import { LandingHero } from './LandingHero';
import { ContentBlocks } from './ContentBlocks';
import { LandingCTA } from './LandingCTA';
import { RelatedLandingPages } from './RelatedLandingPages';
import type { LandingPage } from '@/hooks/useLandingPages';
import type { Feature } from '@/types/package';

/**
 * Top-level template that all three landing route variants render.
 *
 * Streaming-SSR safety: takes already-awaited `page` and `initialFeatures`
 * so we never `await` inside JSX. This is the Phase 2 lesson — mid-stream
 * suspends were pushing <title> / <meta name="description"> out of <head>
 * and into <body>, breaking social previews and Lighthouse.
 *
 * RelatedLandingPages is a nested async server component; its suspend
 * boundary sits BELOW the main content in the DOM, so the head has
 * already flushed by the time it renders.
 */
export function LandingPageView({
  page,
  locale,
  url,
  initialFeatures,
}: {
  page: LandingPage;
  locale: 'ka' | 'en';
  url: string;
  initialFeatures: Feature[];
}) {
  return (
    <>
      <LandingPageSchema page={page} url={url} locale={locale} />
      <div className="min-h-screen">
        <Header />
        <main className="py-6 md:py-10 space-y-6 md:space-y-10 bg-background">
          <LandingHero page={page} locale={locale} />
          <ContentBlocks
            blocks={page.content_blocks || []}
            locale={locale}
            features={initialFeatures}
          />
          <Pricing initialFeatures={initialFeatures} />
          {page.faq_items?.length > 0 && (
            <section className="container py-8 md:py-12">
              <BlogFaq
                items={page.faq_items}
                locale={locale}
                heading={
                  locale === 'ka'
                    ? 'ხშირად დასმული კითხვები'
                    : 'Frequently asked questions'
                }
              />
            </section>
          )}
          <LandingCTA locale={locale} />
          <RelatedLandingPages
            currentSlug={page.slug}
            pageType={page.page_type}
            locale={locale}
          />
        </main>
        <Footer />
      </div>
    </>
  );
}
