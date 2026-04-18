import Link from 'next/link';
import { ArrowRight, Sparkles, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { LandingPage } from '@/hooks/useLandingPages';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  `https://${process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'echodesk.ge'}`;

const CATEGORY_META: Record<string, { ka: string; en: string; href: string }> = {
  feature: { ka: 'ფუნქციები', en: 'Features', href: '/#features' },
  vertical: { ka: 'ინდუსტრიები', en: 'Verticals', href: '/#verticals' },
  comparison: { ka: 'შედარება', en: 'Compare', href: '/#compare' },
};

/**
 * Server component — hero section reused across feature/vertical/comparison
 * landing pages. Breadcrumb styled after the main Hero badge for visual
 * consistency, then H1 + subtitle + dual CTAs (primary registration,
 * secondary anchor to #pricing further down the page).
 */
export function LandingHero({
  page,
  locale,
}: {
  page: LandingPage;
  locale: 'ka' | 'en';
}) {
  const category = CATEGORY_META[page.page_type] || CATEGORY_META.feature;
  const categoryName = locale === 'ka' ? category.ka : category.en;
  const primaryCta = locale === 'ka' ? 'დაიწყე უფასო ცდა' : 'Start free trial';
  const secondaryCta = locale === 'ka' ? 'ფასი ვნახო' : 'See pricing';

  return (
    <section className="container py-12 md:py-16 space-y-8">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="hover:text-foreground transition-colors">
              EchoDesk
            </Link>
          </li>
          <li>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </li>
          <li>
            <Link href={category.href} className="hover:text-foreground transition-colors">
              {categoryName}
            </Link>
          </li>
          <li>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </li>
          <li className="text-foreground font-medium line-clamp-1">{page.title}</li>
        </ol>
      </nav>

      <div className="max-w-3xl space-y-6">
        {/* og_tag chip — reuses the Hero badge styling (dark-mode contrast fix) */}
        {page.og_tag && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 dark:bg-blue-500/10 text-secondary dark:text-blue-300 text-sm font-medium">
            <Sparkles className="h-4 w-4" />
            <span>{page.og_tag}</span>
          </div>
        )}

        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight text-foreground">
          {page.title}
        </h1>

        {page.hero_subtitle && (
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
            {page.hero_subtitle}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button size="lg" asChild>
            <Link href="/registration">
              {primaryCta}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <a href={`${SITE_URL}/#pricing`}>{secondaryCta}</a>
          </Button>
        </div>
      </div>
    </section>
  );
}
