'use client';

import type { ReactNode } from 'react';
import { Header } from './Header';
import { Hero } from './Hero';
import { Features } from './Features';
import { Pricing } from './Pricing';
import { FAQ } from './FAQ';
import { CTA } from './CTA';
import { Footer } from './Footer';
import type { Feature } from '@/types/package';

export function EchoDeskLanding({
  initialFeatures = [],
  testimonialsSlot = null,
}: {
  initialFeatures?: Feature[];
  // Async server component rendered by page.tsx and passed in as a
  // pre-rendered slot. Keeps this wrapper a client component (needed
  // for Header interactivity + language switcher) while allowing the
  // testimonials strip to fetch server-side for SEO.
  testimonialsSlot?: ReactNode;
}) {
  return (
    <div className="min-h-screen">
      {/* Header with Language Switcher */}
      <Header />

      {/* Main Content */}
      <main className="py-16 space-y-24 bg-background">
        <Hero />
        <Features />
        <Pricing initialFeatures={initialFeatures} />
        {testimonialsSlot}
        <FAQ />
        <CTA />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}

export { Header, Hero, Features, Pricing, FAQ, CTA, Footer };
