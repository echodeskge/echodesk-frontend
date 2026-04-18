import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

/**
 * Locale-aware CTA card — mirrors `src/components/landing/CTA.tsx` but
 * takes locale directly so we don't depend on next-intl's client-side
 * context and can render fully server-side.
 */
export function LandingCTA({ locale }: { locale: 'ka' | 'en' }) {
  const title =
    locale === 'ka'
      ? 'მზად ხარ EchoDesk-ის გამოსაცდელად?'
      : 'Ready to try EchoDesk?';
  const subtitle =
    locale === 'ka'
      ? 'დაიწყე 14-დღიანი უფასო ცდა — ბარათი არ სჭირდება, გააქტიურდი წუთებში.'
      : 'Start your 14-day free trial. No credit card required, set up in minutes.';
  const button = locale === 'ka' ? 'დაიწყე უფასო ცდა' : 'Start free trial';
  const note =
    locale === 'ka'
      ? 'საკრედიტო ბარათი არ არის საჭირო • 14 დღე უფასოდ'
      : 'No credit card required · 14-day free trial';

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
