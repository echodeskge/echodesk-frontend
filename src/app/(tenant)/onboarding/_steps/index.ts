/**
 * Web step registry. A later package adds a step by creating
 * `_steps/<key>.tsx` that exports `step: StepDefinition` (`{ key, titleKey,
 * Component }`) and listing it in `STEPS` below. Unknown keys get the
 * placeholder, so the wizard keeps working for keys only the backend knows.
 */
import type { StepDefinition } from "./types"
import { step as workspace } from "./workspace"
import { placeholderStep } from "./placeholder"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const STEPS: StepDefinition<any>[] = [workspace]

const REGISTRY = new Map<string, StepDefinition>(STEPS.map((s) => [s.key, s as StepDefinition]))

/** Known step keys the backend may send (titles exist for all of them). */
export const KNOWN_STEP_KEYS = [
  "workspace",
  "tickets",
  "social_integrations",
  "booking_management",
  "ecommerce_crm",
  "invoice_management",
  "leave_management",
  "ip_calling",
] as const

export function getStepDefinition(key: string): StepDefinition {
  return REGISTRY.get(key) ?? placeholderStep(key)
}

export function hasStepComponent(key: string): boolean {
  return REGISTRY.has(key)
}

export type { StepComponentProps, StepDefinition } from "./types"
