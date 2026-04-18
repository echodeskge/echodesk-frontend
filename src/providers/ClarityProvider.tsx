'use client';

import { useEffect, useRef } from 'react';
import Clarity from '@microsoft/clarity';
import { useAuth } from '@/contexts/AuthContext';
import { useConsent } from '@/lib/consent';

const CLARITY_PROJECT_ID = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID || 'u70lkaxt6k';

export function ClarityProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { categories } = useConsent();
  const initializedRef = useRef(false);

  // Initialize Clarity only when analytics consent is granted.
  // Clarity does not expose a clean teardown, so once initialized it
  // stays for the rest of the session; revoking consent mid-session
  // will prevent future re-inits only.
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      CLARITY_PROJECT_ID &&
      categories.analytics &&
      !initializedRef.current
    ) {
      Clarity.init(CLARITY_PROJECT_ID);
      initializedRef.current = true;
    }
  }, [categories.analytics]);

  // Identify user when authenticated (only if Clarity is live)
  useEffect(() => {
    if (!initializedRef.current) return;
    if (user && typeof window !== 'undefined') {
      // Identify user for better session tracking
      // Clarity will hash the custom-id on client before sending
      Clarity.identify(
        String(user.id), // custom-id (required)
        undefined, // custom-session-id (optional)
        undefined, // custom-page-id (optional)
        user.email || `${user.first_name} ${user.last_name}`.trim() // friendly-name (optional)
      );

      // Set custom tags for filtering
      if (user.email) {
        Clarity.setTag('user_email', user.email);
      }
      if (user.first_name) {
        Clarity.setTag('user_name', `${user.first_name} ${user.last_name || ''}`.trim());
      }
      if (user.is_staff) {
        Clarity.setTag('is_staff', 'true');
      }
      if (user.is_superuser) {
        Clarity.setTag('is_superuser', 'true');
      }
    }
  }, [user, categories.analytics]);

  return <>{children}</>;
}
