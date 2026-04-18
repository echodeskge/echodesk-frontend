'use client';

import { createContext, createElement, useContext, useEffect, useState, type ReactNode } from 'react';

export type ConsentStatus = 'pending' | 'accepted' | 'rejected' | 'custom';

export interface ConsentCategories {
  necessary: true; // always true, locked
  analytics: boolean; // GA4, Clarity
  marketing: boolean; // future: Meta Pixel, TikTok Pixel
}

interface ConsentState {
  status: ConsentStatus;
  categories: ConsentCategories;
  accept: () => void;
  reject: () => void;
  setCategories: (c: Partial<ConsentCategories>) => void;
  openBanner: () => void; // lets Footer "Cookie preferences" link reopen it
}

const LOCALSTORAGE_KEY = 'echodesk.consent.v1';
const DEFAULT_CATS: ConsentCategories = {
  necessary: true,
  analytics: false,
  marketing: false,
};

const ConsentContext = createContext<ConsentState | null>(null);

export function ConsentProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ConsentStatus>('pending');
  const [categories, setCats] = useState<ConsentCategories>(DEFAULT_CATS);

  useEffect(() => {
    // Hydrate from localStorage
    try {
      const raw = window.localStorage.getItem(LOCALSTORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.status && parsed?.categories) {
          setStatus(parsed.status);
          setCats({ necessary: true, ...parsed.categories });
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  const persist = (s: ConsentStatus, c: ConsentCategories) => {
    setStatus(s);
    setCats(c);
    try {
      window.localStorage.setItem(
        LOCALSTORAGE_KEY,
        JSON.stringify({ status: s, categories: c, timestamp: Date.now() })
      );
    } catch {
      /* ignore */
    }
  };

  const accept = () =>
    persist('accepted', { necessary: true, analytics: true, marketing: true });

  const reject = () =>
    persist('rejected', { necessary: true, analytics: false, marketing: false });

  const setCategories = (partial: Partial<ConsentCategories>) =>
    persist('custom', { ...categories, ...partial, necessary: true });

  const openBanner = () => setStatus('pending');

  return createElement(
    ConsentContext.Provider,
    {
      value: {
        status,
        categories,
        accept,
        reject,
        setCategories,
        openBanner,
      },
    },
    children
  );
}

export function useConsent(): ConsentState {
  const ctx = useContext(ConsentContext);
  if (!ctx) throw new Error('useConsent must be used within <ConsentProvider>');
  return ctx;
}
