'use client';

import { Suspense } from 'react';
import { RegistrationFlow } from '@/components/registration/RegistrationFlow';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function RegistrationPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <RegistrationFlow />
    </Suspense>
  );
}
