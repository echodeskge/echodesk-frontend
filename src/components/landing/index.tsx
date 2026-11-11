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

/**
 * Marketing homepage shell ("Landing – Redesign" design file). `.lp`
 * scopes the Schibsted Grotesk face (variable set by the root layout), the
 * 15/22 base type and the dark-mode token variants (globals.css); dark mode
 * itself follows the app's ThemeProvider (system preference by default).
 */
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
    <div className="lp min-h-screen bg-background text-foreground">
      <Header />
      <main id="top">
        <Hero />
        <Features features={initialFeatures} />
        <Pricing initialFeatures={initialFeatures} />
        {testimonialsSlot}
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}

export { Header, Hero, Features, Pricing, FAQ, CTA, Footer };
