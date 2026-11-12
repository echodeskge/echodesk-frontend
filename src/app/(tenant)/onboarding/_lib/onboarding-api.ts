/**
 * Typed wrapper of the onboarding API (`/api/onboarding/`, RULES.md contract).
 * The generated client does not know these endpoints yet, so the calls go
 * through the shared axios instance directly.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query"
import axios from "@/api/axios"

export type StepStatus = "pending" | "done" | "skipped"

export type Industry =
  | "salon"
  | "clinic"
  | "real_estate"
  | "shop"
  | "call_centre"
  | "logistics"
  | "services"
  | "other"

export const INDUSTRIES: Industry[] = [
  "salon",
  "clinic",
  "real_estate",
  "shop",
  "call_centre",
  "logistics",
  "services",
  "other",
]

/** Step keys the backend ships today; later packages may add more (the UI falls back to a placeholder). */
export type KnownStepKey =
  | "workspace"
  | "tickets"
  | "social_integrations"
  | "booking_management"
  | "ecommerce_crm"
  | "invoice_management"
  | "leave_management"
  | "ip_calling"

export type Answers = Record<string, unknown>

export interface OnboardingStep {
  key: string
  feature_key: string | null
  order: number
  status: StepStatus
  /** Last applied answers (`{}` when none). */
  answers: Answers
  /** Suggested answers computed from existing data. */
  prefill: Answers
  /** Step-specific read data (users list, connected channels, flags…). */
  context: Record<string, unknown>
  completed_at: string | null
}

export interface OnboardingState {
  industry: Industry | null
  started_at: string | null
  finished_at: string | null
  pending_count: number
  total: number
  steps: OnboardingStep[]
}

export interface ApplyResult {
  created: Record<string, unknown>
  updated: string[]
  notes: string[]
}

export interface ApplyResponse {
  step: OnboardingStep
  result: ApplyResult
}

/**
 * DRF serializer errors: `{field: ["message"]}`; nested serializers give
 * `{team: [{}, {email: ["..."]}]}` and `non_field_errors` may appear.
 */
export type FieldErrors = Record<string, unknown>

export class OnboardingValidationError extends Error {
  errors: FieldErrors
  constructor(errors: FieldErrors) {
    super("Onboarding validation failed")
    this.name = "OnboardingValidationError"
    this.errors = errors
  }
}

export const onboardingKeys = {
  all: ["onboarding"] as const,
  state: () => ["onboarding", "state"] as const,
}

export async function fetchOnboarding(): Promise<OnboardingState> {
  const res = await axios.get<OnboardingState>("/api/onboarding/")
  return res.data
}

/** Throws `OnboardingValidationError` on a 400 so the wizard can show field errors. */
export async function applyStep(key: string, answers: Answers): Promise<ApplyResponse> {
  try {
    const res = await axios.post<ApplyResponse>(`/api/onboarding/${encodeURIComponent(key)}/apply/`, { answers })
    return res.data
  } catch (err) {
    const errors = validationErrorsOf(err)
    if (errors) throw new OnboardingValidationError(errors)
    throw err
  }
}

export async function skipStep(key: string): Promise<{ step: OnboardingStep }> {
  const res = await axios.post<{ step: OnboardingStep }>(`/api/onboarding/${encodeURIComponent(key)}/skip/`)
  return res.data
}

export async function resetStep(key: string): Promise<{ step: OnboardingStep }> {
  const res = await axios.post<{ step: OnboardingStep }>(`/api/onboarding/${encodeURIComponent(key)}/reset/`)
  return res.data
}

/** Existing endpoint; returns `{logo_url}`. */
export async function uploadTenantLogo(file: File): Promise<{ logo_url: string }> {
  const form = new FormData()
  form.append("logo", file)
  const res = await axios.post<{ logo_url: string }>("/api/tenant-settings/upload-logo/", form, {
    headers: { "Content-Type": "multipart/form-data" },
  })
  return res.data
}

/** `{errors: {...}}` of a 400, else null. */
export function validationErrorsOf(err: unknown): FieldErrors | null {
  const e = err as { response?: { status?: number; data?: unknown } } | null | undefined
  if (e?.response?.status !== 400) return null
  const data = e.response.data as { errors?: unknown } | null | undefined
  if (data && typeof data === "object" && data.errors && typeof data.errors === "object") {
    return data.errors as FieldErrors
  }
  // Plain DRF payload without the `errors` wrapper.
  if (data && typeof data === "object") return data as FieldErrors
  return null
}

