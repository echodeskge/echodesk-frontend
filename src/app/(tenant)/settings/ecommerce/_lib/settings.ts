/**
 * Pure helpers of the e-commerce settings page (EC-04). Behaviour is moved
 * here unchanged from the page so it can be unit tested.
 */
import type { Tone } from "@/components/redesign/tones"

export type PaymentProvider = "bog" | "tbc" | "flitt" | "paddle" | "cash"

export const CARD_PROVIDERS: PaymentProvider[] = ["bog", "tbc", "flitt", "paddle"]

/** The legacy boolean flags the API still stores next to `active_payment_providers`. */
export function legacyPaymentFlags(active: PaymentProvider[]): {
  enable_card_payment: boolean
  enable_cash_on_delivery: boolean
} {
  return {
    enable_card_payment: active.some((p) => CARD_PROVIDERS.includes(p)),
    enable_cash_on_delivery: active.includes("cash"),
  }
}

/** Adds or removes a provider (keeps the order of the others). */
export function toggleProviderList(active: PaymentProvider[], provider: PaymentProvider): PaymentProvider[] {
  return active.includes(provider) ? active.filter((p) => p !== provider) : [...active, provider]
}

/**
 * Microsoft Clarity field: accepts either just the project ID or the full
 * snippet pasted from clarity.microsoft.com (the ID is the last string
 * argument, or the path of `clarity.ms/tag/<id>`).
 */
export function parseClarityInput(raw: string): string {
  const fromSnippet =
    raw.match(/clarity\.ms\/tag\/([a-z0-9]+)/i)?.[1] ||
    raw.match(/["']([a-z0-9]{8,12})["']\s*\)\s*;?\s*<\/script>?$/i)?.[1] ||
    raw.match(/["']([a-z0-9]{8,12})["']\s*\)\s*;?$/im)?.[1]
  return fromSnippet || raw.trim()
}

export type DeploymentStatus = "pending" | "deploying" | "deployed" | "failed"

/** Pill tone of the storefront deployment status. */
export function deploymentTone(status: DeploymentStatus | string): Tone {
  switch (status) {
    case "deployed":
      return "success"
    case "deploying":
      return "info"
    case "failed":
      return "danger"
    default:
      return "neutral"
  }
}

/**
 * Stable text of the editable form (settings + pending secrets) so the save
 * bar can say whether anything changed since the last load / save.
 */
export function settingsFingerprint(settings: object, secrets: string[] = []): string {
  const entries = Object.entries(settings as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b))
  return JSON.stringify([entries, secrets])
}

/** Message parts of a successful Quickshipper connection test (joined with " · " by the page). */
export function quickshipperConnectedParts(
  res: { shop_name?: string; balance?: string; has_providers?: boolean },
  t: { connected: (name: string) => string; account: string; balance: (b: string) => string; noCouriers: string }
): string {
  return (
    t.connected(res.shop_name || t.account) +
    (res.balance ? ` · ${t.balance(res.balance)}` : "") +
    (res.has_providers ? "" : ` · ⚠ ${t.noCouriers}`)
  )
}

/** The error text of a failed request: the API's `error` field, else the JS message, else `fallback`. */
export function requestErrorText(error: unknown, fallback: string): string {
  const e = error as { response?: { data?: { error?: string } }; message?: string } | null
  return e?.response?.data?.error || e?.message || fallback
}
