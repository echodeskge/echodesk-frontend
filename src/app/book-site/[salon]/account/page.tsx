import type { Metadata } from 'next';
import { AccountBookings } from '@/components/public-booking/account-bookings';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AccountPage() {
  return <AccountBookings />;
}
