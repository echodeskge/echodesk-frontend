/**
 * Shared helpers for the leave redesign tests (LV-00..04).
 * `messages`: en/ka catalogs with every src/i18n/pending/lv-*.json merged in
 * (the integrator merges them into the catalogs later).
 */
import React from "react"
import fs from "node:fs"
import path from "node:path"
import { render } from "@testing-library/react"
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
  ? fs.readdirSync(PENDING_DIR).filter((f) => /^lv-.*\.json$/.test(f)).sort()
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

export function renderLeave(ui: React.ReactElement, locale: "en" | "ka" = "en") {
  return render(
    <HeaderActionsProvider>
      <HeaderOutlet />
      <NextIntlClientProvider locale={locale} messages={messages[locale]} timeZone="UTC">
        {ui}
      </NextIntlClientProvider>
    </HeaderActionsProvider>
  )
}
