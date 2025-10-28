'use client';

import { Hero } from './Hero';
import { Features } from './Features';
import { Pricing } from './Pricing';
import { CTA } from './CTA';
import { Footer } from './Footer';

export function EchoDeskLanding() {
  return (
    <div className="min-h-screen">
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

export { Hero, Features, Pricing, CTA, Footer };
