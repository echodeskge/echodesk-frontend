/**
 * Shared helpers of the onboarding (ONB-W*) tests: the catalogs with the
 * pending `onb-*.json` files merged in (until the integrator merges them),
 * an intl + react-query render, and a fixture of `GET /api/onboarding/`.
 */
import React, { type ReactNode } from "react"
import fs from "node:fs"
import path from "node:path"
import { render } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import en from "@/i18n/messages/en.json"
import ka from "@/i18n/messages/ka.json"
import type { OnboardingState, OnboardingStep } from "@/app/(tenant)/onboarding/_lib/onboarding-api"

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
const pendingFiles = fs.existsSync(PENDING_DIR) ? fs.readdirSync(PENDING_DIR).filter((f) => /^onb-.*\.json$/.test(f)).sort() : []
const pending = pendingFiles.map((f) => JSON.parse(fs.readFileSync(path.join(PENDING_DIR, f), "utf8")) as { en: Json; ka: Json })

export const messages = {
  en: pending.reduce((acc, p) => deepMerge(acc, p.en ?? {}), en as Json),
  ka: pending.reduce((acc, p) => deepMerge(acc, p.ka ?? {}), ka as Json),
}

export function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } })
}

export function Providers({ children, locale = "en", client }: { children: ReactNode; locale?: "en" | "ka"; client?: QueryClient }) {
  const qc = client ?? makeQueryClient()
  return (
    <QueryClientProvider client={qc}>
      <NextIntlClientProvider locale={locale} messages={messages[locale]} timeZone="UTC">
        {children}
      </NextIntlClientProvider>
    </QueryClientProvider>
  )
}

export function renderOnb(ui: React.ReactElement, options: { locale?: "en" | "ka"; client?: QueryClient } = {}) {
  return render(<Providers {...options}>{ui}</Providers>)
}

export function step(key: string, order: number, extra: Partial<OnboardingStep> = {}): OnboardingStep {
  return {
    key,
    feature_key: key === "workspace" ? null : key,
    order,
    status: "pending",
    answers: {},
    prefill: {},
    context: {},
    completed_at: null,
    ...extra,
  }
}

export function state(steps: OnboardingStep[], extra: Partial<OnboardingState> = {}): OnboardingState {
  const pending = steps.filter((s) => s.status === "pending").length
  return {
    industry: null,
    started_at: null,
    finished_at: null,
    pending_count: pending,
    total: steps.length,
    steps,
    ...extra,
  }
}

export const ADMIN = { loaded: true, isSuperuser: false, isStaff: true, has: () => false }
export const SETTINGS_ADMIN = { loaded: true, isSuperuser: false, isStaff: false, has: (c: string) => c === "manage_settings" }
export const AGENT = { loaded: true, isSuperuser: false, isStaff: false, has: () => false }
