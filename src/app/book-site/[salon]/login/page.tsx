import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginForm } from '@/components/public-booking/auth-forms';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function Page() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
