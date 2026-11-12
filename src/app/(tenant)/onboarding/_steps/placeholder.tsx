"use client"

import { useTranslations } from "next-intl"
import { Construction } from "lucide-react"
import { EmptyBlock } from "@/components/redesign/states"
import type { StepComponentProps, StepDefinition } from "./types"

/**
 * Rendered for every step key without a component of its own, so the wizard
 * never breaks on a key the backend ships before the web package for it.
 * Apply sends the draft answers as they are (usually the prefill).
 */
export function PlaceholderStep({ step }: StepComponentProps) {
  const t = useTranslations("onboarding")
  return (
    <EmptyBlock
      icon={Construction}
      title={t("placeholder.title")}
      description={t("placeholder.hint", { key: step.key })}
      testId={`onb-step-placeholder-${step.key}`}
    />
  )
}

export function placeholderStep(key: string): StepDefinition {
  return { key, titleKey: `steps.${key}.title`, Component: PlaceholderStep }
}
