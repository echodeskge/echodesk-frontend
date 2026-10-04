import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { SalonHeader } from '@/components/public-booking/salon-header';
import { SalonProvider } from '@/components/public-booking/salon-context';
import { bookingApiBase, isValidSalonSlug, type SalonInfo } from '@/lib/booking-api';

type Params = Promise<{ salon: string }>;

type SalonLookup = { status: 'ok'; info: SalonInfo } | { status: 'missing' } | { status: 'unavailable' };

/**
 * Who this booking page is for. The API answers 404 when the tenant doesn't
 * exist, doesn't have the booking feature, or switched its public page off —
 * all of which mean "no booking page here". Anything else (API down, slow,
 * mid-deploy) is "temporarily unavailable", not "this link is wrong".
 *
 * Not cached: the business edits this in its dashboard and expects the page
 * to show the change on the next load.
 */
async function fetchSalonInfo(salon: string): Promise<SalonLookup> {
  if (!isValidSalonSlug(salon)) return { status: 'missing' };
  try {
    const response = await fetch(`${bookingApiBase(salon)}/api/bookings/client/info/`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (response.status === 404) return { status: 'missing' };
    if (!response.ok) return { status: 'unavailable' };
    return { status: 'ok', info: (await response.json()) as SalonInfo };
  } catch {
    return { status: 'unavailable' };
  }
}

function bookingSiteUrl(salon: string): string {
  const mainDomain = process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'echodesk.ge';
  return `https://book.${mainDomain}/${salon}`;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { salon } = await params;
  const t = await getTranslations('publicBooking');
  const lookup = await fetchSalonInfo(salon);
  if (lookup.status !== 'ok') {
    return { title: { absolute: t('home.title') }, robots: { index: false }, manifest: null };
  }

  const { info } = lookup;
  const locale = await getLocale();
  const title = t('meta.title', { name: info.name });
  const description =
    info.description?.[locale] || info.description?.ka || info.description?.en || t('meta.description', { name: info.name });
  const url = bookingSiteUrl(salon);

  return {
    // `absolute`: this is the salon's page, not "… | EchoDesk"
    title: { absolute: title },
    description,
    // The root layout's canonical/manifest/OG point at the EchoDesk marketing
    // site; a salon's page must describe itself.
    alternates: { canonical: url },
    manifest: null,
    openGraph: {
      type: 'website',
      url,
      siteName: info.name,
      title,
      description,
      locale: locale === 'ka' ? 'ka_GE' : 'en_US',
      images: info.logo ? [{ url: info.logo, alt: info.name }] : undefined,
    },
    twitter: { card: 'summary', title, description, images: info.logo ? [info.logo] : undefined },
    icons: info.logo ? { icon: info.logo, apple: info.logo } : undefined,
    appleWebApp: { title: info.name },
  };
}

export default async function SalonLayout({ children, params }: { children: React.ReactNode; params: Params }) {
  const { salon } = await params;
  const lookup = await fetchSalonInfo(salon);
  if (lookup.status === 'missing') notFound();

  if (lookup.status === 'unavailable') {
    const t = await getTranslations('publicBooking');
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
        <h1 className="text-2xl font-semibold">{t('unavailable.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('unavailable.description')}</p>
      </main>
    );
  }

  return (
    <SalonProvider salon={salon} info={lookup.info}>
      <SalonHeader />
      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
    </SalonProvider>
  );
}
