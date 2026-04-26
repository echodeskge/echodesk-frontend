import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from 'next/headers';
import "./globals.css";
import { TenantProvider } from '@/contexts/TenantContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import QueryProvider from '@/providers/QueryProvider';
import { SessionProvider } from '@/providers/SessionProvider';
import { ClarityProvider } from '@/providers/ClarityProvider';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getLocale } from 'next-intl/server';
import { pickMessages, GLOBAL_NAMESPACES } from '@/lib/pick-messages';
import { DevTenantLoader } from '@/components/DevTenantLoader';
import { OrganizationSchema } from '@/components/seo/OrganizationSchema';
import { GoogleAnalytics } from '@/components/seo/GoogleAnalytics';
import { ConsentProvider } from '@/lib/consent';
import { CookieConsent } from '@/components/cookie-consent/CookieConsent';
import { Toaster } from 'sonner';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  `https://${process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'echodesk.ge'}`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'EchoDesk — Run your whole business from one place',
    template: '%s | EchoDesk',
  },
  description:
    'Run your whole business from one platform: WhatsApp, Messenger, Instagram, email, SIP calls, tickets, invoices, bookings, and leave management — built for Georgian teams.',
  applicationName: 'EchoDesk',
  authors: [{ name: 'EchoDesk', url: SITE_URL }],
  generator: 'Next.js',
  keywords: [
    'all-in-one business software',
    'WhatsApp helpdesk',
    'omnichannel CRM',
    'invoicing Georgia',
    'booking software',
    'HR Georgia',
    'leave management',
    'SIP PBX',
    'Kommo alternative',
    'Tbilisi CRM',
  ],
  // openGraph + twitter intentionally NOT set here — the same fields are
  // hardcoded in the layout's <head> JSX below so they flush in the
  // initial head chunk for chat-app link unfurlers (which don't run JS
  // and don't see Next.js's late metadata-API injection). Letting the
  // metadata API ALSO emit them produced duplicates that some scrapers
  // flagged as ambiguous. Per-page generateMetadata can still set its
  // own openGraph / twitter — those override at the body level for
  // browsers (which run React 19 and hoist meta tags into <head>).
  // Kills the "Missing fb:app_id" warning in Facebook's sharing debugger
  // and unlocks per-share analytics in the Facebook app dashboard.
  facebook: {
    appId: '649149741547110',
  },
  alternates: {
    canonical: SITE_URL,
    // No `languages` map — we don't have distinct per-language URLs
    // (locale is served via the NEXT_LOCALE cookie, same path). Pointing
    // hreflang at /en or /ka triggered Google to crawl 404s, so the only
    // honest signal is the canonical URL plus <html lang>.
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  manifest: '/manifest.json',
  // Tells iOS to treat the PWA as a standalone web app and use the
  // light bar colour from the theme — only takes effect when the user
  // has saved the site to their home screen.
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'EchoDesk',
  },
  // formatDetection avoids iOS auto-linking phone numbers / addresses
  // in arbitrary text — we surface those intentionally on landing pages.
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  // Microsoft tile (Windows pinned-site icon). Falls back to the green-E
  // icon endpoint Next.js generates from src/app/icon.tsx.
  other: {
    'msapplication-TileColor': '#2A2B7D',
    'msapplication-TileImage': '/icon',
  },
};

/**
 * Theme + viewport metadata — Next.js 15 wants these in their own export
 * (separate from `metadata`) so the static optimizer can resolve them
 * without rendering the full <Metadata>.
 */
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#2A2B7D' },
    { media: '(prefers-color-scheme: dark)', color: '#0d0e3a' },
  ],
  colorScheme: 'light dark',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Widget embed routes render inside a cross-origin iframe on tenant
  // websites. They must NOT pull in i18n / consent / Clarity / Sentry /
  // tenant context — those providers add >200 KB, multi-count Clarity
  // sessions, and assume a tenant is in scope. We bypass the whole tree
  // here and let src/app/widget/embed/layout.tsx own its own <html>/<body>.
  //
  // We rely on the `x-pathname` header set by middleware.ts because
  // Next.js doesn't yet expose the current URL to server layouts directly.
  const hdrs = await headers();
  const pathname = hdrs.get('x-pathname') || '';
  if (pathname.startsWith('/widget/embed')) {
    return <>{children}</>;
  }

  const allMessages = await getMessages();
  const messages = pickMessages(allMessages as Record<string, unknown>, GLOBAL_NAMESPACES);
  const locale = await getLocale();

  // Site-level OG/Twitter fallback rendered directly in <head> JSX so it
  // flushes in the FIRST head chunk (~5KB) instead of being injected
  // mid-stream by the metadata API. React 19 hoists late <meta> tags to
  // <head> in the browser, but link-unfurler crawlers (Slack, iMessage,
  // Telegram, FB Messenger, WhatsApp) parse static HTML and never see the
  // hoisted version. Page-level generateMetadata still overrides for
  // browsers; scrapers see this baseline.
  const SCRAPER_OG_TITLE = 'EchoDesk — Run your whole business from one place';
  const SCRAPER_OG_DESCRIPTION =
    'All-in-one CRM for Georgian teams: WhatsApp, Messenger, Instagram, email, SIP calls, tickets, invoices, bookings, and leave management.';
  const SCRAPER_OG_IMAGE = `${SITE_URL}/opengraph-image`;

  return (
    <html lang={locale}>
      <head>
        {/* ---- OG / Twitter fallback for link unfurlers ---- */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="EchoDesk" />
        <meta property="og:url" content={SITE_URL} />
        <meta property="og:title" content={SCRAPER_OG_TITLE} />
        <meta property="og:description" content={SCRAPER_OG_DESCRIPTION} />
        <meta property="og:image" content={SCRAPER_OG_IMAGE} />
        <meta property="og:image:secure_url" content={SCRAPER_OG_IMAGE} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:image:alt" content="EchoDesk — run your whole business from one place: social, calls, email, tickets, invoices, bookings, leave management." />
        <meta property="og:locale" content="ka_GE" />
        <meta property="og:locale:alternate" content="en_US" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@echodesk" />
        <meta name="twitter:creator" content="@echodesk" />
        <meta name="twitter:title" content={SCRAPER_OG_TITLE} />
        <meta name="twitter:description" content={SCRAPER_OG_DESCRIPTION} />
        <meta name="twitter:image" content={SCRAPER_OG_IMAGE} />
        <meta name="twitter:image:alt" content="EchoDesk — run your whole business from one place." />
        {/* Preconnect to third-party origins for faster loading */}
        <link rel="preconnect" href="https://www.clarity.ms" />
        <link rel="preconnect" href="https://scripts.clarity.ms" />
        <link rel="preconnect" href="https://v.clarity.ms" />
        <link rel="preconnect" href="https://echodesk-spaces.fra1.digitaloceanspaces.com" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} bg-background`}>
        <OrganizationSchema />
        <DevTenantLoader />
        <NextIntlClientProvider messages={messages}>
          <ConsentProvider>
            <SessionProvider>
              <QueryProvider>
                <TenantProvider>
                  <AuthProvider>
                    <ThemeProvider>
                      <ClarityProvider>
                        <SubscriptionProvider>
                          {children}
                        </SubscriptionProvider>
                      </ClarityProvider>
                    </ThemeProvider>
                  </AuthProvider>
                </TenantProvider>
              </QueryProvider>
            </SessionProvider>
            <GoogleAnalytics />
            <CookieConsent />
          </ConsentProvider>
        </NextIntlClientProvider>
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
