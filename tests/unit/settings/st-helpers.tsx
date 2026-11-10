/**
 * Shared helpers for the settings redesign tests (ST-00..05).
 * `messages`: the en/ka catalogs plus any src/i18n/pending/st-*.json still
 * waiting to be merged by the integration.
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
export const pendingFiles = fs.existsSync(PENDING_DIR)
  ? fs.readdirSync(PENDING_DIR).filter((f) => /^st-.*\.json$/.test(f)).sort()
  : []
export const pending = Object.fromEntries(
  pendingFiles.map((f) => [f.replace(/\.json$/, ""), JSON.parse(fs.readFileSync(path.join(PENDING_DIR, f), "utf8")) as { en: Json; ka: Json }])
)

export const messages = {
  en: Object.values(pending).reduce((acc, p) => deepMerge(acc, p.en ?? {}), en as Json),
  ka: Object.values(pending).reduce((acc, p) => deepMerge(acc, p.ka ?? {}), ka as Json),
}

/** `a.b.c` lookup in a catalog (undefined when missing). */
export function lookup(cat: unknown, key: string): unknown {
  return key.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Json)[k] : undefined), cat)
}

/** Flat `key -> string` of a nested catalog part. */
export function flatten(obj: Json, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === "object" && !Array.isArray(v)) Object.assign(out, flatten(v as Json, key))
    else if (typeof v === "string") out[key] = v
  }
  return out
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

export function renderSt(ui: React.ReactElement, locale: "en" | "ka" = "en") {
  return render(
    <HeaderActionsProvider>
      <HeaderOutlet />
      <NextIntlClientProvider locale={locale} messages={messages[locale]} timeZone="UTC">
        {ui}
      </NextIntlClientProvider>
    </HeaderActionsProvider>
  )
}
