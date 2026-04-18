import Script from 'next/script';

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-87DEFJBR82';

/**
 * Loads the Google Analytics (GA4) tag.
 *
 * Uses `next/script` with strategy="afterInteractive" so the gtag loader
 * is deferred until after the browser has parsed and hydrated the page —
 * GA doesn't block first paint, Lighthouse performance scores stay
 * intact, and the tag still fires on every route change because Next's
 * Script component re-runs its inline config on client navigation.
 *
 * The GA measurement ID is public (it appears in the rendered HTML), but
 * we still read it from an env var so dev/staging can be pointed at a
 * separate property without a code change.
 */
export function GoogleAnalytics() {
  if (!GA_ID) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}');
        `}
      </Script>
    </>
  );
}