/** First message of a field error (`["msg"]`, `"msg"` or nested `{detail}`), else null. */
export function firstError(errors: FieldErrors | null | undefined, field: string): string | null {
  if (!errors) return null
  return firstString(errors[field])
}

function firstString(value: unknown): string | null {
  if (typeof value === "string") return value || null
  if (Array.isArray(value)) {
    for (const item of value) {
      const s = firstString(item)
      if (s) return s
    }
    return null
  }
  if (value && typeof value === "object") {
    for (const inner of Object.values(value as Record<string, unknown>)) {
      const s = firstString(inner)
      if (s) return s
    }
  }
  return null
}

/**
 * Row errors of a nested list field (`errors.team[i]`), aligned with the rows.
 * DRF lists arrive as `[{}, {email: [...]}]` or, for some serializers, as
 * `{"1": {email: [...]}}`; both give an array aligned with the rows.
 */
export function rowErrorsOf(errors: FieldErrors | null | undefined, field: string): Array<Record<string, unknown>> {
  const value = resolvePath(errors, field)
  if (Array.isArray(value)) {
    return value.map((row) => (row && typeof row === "object" && !Array.isArray(row) ? (row as Record<string, unknown>) : {}))
  }
  if (value && typeof value === "object") {
    const rec = value as Record<string, unknown>
    const indexes = Object.keys(rec).filter((k) => /^\d+$/.test(k)).map(Number)
    if (indexes.length === 0) return []
    const out: Array<Record<string, unknown>> = []
    for (const i of indexes) {
      const row = rec[String(i)]
      out[i] = row && typeof row === "object" && !Array.isArray(row) ? (row as Record<string, unknown>) : {}
    }
    for (let i = 0; i < out.length; i++) out[i] ??= {}
    return out
  }
  return []
}

/** Walks `payment.bank_iban`, `services[2].price` or `hours.mon.from` through a nested error payload. */
function resolvePath(errors: FieldErrors | null | undefined, path: string): unknown {
  if (!errors) return undefined
  const parts = path.replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean)
  let cur: unknown = errors
  for (const part of parts) {
    if (cur === null || cur === undefined || typeof cur !== "object") return undefined
    cur = Array.isArray(cur) ? cur[Number(part)] : (cur as Record<string, unknown>)[part]
  }
  return cur
}

/**
 * First message of a nested field error: `nestedError(errors, "payment.bank_iban")`,
 * `nestedError(errors, "services[2].price")`. A plain field name works too.
 */
export function nestedError(errors: FieldErrors | null | undefined, path: string): string | null {
  return firstString(resolvePath(errors, path))
}

/** The industry chosen in the workspace step (from the cached state), for per-industry presets. */
export function useOnboardingIndustry(): Industry | null {
  const query = useOnboardingState({ enabled: false })
  return query.data?.industry ?? null
}

/** Replace one step in a cached state and recount the pending steps. */
export function withStep(state: OnboardingState, step: OnboardingStep): OnboardingState {
  const steps = state.steps.map((s) => (s.key === step.key ? step : s))
  const pending = steps.filter((s) => s.status === "pending").length
  return {
    ...state,
    steps,
    pending_count: pending,
    started_at: state.started_at ?? new Date().toISOString(),
    finished_at: pending === 0 ? (state.finished_at ?? new Date().toISOString()) : state.finished_at,
  }
}

/** Admins only (same rule as the settings endpoints): staff, superuser or `manage_settings`. */
export function isOnboardingAdmin(access: { isSuperuser: boolean; isStaff: boolean; has: (codename: string) => boolean }): boolean {
  return access.isSuperuser || access.isStaff || access.has("manage_settings")
}

export function useOnboardingState(options: { enabled?: boolean } = {}) {
  return useQuery<OnboardingState>({
    queryKey: onboardingKeys.state(),
    queryFn: fetchOnboarding,
    enabled: options.enabled ?? true,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  })
}

/** Cache helpers shared by the wizard and the header chip. */
export function useOnboardingCache() {
  const queryClient = useQueryClient()
  return {
    setStep: (step: OnboardingStep) => {
      queryClient.setQueryData<OnboardingState>(onboardingKeys.state(), (old) => (old ? withStep(old, step) : old))
    },
    invalidate: () => queryClient.invalidateQueries({ queryKey: onboardingKeys.all }),
  }
}
