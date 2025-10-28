'use client';

import { useEffect } from 'react';

/**
 * Client component that loads the devTenant utilities in development mode
 * This makes the utilities available globally via window.devTenant
 */
export function DevTenantLoader() {
  useEffect(() => {
    // Dynamically import the devTenant utilities
    // This will run the side effects that attach it to window
    if (process.env.NODE_ENV === 'development') {
      import('@/utils/devTenant');
    }
  }, []);

  return null;
}
