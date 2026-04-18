import Link from 'next/link';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { LandingContentBlockFeatureShowcase } from '@/hooks/useLandingPages';
import type { Feature } from '@/types/package';

/**
 * Two-column block: text on the left, a callout Card on the right that
 * references the highlighted feature by slug (matched against the
 * features catalogue). Shows name + GEL price if we found the feature,
 * falls back to a generic "See pricing" card otherwise.
 */
export function FeatureShowcase({
  block,
  locale,
  features,
}: {
  block: LandingContentBlockFeatureShowcase;
  locale: 'ka' | 'en';
  features: Feature[];
}) {
  const heading = locale === 'ka' ? block.heading_ka : block.heading_en;
  const body = locale === 'ka' ? block.body_ka : block.body_en;
  const feature = features.find((f) => f.key === block.feature_slug);
  const ctaLabel = locale === 'ka' ? 'ფასი ვნახო' : 'See pricing';
  const pricePerAgent = feature
    ? parseFloat(feature.price_per_user_gel || '0').toFixed(2)
    : null;

  return (
    <section className="container py-12 md:py-16">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
        <div className="space-y-4">
          {heading && (
            <h2 className="text-3xl md:text-4xl font-bold">{heading}</h2>
          )}
          {body && (
            <div className="prose prose-neutral dark:prose-invert max-w-none text-muted-foreground">
              {body.split(/\n\n+/).map((para, idx) => (
                <p key={idx} className="leading-relaxed text-base md:text-lg">
                  {para}
                </p>
              ))}
            </div>
          )}
        </div>

        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="p-6 md:p-8 space-y-4">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
              <Sparkles className="h-4 w-4" />
              {locale === 'ka' ? 'მოდული' : 'Module'}
            </div>
            <div className="text-xl md:text-2xl font-bold">
              {feature?.name || block.feature_slug}
            </div>
            {feature?.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            )}
            {pricePerAgent && (
              <div className="flex items-baseline gap-2 pt-2">
                <span className="text-3xl font-bold text-primary">
                  {pricePerAgent}₾
                </span>
                <span className="text-sm text-muted-foreground">
                  {locale === 'ka' ? 'აგენტზე/თვეში' : 'per agent/month'}
                </span>
              </div>
            )}
            <Link
              href="/#pricing"
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
            >
              {ctaLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
