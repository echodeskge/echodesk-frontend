import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getLandingIcon } from '@/components/landing-page/icon-map';
import { fetchFeaturesServer } from '@/lib/fetch-features';
import type { Feature } from '@/types/package';

export const revalidate = 300;

/**
 * Feature slugs that have a dedicated SEO landing page. The integrations
 * page links feature cards into these pages for internal SEO crossing.
 */
const FEATURE_TO_LANDING: Record<string, string> = {
  whatsapp: '/whatsapp-business-crm-georgia',
  sip: '/call-center-software-tbilisi',
  pbx: '/call-center-software-tbilisi',
  recording: '/call-center-software-tbilisi',
  invoicing: '/invoice-software-gel',
  bookings: '/booking-software-georgia',
  email: '/email-helpdesk-georgia',
  tickets: '/ticket-management-georgia',
  leave: '/leave-management-georgia',
  tiktok: '/tiktok-shop-crm-georgia',
};

const CATEGORY_ORDER = [
  'CORE',
  'COMMUNICATION',
  'INTEGRATION',
  'ANALYTICS',
  'SUPPORT',
  'LIMITS',
];

function groupByCategory(features: Feature[]): Map<string, Feature[]> {
  const groups = new Map<string, Feature[]>();
  for (const f of features) {
    const cat = (f.category || 'INTEGRATION').toUpperCase();
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat)!.push(f);
  }
  for (const list of groups.values()) {
    list.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }
  return groups;
}

export default async function IntegrationsPage() {
  const [features, t] = await Promise.all([
    fetchFeaturesServer(),
    getTranslations('integrations'),
  ]);
  const groups = groupByCategory(features);
  const orderedCategories = [
    ...CATEGORY_ORDER.filter((c) => groups.has(c)),
    ...[...groups.keys()].filter((c) => !CATEGORY_ORDER.includes(c)),
  ];

  return (
    <div className="container mx-auto max-w-6xl px-4 py-10 md:py-14 space-y-12">
      {/* Hero */}
      <header className="text-center space-y-3">
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight">{t('hero.title')}</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{t('hero.subtitle')}</p>
        <p className="text-sm text-muted-foreground pt-2">
          {t('hero.count', { count: features.length })}
        </p>
      </header>

      {/* Groups */}
      {orderedCategories.map((category) => {
        const list = groups.get(category) ?? [];
        if (list.length === 0) return null;
        const categoryLabel = t.has(`categoryLabels.${category}`)
          ? t(`categoryLabels.${category}`)
          : category;
        return (
          <section key={category} className="space-y-5">
            <h2 className="text-xl md:text-2xl font-semibold">{categoryLabel}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {list.map((feature) => {
                const Icon = getLandingIcon(feature.icon);
                const href = FEATURE_TO_LANDING[feature.key];
                const price = parseFloat(feature.price_per_user_gel || '0');
                const body = (
                  <Card className="p-5 h-full space-y-3 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <h3 className="font-semibold leading-tight">{feature.name}</h3>
                        {price > 0 && (
                          <div className="text-xs text-muted-foreground">
                            {t('pricePerUser', { price: price.toFixed(2) })}
                          </div>
                        )}
                      </div>
                    </div>
                    {feature.description && (
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {feature.description}
                      </p>
                    )}
                  </Card>
                );
                return href ? (
                  <Link key={feature.id} href={href} className="block h-full">
                    {body}
                  </Link>
                ) : (
                  <div key={feature.id} className="h-full">
                    {body}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {/* Final CTA */}
      <section>
        <Card className="bg-primary/5 border-primary/20 p-8 md:p-10 text-center space-y-4">
          <h2 className="text-2xl md:text-3xl font-semibold">{t('cta.title')}</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">{t('cta.body')}</p>
          <div>
            <Button asChild size="lg">
              <Link href="/contact">
                {t('cta.button')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </Card>
      </section>
    </div>
  );
}
