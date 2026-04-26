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
  openGraph: {
    type: 'website',
    siteName: 'EchoDesk',
    locale: 'ka_GE',
    alternateLocale: ['en_US'],
    url: SITE_URL,
    // og:image is injected by Next.js from src/app/opengraph-image.tsx
    // (generated statically at build time).
  },
  twitter: {
    card: 'summary_large_image',
    site: '@echodesk',
    creator: '@echodesk',
  },
  // Kills the "Missing fb:app_id" warning in Facebook's sharing debugger
  // and unlocks per-share analytics in the Facebook app dashboard.
  facebook: {
    appId: '649149741547110',
  },
  alternates: {
    canonical: SITE_URL,
    languages: {
      'en-US': `${SITE_URL}/en`,
      'ka-GE': `${SITE_URL}/ka`,
    },
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

  return (
    <html lang={locale}>
      <head>
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
