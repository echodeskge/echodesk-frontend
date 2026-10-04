import type { Metadata } from 'next';
import { Suspense } from 'react';
import { RegisterForm } from '@/components/public-booking/auth-forms';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function Page() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
