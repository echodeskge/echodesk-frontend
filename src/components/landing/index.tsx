'use client';

import { Header } from './Header';
import { Hero } from './Hero';
import { Features } from './Features';
import { Pricing } from './Pricing';
import { FAQ } from './FAQ';
import { CTA } from './CTA';
import { Footer } from './Footer';
import type { Feature } from '@/types/package';

export function EchoDeskLanding({ initialFeatures = [] }: { initialFeatures?: Feature[] }) {
  return (
    <div className="min-h-screen">
      {/* Header with Language Switcher */}
      <Header />

      {/* Main Content */}
      <div className="py-16 space-y-24 bg-background">
        <Hero />
        <Features />
        <Pricing initialFeatures={initialFeatures} />
        <FAQ />
        <CTA />
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}

export { Header, Hero, Features, Pricing, FAQ, CTA, Footer };
