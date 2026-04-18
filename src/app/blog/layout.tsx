import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Header, Footer } from '@/components/landing';
import { buildSeoMetadata } from '@/lib/seo-metadata';

/**
 * /blog — marketing-site blog. The list page + each post are server-
 * rendered for SEO; Header / Footer come from the landing components so
 * the chrome stays consistent with the rest of the public site.
 *
 * Metadata default for the index; each [slug] page overrides with its
 * own title / description / Article schema / per-post OG image.
 */
export function generateMetadata(): Promise<Metadata> {
  return buildSeoMetadata({ namespace: 'seo.blog', path: '/blog' });
}

export default async function BlogLayout({ children }: { children: React.ReactNode }) {
  const messages = await getMessages();
  return (
    <NextIntlClientProvider messages={messages}>
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </NextIntlClientProvider>
  );
}
