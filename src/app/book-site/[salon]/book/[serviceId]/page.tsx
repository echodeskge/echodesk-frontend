import { BookingWizard } from '@/components/public-booking/booking-wizard';

export default async function BookServicePage({ params }: { params: Promise<{ serviceId: string }> }) {
  const { serviceId } = await params;
  return <BookingWizard serviceId={serviceId} />;
}
