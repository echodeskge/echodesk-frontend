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
  hydrated: boolean; // false until the localStorage read in useEffect has run
  accept: () => void;
  reject: () => void;
  setCategories: (c: Partial<ConsentCategories>) => void;
  openBanner: () => void; // lets Footer "Cookie preferences" link reopen it
}

const STORAGE_KEY = 'echodesk.consent.v1';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 year
const DEFAULT_CATS: ConsentCategories = {
  necessary: true,
  analytics: false,
  marketing: false,
};

/**
 * Derive the eTLD+1 for the current page so a cookie set here is readable
 * from every subdomain. Examples:
 *   echodesk.ge         → .echodesk.ge
 *   amanati.echodesk.ge → .echodesk.ge
 *   localhost           → (no domain attribute — browser scopes to localhost)
 *
 * Keeps the logic simple: take the last two labels. Falls over for ccSLDs
 * like ".co.uk" but we only operate on .ge / .app / .ondigitalocean.app
 * today.
 */
function cookieDomain(): string | null {
  if (typeof window === 'undefined') return null;
  const host = window.location.hostname;
  if (host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return null;
  const parts = host.split('.');
  if (parts.length < 2) return null;
  return `.${parts.slice(-2).join('.')}`;
}

function writeConsentCookie(value: string) {
  if (typeof document === 'undefined') return;
  const parts = [
    `${STORAGE_KEY}=${encodeURIComponent(value)}`,
    `Max-Age=${COOKIE_MAX_AGE_SECONDS}`,
    'Path=/',
    'SameSite=Lax',
  ];
  const domain = cookieDomain();
  if (domain) parts.push(`Domain=${domain}`);
  if (window.location.protocol === 'https:') parts.push('Secure');
  document.cookie = parts.join('; ');
}

function readConsentCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const prefix = `${STORAGE_KEY}=`;
  for (const part of document.cookie.split('; ')) {
    if (part.startsWith(prefix)) {
      try {
        return decodeURIComponent(part.slice(prefix.length));
      } catch {
        return null;
      }
    }
  }
  return null;
}

const ConsentContext = createContext<ConsentState | null>(null);

export function ConsentProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ConsentStatus>('pending');
  const [categories, setCats] = useState<ConsentCategories>(DEFAULT_CATS);
  // Gate rendering of the banner until we've had a chance to hydrate from
  // localStorage — otherwise every refresh flashes the banner on users who
  // already accepted, especially on pages with slow loading states.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Hydrate from cookie first (shared across subdomains), then fall back
    // to localStorage so we don't lose existing users' choices from the
    // previous storage mechanism.
    const applyPayload = (parsed: unknown) => {
      if (!parsed || typeof parsed !== 'object') return;
      const rec = parsed as { status?: ConsentStatus; categories?: Partial<ConsentCategories> };
      if (rec.status && rec.categories) {
        setStatus(rec.status);
        setCats({ necessary: true, analytics: false, marketing: false, ...rec.categories });
      }
    };

    try {
      const cookieRaw = readConsentCookie();
      if (cookieRaw) {
        applyPayload(JSON.parse(cookieRaw));
      } else {
        const lsRaw = window.localStorage.getItem(STORAGE_KEY);
        if (lsRaw) {
          const parsed = JSON.parse(lsRaw);
          applyPayload(parsed);
          // Migrate: promote existing localStorage record to a cross-subdomain cookie.
          writeConsentCookie(lsRaw);
        }
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  const persist = (s: ConsentStatus, c: ConsentCategories) => {
    setStatus(s);
    setCats(c);
    const payload = JSON.stringify({ status: s, categories: c, timestamp: Date.now() });
    // Primary storage is a domain-wide cookie so acceptance carries across
    // subdomains (echodesk.ge ↔ amanati.echodesk.ge). Mirror to localStorage
    // for origins where cookies aren't writable (e.g. preview deployments
    // on different apex domains).
    writeConsentCookie(payload);
    try {
      window.localStorage.setItem(STORAGE_KEY, payload);
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
        hydrated,
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
