import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TenantProvider } from '@/contexts/TenantContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import QueryProvider from '@/providers/QueryProvider';
import { SessionProvider } from '@/providers/SessionProvider';
import { ClarityProvider } from '@/providers/ClarityProvider';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { pickMessages, GLOBAL_NAMESPACES } from '@/lib/pick-messages';
import { DevTenantLoader } from '@/components/DevTenantLoader';
import { OrganizationSchema } from '@/components/seo/OrganizationSchema';
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
  alternates: {
    canonical: SITE_URL,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const allMessages = await getMessages();
  const messages = pickMessages(allMessages as Record<string, unknown>, GLOBAL_NAMESPACES);

  return (
    <html lang="en">
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
        </NextIntlClientProvider>
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
