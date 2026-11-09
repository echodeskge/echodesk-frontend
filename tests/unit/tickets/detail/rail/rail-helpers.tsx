/**
 * Helpers for the FE-12 rail tests: the catalogs with the pending FE-09 and
 * FE-12 keys merged in (FE-INT merges them later), a render wrapper and
 * fixtures. Axios routing, tickets and permission fixtures come from the
 * FE-09 helpers.
 */
import React from "react";
import { render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { messages as base, newClient } from "../helpers";
import pending from "@/i18n/pending/fe-12.json";

type Json = Record<string, unknown>;

function deepMerge(a: Json, b: Json): Json {
  const out: Json = { ...a };
  for (const [k, v] of Object.entries(b)) {
    const cur = out[k];
    out[k] =
      v && typeof v === "object" && !Array.isArray(v) && cur && typeof cur === "object"
        ? deepMerge(cur as Json, v as Json)
        : v;
  }
  return out;
}

export const railMessages = {
  en: deepMerge(base.en as Json, (pending as { en: Json }).en),
  ka: deepMerge(base.ka as Json, (pending as { ka: Json }).ka),
};

export function renderRail(
  ui: React.ReactElement,
  { locale = "en" as "en" | "ka", client = newClient() }: { locale?: "en" | "ka"; client?: QueryClient } = {},
) {
  const utils = render(
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale={locale} messages={railMessages[locale]} timeZone="Asia/Tbilisi">
        {ui}
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
  return { ...utils, client };
}

export const USERS = [
  { id: 3, email: "agent@demo.ge", first_name: "Levan", last_name: "Maisuradze", full_name: "Levan Maisuradze", is_staff: false, is_active: true },
  { id: 4, email: "nino@demo.ge", first_name: "Nino", last_name: "Beridze", full_name: "Nino Beridze", is_staff: false, is_active: true },
  { id: 5, email: "giorgi@demo.ge", first_name: "Giorgi", last_name: "Kapanadze", full_name: "Giorgi Kapanadze", is_staff: true, is_active: true },
];

export const TAGS = [
  { id: 1, name: "Bug", color: "#ef4444" },
  { id: 2, name: "VIP", color: "#0ea5e9" },
];

export const GROUPS = [
  { id: 6, name: "Support team", description: "" },
  { id: 7, name: "Sales team", description: "" },
];

export const DEPARTMENTS = [
  { id: 20, name: "Billing", description: "" },
  { id: 21, name: "Logistics", description: "" },
];

export const OPEN_BOARD_ACCESS = { id: 1, name: "Support", board_users: [], board_groups: [], order_users: [] };

export const trigger = (row: string) =>
  Array.from(document.querySelectorAll<HTMLElement>('[data-slot="property-row"]'))
    .find((r) => r.firstElementChild?.textContent === row)
    ?.querySelector<HTMLButtonElement>('[data-slot="property-picker-trigger"]') ?? null;

export const rowOf = (label: string) =>
  Array.from(document.querySelectorAll<HTMLElement>('[data-slot="property-row"]')).find(
    (r) => r.firstElementChild?.textContent === label,
  ) ?? null;

export const options = () => Array.from(document.querySelectorAll<HTMLElement>('[data-slot="property-picker-option"]'));
/** Visible option labels (without the screen-reader "selected" suffix). */
export const optionLabels = () =>
  options().map((o) => (o.querySelector(".flex-1") ?? o).textContent?.trim() ?? "");
export const option = (text: string) => options().find((o) => o.textContent?.includes(text)) ?? null;
/** Wait for an option and return it (throws until it renders). */
export function findOption(text: string): HTMLElement {
  const o = option(text);
  if (!o) throw new Error(`option "${text}" not rendered`);
  return o;
}
