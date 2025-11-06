import { useState, useEffect, useCallback } from 'react';

interface UseOnlineStatusOptions {
  onOnline?: () => void;
  onOffline?: () => void;
}

/**
 * Hook to track online/offline status
 * Detects when user goes offline or comes back online
 */
export function useOnlineStatus({ onOnline, onOffline }: UseOnlineStatusOptions = {}) {
  const [isOnline, setIsOnline] = useState(
    typeof window !== 'undefined' ? navigator.onLine : true
  );
  const [wasOffline, setWasOffline] = useState(false);

  const handleOnline = useCallback(() => {
    console.log('[useOnlineStatus] Connection restored');
    setIsOnline(true);

    // Only trigger callback if we were actually offline before
    if (wasOffline) {
      setWasOffline(false);
      onOnline?.();
    }
  }, [wasOffline, onOnline]);

  const handleOffline = useCallback(() => {
    console.log('[useOnlineStatus] Connection lost');
    setIsOnline(false);
    setWasOffline(true);
    onOffline?.();
  }, [onOffline]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    console.log('[useOnlineStatus] Monitoring connection status. Currently:', isOnline ? 'online' : 'offline');

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline, isOnline]);

  return {
    isOnline,
    wasOffline
  };
}
