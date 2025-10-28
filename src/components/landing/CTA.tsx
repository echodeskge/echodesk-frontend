'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export function CTA() {
  const t = useTranslations('landing.cta');

  return (
    <section className="container py-16">
      <Card className="bg-gradient-to-r from-secondary to-secondary/80 text-secondary-foreground p-8 md:p-12">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold">{t('title')}</h2>
          <p className="text-lg opacity-90">{t('subtitle')}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
            <Button size="lg" asChild>
              <Link href="/registration">
                {t('button')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <p className="text-sm opacity-75">{t('noCreditCard')}</p>
        </div>
      </Card>
    </section>
  );
}
