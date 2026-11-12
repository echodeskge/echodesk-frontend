"use client"

import { useTranslations } from "next-intl"
import { Check, Minus } from "lucide-react"
import { cn } from "@/lib/utils"
import type { OnboardingStep, StepStatus } from "../_lib/onboarding-api"
import { progressOf } from "../_lib/wizard"

/** Step title from the catalog, or the raw key for a step the web does not know yet. */
export function useStepTitle() {
  const t = useTranslations("onboarding")
  return (key: string) => (t.has(`steps.${key}.title`) ? t(`steps.${key}.title`) : key)
}

function StatusDot({ status, current }: { status: StepStatus; current: boolean }) {
  return (
    <span
      aria-hidden
      data-status={status}
      className={cn(
        "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px]",
        status === "done" && "border-green-600 bg-green-600 text-white",
        status === "skipped" && "border-border bg-muted text-muted-foreground",
        status === "pending" && (current ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground")
      )}
    >
      {status === "done" ? <Check className="h-3 w-3" /> : status === "skipped" ? <Minus className="h-3 w-3" /> : null}
    </span>
  )
}

/**
 * Left rail (md+) with the step list and "N of M"; on phones a top strip with
 * the progress bar and the current step's name.
 */
export function StepRail({
  steps,
  currentKey,
  onSelect,
  finished,
}: {
  steps: OnboardingStep[]
  currentKey: string | null
  onSelect: (key: string) => void
  finished?: boolean
}) {
  const t = useTranslations("onboarding")
  const title = useStepTitle()
  const { done, total } = progressOf(steps)
  const index = Math.max(0, steps.findIndex((s) => s.key === currentKey))
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)

  return (
    <>
      {/* Phone: progress strip */}
      <div className="border-b px-4 py-2.5 md:hidden" data-testid="onb-rail-mobile">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-medium">{finished ? t("finish.title") : t("stepOf", { index: index + 1, total })}</span>
          <span className="tabular-nums text-muted-foreground">{t("progress", { done, total })}</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${pct}%` }} />
        </div>
        {!finished && currentKey && <div className="mt-1.5 truncate text-[13px] font-semibold">{title(currentKey)}</div>}
        <div className="mt-2 flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {steps.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => onSelect(s.key)}
              aria-label={title(s.key)}
              aria-current={s.key === currentKey ? "step" : undefined}
              className="shrink-0"
            >
              <StatusDot status={s.status} current={s.key === currentKey} />
            </button>
          ))}
        </div>
      </div>

      {/* Desktop: rail */}
      <aside className="hidden w-[260px] shrink-0 flex-col border-r bg-muted/20 md:flex" data-testid="onb-rail">
        <div className="px-5 pt-6 pb-3">
          <div className="text-[13px] font-semibold">{t("title")}</div>
          <div className="mt-1 text-xs text-muted-foreground" data-testid="onb-progress">
            {t("progress", { done, total })}
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <ol className="flex flex-col gap-0.5 px-3">
          {steps.map((s) => {
            const current = !finished && s.key === currentKey
            return (
              <li key={s.key}>
                <button
                  type="button"
                  onClick={() => onSelect(s.key)}
                  aria-current={current ? "step" : undefined}
                  data-testid={`onb-rail-step-${s.key}`}
                  data-status={s.status}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-[13px] transition-colors hover:bg-accent",
                    current ? "bg-background font-semibold shadow-[0_1px_2px_rgb(0_0_0/0.06)]" : "text-muted-foreground"
                  )}
                >
                  <StatusDot status={s.status} current={current} />
                  <span className="min-w-0 flex-1 truncate">{title(s.key)}</span>
                  {s.status !== "pending" && (
                    <span className="text-[11px] font-normal text-muted-foreground">{t(`status.${s.status}`)}</span>
                  )}
                </button>
              </li>
            )
          })}
        </ol>
      </aside>
    </>
  )
}
