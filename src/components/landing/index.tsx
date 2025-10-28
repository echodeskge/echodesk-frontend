'use client';

import { Header } from './Header';
import { Hero } from './Hero';
import { Features } from './Features';
import { Pricing } from './Pricing';
import { CTA } from './CTA';
import { Footer } from './Footer';

export function EchoDeskLanding() {
  return (
    <div className="min-h-screen">
      {/* Header with Language Switcher */}
      <Header />

      {/* Main Content */}
      <div className="py-16 space-y-24 bg-background">
        <Hero />
        <Features />
        <Pricing />
        <CTA />
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}

export { Header, Hero, Features, Pricing, CTA, Footer };
