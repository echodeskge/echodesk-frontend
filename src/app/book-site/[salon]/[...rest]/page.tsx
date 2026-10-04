import { notFound } from 'next/navigation';

/** Any unknown path under a salon → the booking site's own not-found page. */
export default function UnknownBookingPath() {
  notFound();
}
