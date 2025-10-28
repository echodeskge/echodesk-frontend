'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { ArrowRight, MessageSquare, Phone, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AspectRatio } from '@/components/ui/aspect-ratio';

export function Hero() {
  const t = useTranslations('landing.hero');

  return (
    <section className="container space-y-10">
      <div className="grid place-items-center text-center gap-y-6">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
          <MessageSquare className="h-4 w-4" />
          <span>{t('badge')}</span>
        </div>

        {/* Main Heading */}
        <h1 className="text-5xl md:text-6xl font-black leading-tight max-w-4xl">
          {t('title')}
        </h1>

        {/* Subheading */}
        <p className="max-w-2xl text-lg md:text-xl text-muted-foreground">
          {t('subtitle')}
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <Button size="lg" asChild>
            <Link href="/registration">
              {t('cta.primary')}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="#features">{t('cta.secondary')}</Link>
          </Button>
        </div>

        {/* Feature Icons */}
        <div className="flex flex-wrap justify-center gap-6 mt-8 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <span>{t('features.messaging')}</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            <span>{t('features.calling')}</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <span>{t('features.email')}</span>
          </div>
        </div>
      </div>

      {/* Hero Image */}
      <HeroImage />
    </section>
  );
}

function HeroImage() {
  return (
    <Card className="bg-accent p-3 md:p-6">
      <Card className="pointer-events-none bg-muted p-6 overflow-hidden" asChild>
        <AspectRatio ratio={2560 / 1240}>
          <Image
            src="/dashboard-preview.png"
            alt="EchoDesk Dashboard Preview"
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1400px"
            priority
            quality={100}
            className="object-cover object-top rounded-lg"
          />
        </AspectRatio>
      </Card>
    </Card>
  );
}
