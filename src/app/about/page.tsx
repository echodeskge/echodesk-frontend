import Link from 'next/link';
import { ArrowRight, MapPin, Coins, Building2 } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const revalidate = 300;

export default async function AboutPage() {
  const t = await getTranslations('about');

  const values = [
    { icon: MapPin, key: 'local' as const },
    { icon: Coins, key: 'pricing' as const },
    { icon: Building2, key: 'smb' as const },
  ];

  const stats = (['tenants', 'messages', 'calls', 'invoices'] as const).map((k) => ({
    value: t(`stats.${k}.value`),
    label: t(`stats.${k}.label`),
    hint: t(`stats.${k}.hint`),
  }));

  return (
    <div className="container mx-auto max-w-5xl px-4 py-10 md:py-14 space-y-16">
      {/* Hero */}
      <section className="text-center space-y-5">
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight">{t('hero.headline')}</h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          {t('hero.subheadline')}
        </p>
        <div className="pt-2">
          <Button asChild size="lg">
            <Link href="/contact">
              {t('hero.cta')}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Story */}
      <section className="max-w-3xl mx-auto">
        <p className="text-base md:text-lg leading-relaxed">{t('story.body')}</p>
      </section>

      {/* Values */}
      <section>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {values.map(({ icon: Icon, key }) => (
            <Card key={key} className="p-6 space-y-3">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
              </div>
              <h2 className="text-xl font-semibold">{t(`values.${key}.title`)}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t(`values.${key}.description`)}
              </p>
            </Card>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s) => (
            <Card key={s.label} className="p-4 text-center space-y-1">
              <div className="text-3xl md:text-4xl font-bold text-primary">{s.value}</div>
              <div className="text-sm font-medium">{s.label}</div>
              <div className="text-xs text-muted-foreground">{s.hint}</div>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
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
