import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { SalonHeader } from '@/components/public-booking/salon-header';
import { SalonProvider } from '@/components/public-booking/salon-context';
import { bookingApiBase, isValidSalonSlug, type SalonInfo } from '@/lib/booking-api';

type Params = Promise<{ salon: string }>;

/**
 * Who this booking page is for. The API answers 404 when the tenant doesn't
 * exist, doesn't have the booking feature, or switched its public page off —
 * all of which mean "no booking page here".
 */
async function fetchSalonInfo(salon: string): Promise<SalonInfo | null> {
  if (!isValidSalonSlug(salon)) return null;
  try {
    const response = await fetch(`${bookingApiBase(salon)}/api/bookings/client/info/`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 60 },
    });
    if (!response.ok) return null;
    return (await response.json()) as SalonInfo;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { salon } = await params;
  const info = await fetchSalonInfo(salon);
  if (!info) return { title: 'Online booking', robots: { index: false } };
  const t = await getTranslations('publicBooking');
  const title = t('meta.title', { name: info.name });
  const description = info.description?.ka || info.description?.en || t('meta.description', { name: info.name });
  return {
    title,
    description,
    openGraph: { title, description, images: info.logo ? [info.logo] : undefined },
    icons: info.logo ? { icon: info.logo } : undefined,
  };
}

export default async function SalonLayout({ children, params }: { children: React.ReactNode; params: Params }) {
  const { salon } = await params;
  const info = await fetchSalonInfo(salon);
  if (!info) notFound();

  return (
    <SalonProvider salon={salon} info={info}>
      <SalonHeader />
      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
    </SalonProvider>
  );
}
