import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getLandingIcon } from './icon-map';
import type { LandingContentBlockBenefitGrid } from '@/hooks/useLandingPages';

/**
 * Responsive 3-column grid of shadcn Cards, each with a lucide icon
 * resolved from the block's `icon` string. Visual styling mirrors the
 * homepage `Features.tsx` cards for brand consistency.
 */
export function BenefitGrid({
  block,
  locale,
}: {
  block: LandingContentBlockBenefitGrid;
  locale: 'ka' | 'en';
}) {
  const heading = locale === 'ka' ? block.heading_ka : block.heading_en;
  return (
    <section className="container py-12 md:py-16 space-y-8">
      {heading && (
        <h2 className="text-3xl md:text-4xl font-bold max-w-3xl">{heading}</h2>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {block.items.map((item, idx) => {
          const Icon = getLandingIcon(item.icon);
          const title = locale === 'ka' ? item.title_ka : item.title_en;
          const description =
            locale === 'ka' ? item.description_ka : item.description_en;
          return (
            <Card key={idx} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-secondary/10 dark:bg-blue-500/10 flex items-center justify-center mb-4">
                  <Icon className="h-6 w-6 text-secondary dark:text-blue-300" />
                </div>
                <CardTitle>{title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-base text-muted-foreground leading-relaxed">
                  {description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
