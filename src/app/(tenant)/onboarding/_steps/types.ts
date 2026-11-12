import type { ComponentType } from "react"
import type { Answers, FieldErrors, OnboardingStep } from "../_lib/onboarding-api"

/**
 * Props every step component receives from the wizard.
 *
 * - `answers` / `setAnswers`: the draft of this step (starts from the last
 *   applied answers, else from `prefill`, through the step's `init`).
 *   `setAnswers` accepts a full object or an updater, like `useState`.
 * - `errors`: the `errors` payload of the last 400, `null` after a change.
 * - `context` / `prefill`: straight from `GET /api/onboarding/`.
 */
export interface StepComponentProps<A extends Answers = Answers> {
  step: OnboardingStep
  answers: A
  setAnswers: (next: A | ((prev: A) => A)) => void
  errors: FieldErrors | null
  context: Record<string, unknown>
  prefill: Partial<A>
}

/**
 * What `_steps/<key>.tsx` exports as `step`: `{ key, titleKey, Component }`
 * plus two optional hooks. `titleKey` is relative to the `onboarding`
 * namespace (e.g. `steps.tickets.title`).
 */
export interface StepDefinition<A extends Answers = Answers> {
  key: string
  titleKey: string
  Component: ComponentType<StepComponentProps<A>>
  /**
   * Builds the draft from the step payload (default: last `answers` if any,
   * else `prefill`). Use it to fill defaults for missing keys.
   */
  init?: (step: OnboardingStep) => A
  /**
   * Builds the payload of `POST .../apply/` from the draft (trim, drop empty
   * rows, fold draft-only keys into the contract shape, omit untouched sections).
   */
  prepare?: (answers: A) => Answers
}
