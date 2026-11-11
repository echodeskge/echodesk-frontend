/**
 * Shared helpers for the bookings redesign tests (BKG-00..03).
 * `messages`: the en/ka catalogs with every src/i18n/pending/bkg-*.json merged in
 * (the integrator merges them into the catalogs later).
 */
import React from "react"
import fs from "node:fs"
import path from "node:path"
import { render } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { NextIntlClientProvider } from "next-intl"
import en from "@/i18n/messages/en.json"
import ka from "@/i18n/messages/ka.json"
import { HeaderActionsProvider, useHeaderSlot } from "@/contexts/HeaderActionsContext"

type Json = Record<string, unknown>

function deepMerge(base: Json, extra: Json): Json {
  const out: Json = { ...base }
  for (const [k, v] of Object.entries(extra)) {
    const cur = out[k]
    out[k] =
      v && typeof v === "object" && !Array.isArray(v) && cur && typeof cur === "object"
        ? deepMerge(cur as Json, v as Json)
        : v
  }
  return out
}

const PENDING_DIR = path.resolve(__dirname, "../../../src/i18n/pending")
const pendingFiles = fs.existsSync(PENDING_DIR)
  ? fs.readdirSync(PENDING_DIR).filter((f) => /^bkg-.*\.json$/.test(f)).sort()
  : []
const pending = pendingFiles.map((f) => JSON.parse(fs.readFileSync(path.join(PENDING_DIR, f), "utf8")) as { en: Json; ka: Json })

export const messages = {
  en: pending.reduce((acc, p) => deepMerge(acc, p.en ?? {}), en as Json),
  ka: pending.reduce((acc, p) => deepMerge(acc, p.ka ?? {}), ka as Json),
}

/** Tenant header stand-in: renders the slots outside the intl provider, like the real header. */
export function HeaderOutlet() {
  const slot = useHeaderSlot()
  return (
    <header data-testid="outlet">
      <div data-testid="outlet-breadcrumb">{slot?.breadcrumb}</div>
      <div data-testid="outlet-meta">{slot?.meta}</div>
      <div data-testid="outlet-primary">{slot?.primary}</div>
      <div data-testid="outlet-icons">{slot?.icons}</div>
    </header>
  )
}

/**
 * Renders a bookings page like the tenant layout does: header slots, a React
 * Query client (the business-timezone hook) and the intl provider with the
 * merged catalogs, in UTC.
 */
export function renderBookings(ui: React.ReactElement, locale: "en" | "ka" = "en", client?: QueryClient) {
  const qc = client ?? new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <HeaderActionsProvider>
      <HeaderOutlet />
      <QueryClientProvider client={qc}>
        <NextIntlClientProvider locale={locale} messages={messages[locale]} timeZone="UTC">
          {ui}
        </NextIntlClientProvider>
      </QueryClientProvider>
    </HeaderActionsProvider>
  )
}

/** Flat "a.b.c" -> string map of a catalog subtree. */
export function flatten(node: unknown, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {}
  if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node as Json)) {
      const key = prefix ? `${prefix}.${k}` : k
      if (typeof v === "string") out[key] = v
      else Object.assign(out, flatten(v, key))
    }
  }
  return out
}

/** A `BookingRow` as `bookings/rows/` returns it. */
export function makeRow(id: number, over: Record<string, unknown> = {}) {
  return {
    id,
    booking_number: `BK-${1050 + id}`,
    client: { id: 100 + id, full_name: `Client ${id}`, phone_number: `+99559300000${id}`, email: `c${id}@example.com` },
    service: { id: 7, name_display: "Whitening", duration_minutes: 60 },
    staff: id % 2 === 0 ? { id: 3, user_id: 30, full_name: "Nino Beridze", profile_image: "" } : null,
    date: "2026-11-10",
    start_time: "09:00:00",
    end_time: "10:00:00",
    status: "pending",
    payment_status: "pending",
    payment_method: "cash",
    total_amount: "350.00",
    deposit_amount: "0.00",
    paid_amount: "0.00",
    client_notes: "",
    created_at: "2026-11-06T09:02:00Z",
    ...over,
  }
}

/** A `BookingDetail` as `bookings/{id}/` returns it. */
export function makeDetail(over: Record<string, unknown> = {}) {
  return {
    id: 4,
    booking_number: "BK-1054",
    client: { id: 104, email: "salome.j@gmail.com", phone_number: "+995593441007", first_name: "Salome", last_name: "Japaridze", full_name: "Salome Japaridze", is_verified: true, is_booking_enabled: true, created_at: "2026-10-01T00:00:00Z" },
    service: { id: 7, name: { en: "Whitening", ka: "გათეთრება" }, name_display: "Whitening", duration_minutes: 60, base_price: "350.00", category: null, staff_members: [], description_display: "", deposit_amount: 0 },
    staff: null,
    date: "2026-11-10",
    start_time: "09:00:00",
    end_time: "10:00:00",
    status: "pending",
    payment_status: "pending",
    payment_method: "cash",
    total_amount: "350.00",
    deposit_amount: "0.00",
    paid_amount: "0.00",
    remaining_amount: 350,
    bog_order_id: "",
    payment_url: "",
    client_notes: "",
    staff_notes: "",
    contact_email: "",
    rating: null,
    review: "",
    cancelled_at: null,
    cancelled_by: "",
    cancellation_reason: "",
    created_at: "2026-11-06T09:02:00Z",
    updated_at: "2026-11-06T09:02:00Z",
    confirmed_at: null,
    completed_at: null,
    manual_payments: [],
    ...over,
  }
}
