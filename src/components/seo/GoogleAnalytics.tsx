'use client';

import Script from 'next/script';
import { useConsent } from '@/lib/consent';

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-87DEFJBR82';

/**
 * Loads the Google Analytics (GA4) tag, gated on analytics consent.
 *
 * Uses `next/script` with strategy="afterInteractive" so the gtag loader
 * is deferred until after the browser has parsed and hydrated the page —
 * GA doesn't block first paint, Lighthouse performance scores stay
 * intact, and the tag still fires on every route change because Next's
 * Script component re-runs its inline config on client navigation.
 *
 * Returns `null` until the user explicitly grants analytics consent via
 * the cookie banner (or had previously accepted it — persisted in
 * localStorage).
 */
export function GoogleAnalytics() {
  const { categories } = useConsent();

  if (!GA_ID) return null;
  if (!categories.analytics) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="gtag-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('consent', 'default', {'analytics_storage':'granted','ad_storage':'denied'});
          gtag('config', '${GA_ID}');
        `}
      </Script>
    </>
  );
}
