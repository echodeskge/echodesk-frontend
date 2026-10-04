import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ManageBooking } from '@/components/public-booking/manage-booking';

// A booking's private link: never index it.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function ManageBookingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <Suspense>
      <ManageBooking token={token} />
    </Suspense>
  );
}
