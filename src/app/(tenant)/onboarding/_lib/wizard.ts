/** Pure helpers of the wizard (order, progress, navigation). */
import type { Answers, OnboardingStep } from "./onboarding-api"
import type { StepDefinition } from "../_steps/types"

export function orderedSteps(steps: OnboardingStep[]): OnboardingStep[] {
  return [...steps].sort((a, b) => a.order - b.order)
}

export function firstPendingKey(steps: OnboardingStep[]): string | null {
  return orderedSteps(steps).find((s) => s.status === "pending")?.key ?? null
}

/** The step after `key` in order, or null after the last one. */
export function nextKey(steps: OnboardingStep[], key: string): string | null {
  const list = orderedSteps(steps)
  const at = list.findIndex((s) => s.key === key)
  return at >= 0 && at + 1 < list.length ? list[at + 1].key : null
}

export function prevKey(steps: OnboardingStep[], key: string): string | null {
  const list = orderedSteps(steps)
  const at = list.findIndex((s) => s.key === key)
  return at > 0 ? list[at - 1].key : null
}

/** "N of M": steps that are done or skipped, over all steps. */
export function progressOf(steps: OnboardingStep[]): { done: number; total: number } {
  return { done: steps.filter((s) => s.status !== "pending").length, total: steps.length }
}

export function initialAnswers(def: StepDefinition, step: OnboardingStep): Answers {
  if (def.init) return def.init(step)
  const answers = step.answers ?? {}
  return Object.keys(answers).length ? { ...answers } : { ...(step.prefill ?? {}) }
}

/** Where each module lives once set up (finish screen + chip). */
export const MODULE_ROUTES: Record<string, string> = {
  workspace: "/settings/general",
  tickets: "/tickets",
  social_integrations: "/settings/social/connections",
  booking_management: "/bookings/bookings",
  ecommerce_crm: "/ecommerce/dashboard",
  invoice_management: "/invoices/invoices",
  leave_management: "/leave/my-requests",
  ip_calling: "/settings/calls",
}

/** Landing page after the wizard; the layout guard redirects if it is not accessible. */
export const WORKSPACE_HOME = "/tickets"

export const ONBOARDING_REDIRECTED_KEY = "echodesk.onboarding.redirected"

export function readRedirected(): boolean {
  try {
    return window.sessionStorage.getItem(ONBOARDING_REDIRECTED_KEY) === "1"
  } catch {
    return false
  }
}

export function writeRedirected(): void {
  try {
    window.sessionStorage.setItem(ONBOARDING_REDIRECTED_KEY, "1")
  } catch {
    // storage blocked: the gate may redirect again on the next load
  }
}
