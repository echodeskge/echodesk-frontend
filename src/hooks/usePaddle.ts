'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

declare global {
  interface Window {
    Paddle?: {
      Environment: { set: (env: string) => void };
      Initialize: (options: { token: string }) => void;
      Checkout: {
        open: (options: {
          transactionId: string;
          settings?: {
            successUrl?: string;
            displayMode?: 'overlay' | 'inline';
            theme?: 'light' | 'dark';
            locale?: string;
          };
        }) => void;
      };
    };
  }
}

interface UsePaddleOptions {
  environment?: string;
  clientToken?: string;
}

interface OpenCheckoutOptions {
  transactionId: string;
  successUrl?: string;
  locale?: string;
}

export function usePaddle(options?: UsePaddleOptions) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const initializedRef = useRef(false);

  const environment = options?.environment || process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT || 'sandbox';
  const clientToken = options?.clientToken || process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN || '';

  useEffect(() => {
    if (initializedRef.current || !clientToken) return;

    // Check if Paddle is already loaded
    if (window.Paddle) {
      initializedRef.current = true;
      setIsLoaded(true);
      return;
    }

    setIsLoading(true);

    const script = document.createElement('script');
    script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
    script.async = true;

    script.onload = () => {
      if (window.Paddle) {
        window.Paddle.Environment.set(environment);
        window.Paddle.Initialize({ token: clientToken });
        initializedRef.current = true;
        setIsLoaded(true);
      }
      setIsLoading(false);
    };

    script.onerror = () => {
      console.error('Failed to load Paddle.js');
      setIsLoading(false);
    };

    document.head.appendChild(script);

    return () => {
      // Don't remove the script on cleanup — Paddle should persist
    };
  }, [clientToken, environment]);

  const openCheckout = useCallback(
    ({ transactionId, successUrl, locale }: OpenCheckoutOptions) => {
      if (!window.Paddle) {
        console.error('Paddle.js not loaded');
        return;
      }

      window.Paddle.Checkout.open({
        transactionId,
        settings: {
          successUrl,
          displayMode: 'overlay',
          theme: 'light',
          locale: locale || 'en',
        },
      });
    },
    [],
  );

  return {
    isLoaded,
    isLoading,
    openCheckout,
  };
}
