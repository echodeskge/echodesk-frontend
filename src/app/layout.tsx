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
import { ogImage } from '@/lib/og';
import { Toaster } from 'sonner';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  `https://${process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'echodesk.ge'}`;

const DEFAULT_OG = ogImage({
  title: 'CRM billed in GEL',
  subtitle: 'Tickets · WhatsApp · SIP · email — Georgian-hosted',
  tag: 'CRM',
});

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
    default: 'EchoDesk — CRM billed in GEL for Georgian businesses',
    template: '%s | EchoDesk',
  },
  description:
    'All-in-one CRM with WhatsApp, email, Messenger, Instagram, SIP calling, and tickets — billed in Georgian Lari and hosted in Georgia.',
  applicationName: 'EchoDesk',
  authors: [{ name: 'EchoDesk', url: SITE_URL }],
  generator: 'Next.js',
  keywords: [
    'CRM Georgia',
    'CRM საქართველო',
    'WhatsApp CRM',
    'helpdesk Georgia',
    'SIP PBX CRM',
    'GEL billing',
    'Tbilisi CRM',
  ],
  openGraph: {
    type: 'website',
    siteName: 'EchoDesk',
    locale: 'ka_GE',
    alternateLocale: ['en_US'],
    url: SITE_URL,
    images: [
      {
        url: DEFAULT_OG,
        width: 1200,
        height: 630,
        alt: 'EchoDesk — CRM billed in GEL',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@echodesk',
    creator: '@echodesk',
    images: [DEFAULT_OG],
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
