import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

/**
 * Locale-aware CTA card — mirrors `src/components/landing/CTA.tsx` but
 * takes locale directly so we don't depend on next-intl's client-side
 * context and can render fully server-side.
 *
 * Trial copy = what `POST /api/register/` does: 30 days free, no card
 * (decision D1). Keep in sync with `landing.cta` / `landing.pageCommon`.
 */
export function LandingCTA({ locale }: { locale: 'ka' | 'en' }) {
  const title =
    locale === 'ka'
      ? 'მზად ხართ, მთელი ბიზნესი ერთი ადგილიდან მართოთ?'
      : 'Ready to run your business from one place?';
  const subtitle =
    locale === 'ka'
      ? 'შექმნილია ქართული გუნდებისთვის, ფასი ლარში, მხარდაჭერა თბილისიდან.'
      : 'Built for Georgian teams, priced in GEL, supported from Tbilisi.';
  const button = locale === 'ka' ? 'დაიწყეთ 30 დღე უფასოდ' : 'Start 30 days free';
  const note =
    locale === 'ka'
      ? '30 დღე უფასოდ • ბარათის გარეშე'
      : '30 days free · no card needed';

  return (
    <section className="container py-16">
      <Card className="bg-gradient-to-r from-secondary to-secondary/80 text-secondary-foreground p-8 md:p-12">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold">{title}</h2>
          <p className="text-lg opacity-90">{subtitle}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
            <Button size="lg" asChild>
              <Link href="/registration">
                {button}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <p className="text-sm opacity-75">{note}</p>
        </div>
      </Card>
    </section>
  );
}
