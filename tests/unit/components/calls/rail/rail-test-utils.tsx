/**
 * Shared fixtures for the call-rail tests: the CL-00 state / actions shapes
 * with sensible defaults, the en / ka catalogs, a matchMedia shim for the
 * `md` breakpoint and a render helper with the intl + react-query providers.
 */
import { vi } from "vitest";
import { render, type RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import React, { type ReactElement } from "react";

import en from "@/i18n/messages/en.json";
import ka from "@/i18n/messages/ka.json";
import type { ActiveCall, CallActionsValue, CallStateValue } from "@/contexts/call-types";

export const enMessages = en;
export const kaMessages = ka;
export const railEn = en.calls.rail;
export const railKa = ka.calls.rail;

export function makeActiveCall(overrides: Partial<ActiveCall> & Record<string, unknown> = {}): ActiveCall {
  return {
    id: "c1",
    sipCallId: "sip-1",
    logId: 7,
    logPending: false,
    number: "+995555123456",
    callerName: "Nino Beridze",
    direction: "incoming",
    status: "active",
    startTime: new Date(Date.now() - 83_000),
    isOnHold: false,
    isMuted: false,
    transferPhase: "idle",
    consultationCall: null,
    answeredElsewhere: false,
    ...overrides,
  };
}

export function makeState(overrides: Partial<CallStateValue> = {}): CallStateValue {
  return {
    activeCall: null,
    sipState: "registered",
    activeSipConfig: { username: "101" } as CallStateValue["activeSipConfig"],
    dialNumber: "",
    error: null,
    loading: false,
    rail: { mode: "open", prefill: null, autoDial: false },
    callEndedCounter: 0,
    missedCall: null,
    busyRejected: null,
    answeredElsewhereNotice: null,
    soundBlocked: false,
    ...overrides,
  };
}

export function makeActions(overrides: Partial<CallActionsValue> = {}): CallActionsValue {
  const resolved = () => vi.fn().mockResolvedValue(undefined);
  return {
    setDialNumber: vi.fn(),
    makeCall: resolved(),
    acceptCall: resolved(),
    rejectCall: resolved(),
    endCall: resolved(),
    toggleHold: resolved(),
    toggleMute: vi.fn(),
    sendDTMF: vi.fn(() => true),
    transferCall: resolved(),
    startAttendedTransfer: resolved(),
    completeTransfer: resolved(),
    cancelTransfer: resolved(),
    mergeConference: resolved(),
    openRail: vi.fn(),
    closeRail: vi.fn(),
    minimiseRail: vi.fn(),
    reconnect: resolved(),
    clearMissedCall: vi.fn(),
    clearError: vi.fn(),
    unlockSound: vi.fn(),
    ...overrides,
  };
}

/** jsdom has no matchMedia; `useIsMobile` needs it plus `innerWidth` (md = 768). */
export function installMatchMedia(width: number) {
  Object.defineProperty(window, "innerWidth", { value: width, configurable: true, writable: true });
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => {
      const max = /max-width:\s*(\d+)px/.exec(query);
      const min = /min-width:\s*(\d+)px/.exec(query);
      const matches = max ? width <= Number(max[1]) : min ? width >= Number(min[1]) : false;
      return {
        matches,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };
    }),
  });
}

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, retryDelay: 0, gcTime: 0 }, mutations: { retry: false } },
  });
}

export function renderWithProviders(
  ui: ReactElement,
  { locale = "en", messages = enMessages as Record<string, unknown>, queryClient = makeQueryClient(), ...options }: RenderOptions & {
    locale?: string;
    messages?: Record<string, unknown>;
    queryClient?: QueryClient;
  } = {}
) {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale={locale} messages={messages}>
        {children}
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
  return { ...render(ui, { wrapper, ...options }), queryClient };
}
