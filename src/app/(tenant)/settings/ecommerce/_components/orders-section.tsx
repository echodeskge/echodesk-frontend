"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { useQueryClient } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import axios from "@/api/axios"
import { Input } from "@/components/ui/input"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { DangerZone } from "@/components/redesign/settings"
import { FieldRow, SectionCard, formatCount } from "@/app/(tenant)/ecommerce/_components/ui"
import { STATUS_OPTIONS } from "@/app/(tenant)/ecommerce/orders/_data/constants"
import { cn, getApiErrorMessage } from "@/lib/utils"
import { settingsInput } from "./settings-ui"

const ORDERS_URL = "/api/ecommerce/admin/orders/"
const CLEAN_URL = "/api/ecommerce/admin/orders/clean/"
/** Statuses a cleaning can be limited to (the "all" filter value is not one). */
export const CLEAN_STATUSES = STATUS_OPTIONS.filter((s) => s !== "all")
const DRY_RUN_DEBOUNCE_MS = 300

interface Counts {
  visible: number
  cleaned: number
}

/** The clean filters as the backend takes them (empty status list = every status). */
export function cleanPayload(statuses: readonly string[], createdBefore: string) {
  return {
    ...(statuses.length > 0 ? { status: [...statuses] } : {}),
    ...(createdBefore ? { created_before: createdBefore } : {}),
  }
}

/**
 * Settings → E-commerce → Orders (store admins only): how many orders are
 * visible / cleaned, a link to the cleaned list, and the "Clean order list"
 * danger zone whose dialog hides orders by status and age (soft delete, the
 * cleaned view can restore them).
 */
export function OrdersSection() {
  const t = useTranslations("ecommerceSettings.orders")
  const tOrders = useTranslations("ecommerceOrders")
  const queryClient = useQueryClient()
  const [counts, setCounts] = useState<Counts | null>(null)
  const [countsFailed, setCountsFailed] = useState(false)
  const [open, setOpen] = useState(false)
  const [statuses, setStatuses] = useState<string[]>([])
  const [createdBefore, setCreatedBefore] = useState("")
  const [dryRun, setDryRun] = useState<number | null>(null)
  const [dryRunLoading, setDryRunLoading] = useState(false)
  const [dryRunFailed, setDryRunFailed] = useState(false)
  const [cleaning, setCleaning] = useState(false)

  const fetchCounts = useCallback(async () => {
    try {
      setCountsFailed(false)
      const [visible, cleaned] = await Promise.all([
        axios.get(ORDERS_URL, { params: { page_size: 1 } }),
        axios.get(ORDERS_URL, { params: { page_size: 1, cleaned: true } }),
      ])
      setCounts({ visible: Number(visible.data?.count ?? 0), cleaned: Number(cleaned.data?.count ?? 0) })
    } catch {
      setCountsFailed(true)
    }
  }, [])

  useEffect(() => {
    fetchCounts()
  }, [fetchCounts])

  // Live "{n} orders will be hidden" while the dialog is open (debounced dry run).
  useEffect(() => {
    if (!open) return
    let cancelled = false
    setDryRunLoading(true)
    setDryRunFailed(false)
    const timer = setTimeout(async () => {
      try {
        const { data } = await axios.post(CLEAN_URL, { ...cleanPayload(statuses, createdBefore), dry_run: true })
        if (!cancelled) setDryRun(Number(data?.count ?? 0))
      } catch {
        if (!cancelled) {
          setDryRun(null)
          setDryRunFailed(true)
        }
      } finally {
        if (!cancelled) setDryRunLoading(false)
      }
    }, DRY_RUN_DEBOUNCE_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [open, statuses, createdBefore])

  const openDialog = () => {
    setStatuses([])
    setCreatedBefore("")
    setDryRun(null)
    setOpen(true)
  }

  const toggleStatus = (status: string) =>
    setStatuses((prev) => (prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]))

  const handleClean = async () => {
    try {
      setCleaning(true)
      const { data } = await axios.post(CLEAN_URL, cleanPayload(statuses, createdBefore))
      const cleaned = Number(data?.cleaned ?? 0)
      toast.success(t("toast.cleaned", { count: cleaned }))
      setOpen(false)
      await Promise.all([fetchCounts(), queryClient.invalidateQueries({ queryKey: ["ecommerce-analytics"] })])
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("toast.cleanFailed")))
    } finally {
      setCleaning(false)
    }
  }

  const canConfirm = !cleaning && !dryRunLoading && dryRun !== null && dryRun > 0

  return (
    <SectionCard title={t("title")} hint={t("hint")} testId="ec-settings-orders">
      <FieldRow label={t("countsLabel")} help={t("countsHelp")} align="center">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
          <span className="tabular-nums" data-testid="ec-settings-orders-counts" aria-live="polite">
            {counts
              ? t("counts", { visible: counts.visible, cleaned: formatCount(counts.cleaned) })
              : countsFailed
                ? t("countsFailed")
                : "—"}
          </span>
          <Link
            href="/ecommerce/orders?cleaned=1"
            className="text-xs text-primary underline-offset-2 hover:underline"
            data-testid="ec-settings-orders-view-cleaned"
          >
            {t("viewCleaned")}
          </Link>
        </div>
      </FieldRow>
      <div className="p-4">
        <DangerZone
          label={t("clean.label")}
          help={t("clean.help")}
          actionLabel={t("clean.action")}
          onAction={openDialog}
          disabled={cleaning}
          testId="ec-settings-orders-clean"
        />
      </div>

      <AlertDialog open={open} onOpenChange={(next) => !cleaning && setOpen(next)}>
        <AlertDialogContent data-testid="ec-clean-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("dialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("dialog.description")}</AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex flex-col gap-4">
            <fieldset className="flex flex-col gap-2">
              <legend className="text-xs font-medium">{t("dialog.statuses")}</legend>
              <div className="flex flex-wrap gap-1.5" data-testid="ec-clean-statuses">
                {CLEAN_STATUSES.map((status) => {
                  const on = statuses.includes(status)
                  return (
                    <button
                      key={status}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleStatus(status)}
                      className={cn(
                        "inline-flex h-7 items-center rounded-md border px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        on
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                    >
                      {tOrders(`status.${status}`)}
                    </button>
                  )
                })}
              </div>
              <span className="text-xs text-muted-foreground">{t("dialog.allStatuses")}</span>
            </fieldset>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="ec-clean-before" className="text-xs font-medium">
                {t("dialog.createdBefore")}
              </label>
              <Input
                id="ec-clean-before"
                type="date"
                className={cn(settingsInput, "w-full sm:w-[200px]")}
                value={createdBefore}
                onChange={(e) => setCreatedBefore(e.target.value)}
              />
              <span className="text-xs text-muted-foreground">{t("dialog.anyDate")}</span>
            </div>

            <p
              className={cn("text-[13px] font-medium", dryRunFailed ? "text-destructive" : "text-foreground")}
              aria-live="polite"
              data-testid="ec-clean-count"
            >
              {dryRunLoading
                ? t("dialog.counting")
                : dryRunFailed
                  ? t("dialog.countFailed")
                  : t("dialog.count", { count: dryRun ?? 0 })}
            </p>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={cleaning}>{t("dialog.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                // Keep the dialog open while the request runs (closed on success).
                e.preventDefault()
                handleClean()
              }}
              disabled={!canConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="ec-clean-confirm"
            >
              {cleaning && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
              {t("dialog.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SectionCard>
  )
}
