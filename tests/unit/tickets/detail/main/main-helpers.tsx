/**
 * Shared helpers for the FE-10 detail main tests.
 *
 * - `mainMessages`: the en/ka catalogs plus the pending FE-09 and FE-10 keys
 *   (FE-INT merges the pending files later).
 * - `presence` / `presenceMock`: the tickets realtime context with spies for
 *   `sendTicketEditing` / `sendTicketEditingStopped`.
 * - `toastMock`: sonner's `toast` (callable, with success / error / info).
 * - `renderMain`: query client + intl provider.
 */
import React from "react";
import { vi } from "vitest";
import { render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import fe10 from "@/i18n/pending/fe-10.json";
import { messages as baseMessages, newClient } from "../helpers";

type Json = Record<string, unknown>;

function deepMerge(base: Json, extra: Json): Json {
  const out: Json = { ...base };
  for (const [k, v] of Object.entries(extra)) {
    const cur = out[k];
    out[k] =
      v && typeof v === "object" && !Array.isArray(v) && cur && typeof cur === "object"
        ? deepMerge(cur as Json, v as Json)
        : v;
  }
  return out;
}

export const mainMessages = {
  en: deepMerge(baseMessages.en, (fe10 as { en: Json }).en),
  ka: deepMerge(baseMessages.ka, (fe10 as { ka: Json }).ka),
};

export const presence = {
  sendTicketEditing: vi.fn(),
  sendTicketEditingStopped: vi.fn(),
};

export const presenceMock = {
  useTicketsRealtime: () => ({
    wsReady: true,
    boardId: 1,
    setBoardId: () => {},
    beingEdited: new Map(),
    beingMoved: new Map(),
    activeUsers: [],
    accessDenied: false,
    subscribe: () => () => {},
    sendTicketMoving: () => {},
    sendTicketEditing: presence.sendTicketEditing,
    sendTicketEditingStopped: presence.sendTicketEditingStopped,
  }),
  useBoardEvents: () => {},
};

export function renderMain(
  ui: React.ReactElement,
  { locale = "en" as "en" | "ka", client = newClient() }: { locale?: "en" | "ka"; client?: QueryClient } = {},
) {
  const utils = render(
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale={locale} messages={mainMessages[locale]} timeZone="Asia/Tbilisi">
        {ui}
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
  return { ...utils, client };
}

/** A File of a given size without allocating it. */
export function fakeFile(name: string, size = 1024, type = "application/octet-stream"): File {
  const file = new File(["x"], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}
