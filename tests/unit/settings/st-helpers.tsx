/**
 * Shared helpers for the settings redesign tests (ST-00..05).
 * `messages`: the en/ka catalogs plus any src/i18n/pending/st-*.json still
 * waiting to be merged by the integration.
 * `pending[pkg]`: a package's keys. Before integration it is the pending file;
 * after it, the same keys (fixtures/st-pending-keys.json) read back from the
 * merged catalogs, so the package i18n tests keep checking the real catalogs.
 */
import React from "react"
import fs from "node:fs"
import path from "node:path"
import { render } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import en from "@/i18n/messages/en.json"
import ka from "@/i18n/messages/ka.json"
import { HeaderActionsProvider, useHeaderSlot } from "@/contexts/HeaderActionsContext"
import pendingKeys from "./fixtures/st-pending-keys.json"

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
const fromFiles = Object.fromEntries(
  pendingFiles.map((f) => [f.replace(/\.json$/, ""), JSON.parse(fs.readFileSync(path.join(PENDING_DIR, f), "utf8")) as { en: Json; ka: Json }])
)

/** Rebuild a nested catalog part holding only `keys`, read from `cat` (missing keys stay missing). */
function pick(cat: Json, keys: string[]): Json {
  const out: Json = {}
  for (const key of keys) {
    const value = key.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Json)[k] : undefined), cat)
    if (value === undefined) continue
    const parts = key.split(".")
    let node = out
    for (const part of parts.slice(0, -1)) node = (node[part] ??= {}) as Json
    node[parts[parts.length - 1]] = value
  }
  return out
}

const fromCatalogs = Object.fromEntries(
  Object.entries(pendingKeys as Record<string, { en: string[]; ka: string[] }>)
    .filter(([pkg]) => !(pkg in fromFiles))
    .map(([pkg, k]) => [pkg, { en: pick(en as Json, k.en), ka: pick(ka as Json, k.ka) }])
)

export const pending: Record<string, { en: Json; ka: Json }> = { ...fromCatalogs, ...fromFiles }

export const messages = {
  en: Object.values(fromFiles).reduce((acc, p) => deepMerge(acc, p.en ?? {}), en as Json),
  ka: Object.values(fromFiles).reduce((acc, p) => deepMerge(acc, p.ka ?? {}), ka as Json),
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
