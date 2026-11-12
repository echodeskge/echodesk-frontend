"use client"

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { ArrowLeft, ArrowRight, Loader2, X } from "lucide-react"
import { ErrorBlock, LoadingBlock } from "@/components/redesign/states"
import { rdButton } from "@/components/redesign/buttons"
import { useToast } from "@/hooks/use-toast"
import { useMyAccess } from "@/hooks/useMyAccess"
import { useTenant } from "@/contexts/TenantContext"
import { cn } from "@/lib/utils"
import {
  OnboardingValidationError,
  applyStep,
  isOnboardingAdmin,
  skipStep,
  useOnboardingCache,
  useOnboardingState,
  firstError,
  type Answers,
  type FieldErrors,
} from "./_lib/onboarding-api"
import { WORKSPACE_HOME, firstPendingKey, initialAnswers, nextKey, orderedSteps, prevKey } from "./_lib/wizard"
import { getStepDefinition } from "./_steps"
import { StepRail, useStepTitle } from "./_components/StepRail"
import { FinishScreen } from "./_components/FinishScreen"

export default function OnboardingPage() {
  return (
    <Suspense fallback={<LoadingBlock label="…" />}>
      <OnboardingWizard />
    </Suspense>
  )
}

function OnboardingWizard() {
  const t = useTranslations("onboarding")
  const title = useStepTitle()
  const router = useRouter()
  const searchParams = useSearchParams()
  const stepParam = searchParams?.get("step") ?? null
  const { toast } = useToast()
  const { tenant } = useTenant()
  const access = useMyAccess()
  const admin = access.loaded && isOnboardingAdmin(access)
  const query = useOnboardingState({ enabled: admin })
  const cache = useOnboardingCache()

  const steps = useMemo(() => orderedSteps(query.data?.steps ?? []), [query.data])

  const [currentKey, setCurrentKey] = useState<string | null>(null)
  const [finished, setFinished] = useState(false)
  const [drafts, setDrafts] = useState<Record<string, Answers>>({})
  const [errors, setErrors] = useState<FieldErrors | null>(null)
  const [busy, setBusy] = useState<"apply" | "skip" | null>(null)

  const goTo = useCallback(
    (key: string | null) => {
      setErrors(null)
      if (key === null) {
        setFinished(true)
        return
      }
      setFinished(false)
      setCurrentKey(key)
    },
    []
  )

  // First choice of step: `?step=` if valid, else the first pending one, else the finish screen.
  // `?step=` is honoured once per value: the effect also re-runs on other
  // state changes (e.g. `finished` after the last apply, while the URL
  // still names that step) and must not reopen the step then.
  const seenStepParam = useRef<string | null | undefined>(undefined)
  useEffect(() => {
    if (steps.length === 0) return
    if (stepParam !== seenStepParam.current) {
      seenStepParam.current = stepParam
      if (stepParam && steps.some((s) => s.key === stepParam)) {
        goTo(stepParam)
        return
      }
    }
    if (currentKey === null && !finished) {
      const first = firstPendingKey(steps)
      goTo(first ?? null)
      if (first === null && steps.length > 0) setCurrentKey(steps[0].key)
    }
  }, [steps, stepParam, currentKey, finished, goTo])

  const step = steps.find((s) => s.key === currentKey) ?? null
  const def = step ? getStepDefinition(step.key) : null
  const answers: Answers = step && def ? (drafts[step.key] ?? initialAnswers(def, step)) : {}

  const setAnswers = useCallback(
    (next: Answers | ((prev: Answers) => Answers)) => {
      if (!step || !def) return
      setErrors(null)
      setDrafts((all) => {
        const prev = all[step.key] ?? initialAnswers(def, step)
        return { ...all, [step.key]: typeof next === "function" ? next(prev) : next }
      })
    },
    [step, def]
  )

  const advance = () => {
    if (!step) return
    const next = nextKey(steps, step.key)
    if (next) router.replace(`/onboarding?step=${encodeURIComponent(next)}`, { scroll: false })
    else router.replace("/onboarding", { scroll: false })
    goTo(next)
  }

  const onApply = async () => {
    if (!step || !def) return
    setBusy("apply")
    try {
      const payload = def.prepare ? def.prepare(answers) : answers
      const res = await applyStep(step.key, payload)
      cache.setStep(res.step)
      // Drop the draft: the stored answers are the validated contract shape,
      // not the step's draft shape, so the next visit re-runs `def.init`.
      setDrafts((all) => {
        const rest = { ...all }
        delete rest[step.key]
        return rest
      })
      advance()
    } catch (err) {
      if (err instanceof OnboardingValidationError) {
        setErrors(err.errors)
        toast({ title: t("errors.fixFields"), variant: "destructive" })
      } else {
        toast({ title: t("errors.applyFailed"), variant: "destructive" })
      }
    } finally {
      setBusy(null)
    }
  }

  const onSkip = async () => {
    if (!step) return
    setBusy("skip")
    try {
      const res = await skipStep(step.key)
      cache.setStep(res.step)
      advance()
    } catch {
      toast({ title: t("errors.skipFailed"), variant: "destructive" })
    } finally {
      setBusy(null)
    }
  }

  const onBack = () => {
    if (finished) {
      const last = steps[steps.length - 1]
      if (last) goTo(last.key)
      return
    }
    if (!step) return
    const prev = prevKey(steps, step.key)
    if (prev) goTo(prev)
  }

  const errorLabels = {
    errorTitle: t("errors.title"),
    errorHint: t("errors.hint"),
    noAccessTitle: t("errors.noAccessTitle"),
    noAccessHint: t("errors.noAccessHint"),
    retry: t("actions.retry"),
  }

  let body: React.ReactNode
  if (access.loaded && !admin) {
    body = <ErrorBlock labels={errorLabels} error={{ response: { status: 403 } }} testId="onb-no-access" />
  } else if (query.isPending || !access.loaded) {
    body = <LoadingBlock label={t("loading")} testId="onb-loading" />
  } else if (query.isError || !query.data) {
    body = <ErrorBlock labels={errorLabels} error={query.error} onRetry={() => query.refetch()} testId="onb-error" />
  } else if (finished || (!step && steps.length === 0)) {
    body = <FinishScreen steps={steps} onOpenStep={(key) => goTo(key)} />
  } else if (step && def) {
    const Component = def.Component
    const nonField = firstError(errors, "non_field_errors") ?? firstError(errors, "detail")
    body = (
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold" data-testid="onb-step-title">
            {title(step.key)}
          </h2>
          {t.has(`steps.${step.key}.hint`) && <p className="text-[13px] text-muted-foreground">{t(`steps.${step.key}.hint`)}</p>}
        </div>
        {nonField && (
          <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-[13px] text-destructive" data-testid="onb-nonfield-error">
            {nonField}
          </div>
        )}
        <Component
          key={step.key}
          step={step}
          answers={answers}
          setAnswers={setAnswers}
          errors={errors}
          context={step.context ?? {}}
          prefill={step.prefill ?? {}}
        />
      </div>
    )
  } else {
    body = <LoadingBlock label={t("loading")} testId="onb-loading" />
  }

  const showFooter = admin && !!query.data && !finished && !!step
  const canBack = finished ? steps.length > 0 : !!step && prevKey(steps, step.key) !== null

  return (
    <div className="flex h-full min-h-screen w-full flex-col bg-background" data-testid="onb-wizard">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b px-4">
        <span className="truncate text-[13px] font-semibold">{tenant?.tenant_name ?? "EchoDesk"}</span>
        <span aria-hidden className="h-4 w-px bg-border" />
        <span className="truncate text-[13px] text-muted-foreground">{t("title")}</span>
        <Link href={WORKSPACE_HOME} className={cn(rdButton.ghostIcon, "ml-auto")} aria-label={t("actions.exit")} title={t("actions.exit")} data-testid="onb-exit">
          <X className="h-4 w-4" aria-hidden />
        </Link>
      </header>
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {admin && query.data && <StepRail steps={steps} currentKey={currentKey} onSelect={(key) => goTo(key)} finished={finished} />}
        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-[760px] px-4 py-5 sm:px-6 sm:py-6">{body}</div>
          </div>
          {(showFooter || finished) && (
            <footer className="flex shrink-0 flex-wrap items-center gap-2 border-t bg-background px-4 py-3 sm:px-6" data-testid="onb-footer">
              <button type="button" onClick={onBack} disabled={!canBack || busy !== null} className={rdButton.outline} data-testid="onb-back">
                <ArrowLeft className="h-4 w-4" aria-hidden />
                {t("actions.back")}
              </button>
              {showFooter && (
                <div className="ml-auto flex flex-wrap items-center gap-2">
                  <button type="button" onClick={onSkip} disabled={busy !== null} className={rdButton.outline} data-testid="onb-skip">
                    {t("actions.skip")}
                  </button>
                  <button type="button" onClick={onApply} disabled={busy !== null} className={rdButton.primary} data-testid="onb-apply">
                    {busy === "apply" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                    {busy === "apply" ? t("actions.applying") : t("actions.apply")}
                    {busy !== "apply" && <ArrowRight className="h-4 w-4" aria-hidden />}
                  </button>
                </div>
              )}
            </footer>
          )}
        </main>
      </div>
    </div>
  )
}
