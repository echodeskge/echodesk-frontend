"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { ListChecks } from "lucide-react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { rdButton } from "@/components/redesign/buttons"
import { TonePill } from "@/components/redesign/pill"
import { useToast } from "@/hooks/use-toast"
import { useMyAccess } from "@/hooks/useMyAccess"
import { cn } from "@/lib/utils"
import { isOnboardingAdmin, skipStep, useOnboardingCache, useOnboardingState, type StepStatus } from "../_lib/onboarding-api"
import { orderedSteps } from "../_lib/wizard"
import { useStepTitle } from "./StepRail"

const TONE: Record<StepStatus, "success" | "neutral" | "warning"> = { done: "success", skipped: "neutral", pending: "warning" }

/**
 * "Finish setup · N" chip in the tenant header: admins only, while any step
 * is pending. Opens a sheet with every step, its status and Open / Skip.
 */
export function FinishSetupChip({ className }: { className?: string }) {
  const t = useTranslations("onboarding")
  const title = useStepTitle()
  const router = useRouter()
  const { toast } = useToast()
  const access = useMyAccess()
  const admin = access.loaded && isOnboardingAdmin(access)
  const query = useOnboardingState({ enabled: admin })
  const cache = useOnboardingCache()
  const [open, setOpen] = useState(false)
  const [busyKey, setBusyKey] = useState<string | null>(null)

  const state = query.data
  if (!admin || !state || state.pending_count <= 0) return null
  const steps = orderedSteps(state.steps)

  const onSkip = async (key: string) => {
    setBusyKey(key)
    try {
      const res = await skipStep(key)
      cache.setStep(res.step)
    } catch {
      toast({ title: t("errors.skipFailed"), variant: "destructive" })
    } finally {
      setBusyKey(null)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-testid="onb-chip"
        className={cn(
          "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-500/20 dark:text-amber-400",
          className
        )}
      >
        <ListChecks className="h-3.5 w-3.5" aria-hidden />
        <span className="hidden sm:inline">{t("chip.label")}</span>
        <span className="rounded-full bg-amber-500/20 px-1.5 tabular-nums" data-testid="onb-chip-count">
          {state.pending_count}
        </span>
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" closeLabel={t("actions.close")} className="w-full sm:max-w-md" data-testid="onb-chip-sheet">
          <SheetHeader>
            <SheetTitle>{t("chip.title")}</SheetTitle>
            <SheetDescription>{t("chip.subtitle", { pending: state.pending_count })}</SheetDescription>
          </SheetHeader>
          <ul className="mx-4 overflow-hidden rounded-[10px] border bg-card">
            {steps.map((s) => (
              <li key={s.key} className="flex flex-wrap items-center gap-2 border-b px-3 py-2.5 last:border-b-0" data-testid={`onb-chip-step-${s.key}`}>
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{title(s.key)}</span>
                <TonePill tone={TONE[s.status]} dot>
                  {t(`status.${s.status}`)}
                </TonePill>
                <button
                  type="button"
                  className={rdButton.outlineSm}
                  onClick={() => {
                    setOpen(false)
                    router.push(`/onboarding?step=${encodeURIComponent(s.key)}`)
                  }}
                  data-testid={`onb-chip-open-${s.key}`}
                >
                  {t("actions.open")}
                </button>
                {s.status === "pending" && (
                  <button
                    type="button"
                    className={rdButton.outlineSm}
                    disabled={busyKey === s.key}
                    onClick={() => onSkip(s.key)}
                    data-testid={`onb-chip-skip-${s.key}`}
                  >
                    {t("actions.skipShort")}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </SheetContent>
      </Sheet>
    </>
  )
}
