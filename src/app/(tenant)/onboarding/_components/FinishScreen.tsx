"use client"

import Link from "next/link"
import { useTranslations } from "next-intl"
import { ArrowRight, CheckCircle2 } from "lucide-react"
import { rdButton } from "@/components/redesign/buttons"
import { TonePill } from "@/components/redesign/pill"
import type { OnboardingStep } from "../_lib/onboarding-api"
import { MODULE_ROUTES, WORKSPACE_HOME } from "../_lib/wizard"
import { useStepTitle } from "./StepRail"

/** After the last step: links to the modules and "Go to workspace". */
export function FinishScreen({ steps, onOpenStep }: { steps: OnboardingStep[]; onOpenStep: (key: string) => void }) {
  const t = useTranslations("onboarding")
  const title = useStepTitle()
  const skipped = steps.filter((s) => s.status === "skipped").length

  return (
    <div className="flex flex-col gap-5" data-testid="onb-finish">
      <div className="flex flex-col items-start gap-2">
        <CheckCircle2 className="h-8 w-8 text-green-600" aria-hidden />
        <h2 className="text-lg font-semibold">{t("finish.title")}</h2>
        <p className="text-[13px] text-muted-foreground [text-wrap:pretty]">{t("finish.subtitle")}</p>
        {skipped > 0 && (
          <p className="text-xs text-muted-foreground [text-wrap:pretty]" data-testid="onb-finish-skipped">
            {t("finish.skippedNote", { count: skipped })}
          </p>
        )}
      </div>
      <ul className="overflow-hidden rounded-[10px] border bg-card">
        {steps.map((s) => {
          const href = MODULE_ROUTES[s.key]
          return (
            <li key={s.key} className="flex items-center gap-3 border-b px-4 py-2.5 last:border-b-0">
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{title(s.key)}</span>
              <TonePill tone={s.status === "done" ? "success" : s.status === "skipped" ? "neutral" : "warning"} dot>
                {t(`status.${s.status}`)}
              </TonePill>
              {s.status === "pending" || s.status === "skipped" ? (
                <button type="button" onClick={() => onOpenStep(s.key)} className={rdButton.outlineSm} data-testid={`onb-finish-open-${s.key}`}>
                  {t("actions.open")}
                </button>
              ) : href ? (
                <Link href={href} className={rdButton.outlineSm} data-testid={`onb-finish-link-${s.key}`}>
                  {t("actions.open")}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              ) : null}
            </li>
          )
        })}
      </ul>
      <div>
        <Link href={WORKSPACE_HOME} className={rdButton.primary} data-testid="onb-go-workspace">
          {t("actions.goToWorkspace")}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </div>
  )
}
