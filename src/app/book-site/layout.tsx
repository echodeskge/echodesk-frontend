import type { Metadata, Viewport } from 'next';
import { getTranslations } from 'next-intl/server';
import { Geist } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { Toaster } from 'sonner';
import { pickMessages } from '@/lib/pick-messages';
import '../globals.css';

/**
 * Public booking site — book.echodesk.ge/<salon>.
 *
 * Used by tenants' customers, not by staff, so it has its own minimal shell:
 * no dashboard auth / tenant / subscription providers, no analytics. The root
 * layout returns children untouched for /book-site (see src/app/layout.tsx),
 * which is what lets this layout own <html>/<body>. middleware.ts rewrites
 * the booking host's paths into this tree.
 */
const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('publicBooking');
  return {
    title: { absolute: t('home.title') },
    // Not the EchoDesk dashboard's PWA manifest
    manifest: null,
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'light',
};

export default async function BookSiteLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = pickMessages((await getMessages()) as Record<string, unknown>, ['publicBooking']);

  return (
    <html lang={locale}>
      <body className={`${geistSans.variable} min-h-screen bg-muted/40 text-foreground antialiased`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
