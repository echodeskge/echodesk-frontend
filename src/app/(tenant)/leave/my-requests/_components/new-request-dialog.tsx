"use client"

import { useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { leaveEmployeeLeaveTypesList, leaveEmployeeMyRequestsCreate } from "@/api/generated/api"
import { cn, getApiErrorMessage, localizedName } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { fetchMySubstitutes, type SubstituteAssignment } from "../../_lib/hr-api"
import {
  buildSubstitutesPayload,
  fieldErrors,
  leaveTypeLimitError,
  validateSubstituteRows,
  type SubstituteDraftRow,
} from "../../_lib/substitutes-utils"
import { useLeaveFeatures } from "../../_lib/useLeaveFeatures"
import { SubstituteRowsEditor } from "../../_components/SubstituteRowsEditor"
import { useLiteUsers } from "../../_components/UserPicker"
import { LeaveAvatar, LeaveTypeChip, leaveButton } from "../../_components/ui"

export interface LeaveTypeOption {
  id: number
  name: { en?: string; ka?: string } | string | null
  name_display?: string
  code: string
  color?: string
  requires_substitutes?: boolean
}

function unwrapList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[]
  const results = (data as { results?: unknown } | null | undefined)?.results
  return Array.isArray(results) ? (results as T[]) : []
}

const EMPTY_FORM = { leave_type: "", start_date: "", end_date: "", reason: "" }

/** Saved substitutes in the order they are asked (sort_order). */
export function orderedSubstitutes(list: SubstituteAssignment[]): SubstituteAssignment[] {
  return [...list].sort((a, b) => a.sort_order - b.sort_order)
}

/**
 * The general (not per-field) errors of a failed create, joined for the line
 * above the footer. `end_date` has its own line under the end date field.
 */
export function generalErrorText(errors: Record<string, string>): string {
  return [errors.non_field_errors, errors.detail].filter(Boolean).join(" ")
}

/**
 * New leave request dialog (bottom sheet below `sm`). Same fields, checks and
 * calls as the former inline dialog of My requests; mounted by My requests and
 * by the leave landing page. Leave types are loaded the first time it opens.
 */
export function NewRequestDialog({
  open,
  onOpenChange,
  onSubmitted,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called after a successful create (the dialog has closed and reset). */
  onSubmitted?: () => void | Promise<void>
}) {
  const t = useTranslations("leave")
  const locale = useLocale()
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeOption[] | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const { features, userId } = useLeaveFeatures()
  // Field errors from the last create attempt (limits, balance, substitutes...).
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  // Substitutes: the saved "My substitutes" list (null = not loaded yet) or
  // inline rows when that list is empty.
  const [savedSubstitutes, setSavedSubstitutes] = useState<SubstituteAssignment[] | null>(null)
  const [substituteRows, setSubstituteRows] = useState<SubstituteDraftRow[]>([])
  const types = leaveTypes ?? []
  const selectedType = types.find((type) => String(type.id) === formData.leave_type)
  const needsSubstitutes = Boolean(features?.substitutes && selectedType?.requires_substitutes)
  const needsInlineSubstitutes = needsSubstitutes && savedSubstitutes !== null && savedSubstitutes.length === 0
  const { users: substituteUsers } = useLiteUsers({}, needsInlineSubstitutes)

  useEffect(() => {
    if (!needsSubstitutes || savedSubstitutes !== null) return
    fetchMySubstitutes()
      .then(setSavedSubstitutes)
      .catch(() => setSavedSubstitutes([]))
  }, [needsSubstitutes, savedSubstitutes])

  useEffect(() => {
    if (!open || leaveTypes !== null) return
    let ignore = false
    // Positional: (ordering, page, pageSize)
    leaveEmployeeLeaveTypesList(undefined, undefined, 100)
      .then((response) => {
        if (!ignore) setLeaveTypes(unwrapList<LeaveTypeOption>(response))
      })
      .catch((error) => {
        console.error("Failed to fetch leave types:", error)
        if (ignore) return
        setLeaveTypes([])
        toast.error(t("myRequests.leaveTypesLoadFailed"), {
          description: getApiErrorMessage(error) || undefined,
        })
      })
    return () => {
      ignore = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, leaveTypes])

  const resetForm = () => {
    setFormData(EMPTY_FORM)
    setFormErrors({})
    setSubstituteRows([])
    // Re-read the saved list next time (it may have changed meanwhile).
    setSavedSubstitutes(null)
  }

  const typeName = (type: LeaveTypeOption) =>
    typeof type.name === "string"
      ? type.name
      : localizedName(type.name, locale) || type.name_display || type.code

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    if (!formData.leave_type) {
      toast.error(t("myRequests.leaveTypeRequired"))
      return
    }

    if (needsInlineSubstitutes) {
      const rowsError = validateSubstituteRows(substituteRows, { selfId: userId })
      if (rowsError) {
        toast.error(t(`hr.substitutes.errors.${rowsError}`))
        return
      }
    }

    setSubmitting(true)
    setFormErrors({})
    try {
      const payload = {
        leave_type: Number(formData.leave_type),
        start_date: formData.start_date,
        end_date: formData.end_date,
        reason: formData.reason,
        ...(needsInlineSubstitutes ? { substitutes: buildSubstitutesPayload(substituteRows) } : {}),
      }
      // `substitutes` is not in the generated request type yet.
      await leaveEmployeeMyRequestsCreate(payload as Parameters<typeof leaveEmployeeMyRequestsCreate>[0])
      toast.success(t("myRequests.submitted"))
      onOpenChange(false)
      resetForm()
      await onSubmitted?.()
    } catch (error) {
      // Keep the dialog open so the user can fix the input and retry.
      console.error("Failed to create request:", error)
      // A per-type limit (e.g. one day off a month) comes with a code: show it translated.
      const limit = leaveTypeLimitError(error)
      const limitMessage = limit ? t(`hr.limits.${limit.limit}`, { max: limit.max }) : null
      const errors = fieldErrors(error)
      delete errors.code
      delete errors.limit
      delete errors.max
      setFormErrors(limitMessage ? { ...errors, leave_type: limitMessage } : errors)
      toast.error(t("myRequests.submitFailed"), {
        description: limitMessage || getApiErrorMessage(error) || undefined,
      })
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass = "h-[34px] text-[13px] md:text-[13px]"
  // Native date pickers follow the theme (the calendar icon is invisible on dark otherwise).
  const dateClass = cn(inputClass, "dark:[color-scheme:dark]")

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) setFormErrors({})
      }}
    >
      <DialogContent
        data-testid="new-request-dialog"
        className={cn(
          "flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[560px]",
          // Below `sm`: a bottom sheet over the full width.
          "max-sm:top-auto max-sm:bottom-0 max-sm:left-0 max-sm:max-w-full max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-b-none max-sm:border-x-0 max-sm:border-b-0"
        )}
      >
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <DialogHeader className="shrink-0 gap-1 border-b px-5 pt-5 pb-3.5 pe-12 text-start">
            <DialogTitle className="text-[15px] font-semibold leading-5">{t("myRequests.createTitle")}</DialogTitle>
            <DialogDescription className="text-[13px]">{t("myRequests.createDescription")}</DialogDescription>
          </DialogHeader>

          <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-5 py-4">
            <Field label={t("shared.leaveType")} htmlFor="leave_type" error={formErrors.leave_type}>
              <Select
                value={formData.leave_type}
                onValueChange={(value) => {
                  setFormData({ ...formData, leave_type: value })
                  setFormErrors({})
                }}
              >
                <SelectTrigger id="leave_type" className={cn(inputClass, "w-full")} aria-invalid={!!formErrors.leave_type}>
                  <SelectValue placeholder={t("myRequests.selectLeaveType")} />
                </SelectTrigger>
                <SelectContent>
                  {leaveTypes === null && (
                    <div className="flex justify-center px-2 py-1.5">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden />
                    </div>
                  )}
                  {leaveTypes !== null && types.length === 0 && (
                    <div className="px-2 py-1.5 text-[13px] text-muted-foreground">
                      {t("myRequests.noLeaveTypesAvailable")}
                    </div>
                  )}
                  {types.map((type) => (
                    <SelectItem key={type.id} value={String(type.id)} className="text-[13px]">
                      <LeaveTypeChip name={typeName(type)} color={type.color} />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2 sm:gap-3">
              <Field label={t("shared.startDate")} htmlFor="start_date" error={formErrors.start_date}>
                <Input
                  id="start_date"
                  type="date"
                  className={dateClass}
                  value={formData.start_date}
                  aria-invalid={!!formErrors.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  required
                />
              </Field>
              <Field label={t("shared.endDate")} htmlFor="end_date" error={formErrors.end_date}>
                <Input
                  id="end_date"
                  type="date"
                  className={dateClass}
                  min={formData.start_date || undefined}
                  value={formData.end_date}
                  aria-invalid={!!formErrors.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  required
                />
              </Field>
            </div>

            <Field label={t("shared.reason")} htmlFor="reason">
              <Textarea
                id="reason"
                className="min-h-[84px] text-[13px] md:text-[13px]"
                placeholder={t("myRequests.reasonPlaceholder")}
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                rows={3}
              />
            </Field>

            {needsSubstitutes && (
              <Field label={t("hr.substitutes.requestSectionTitle")} error={formErrors.substitutes} testId="new-request-substitutes">
                {savedSubstitutes === null ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden />
                ) : savedSubstitutes.length > 0 ? (
                  <div className="grid gap-2">
                    <p className="text-xs leading-[17px] text-muted-foreground">
                      {t("hr.substitutes.savedListHint")}{" "}
                      <Link href="/leave/my-substitutes" className="text-foreground underline underline-offset-2">
                        {t("hr.substitutes.editSavedList")}
                      </Link>
                    </p>
                    <ol className="overflow-hidden rounded-lg border">
                      {orderedSubstitutes(savedSubstitutes).map((s, i) => (
                        <li
                          key={s.id}
                          className="flex min-h-[34px] items-center gap-2 border-b px-3 py-1.5 text-[13px] last:border-b-0"
                        >
                          <span className="w-4 shrink-0 text-xs tabular-nums text-muted-foreground">{i + 1}</span>
                          <LeaveAvatar name={s.substitute_name} />
                          <span className="shrink-0 font-medium">{s.substitute_name}</span>
                          {s.task && (
                            <span className="min-w-0 truncate text-xs text-muted-foreground" title={s.task}>
                              · {s.task}
                            </span>
                          )}
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : (
                  <div className="grid gap-2">
                    <p className="text-xs leading-[17px] text-muted-foreground">{t("hr.substitutes.inlineHint")}</p>
                    <SubstituteRowsEditor
                      rows={substituteRows}
                      onChange={setSubstituteRows}
                      users={substituteUsers}
                      selfId={userId}
                      disabled={submitting}
                      reorderable={false}
                    />
                  </div>
                )}
              </Field>
            )}

            <FieldError message={generalErrorText(formErrors)} />
          </div>

          <div className="flex shrink-0 flex-col-reverse gap-2 border-t px-5 py-3 sm:flex-row sm:justify-end">
            <button type="button" className={leaveButton.outline} onClick={() => onOpenChange(false)}>
              {t("shared.cancel")}
            </button>
            <button type="submit" className={leaveButton.primary} disabled={submitting} data-testid="new-request-submit">
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
              {t("myRequests.submitRequest")}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Field({
  label,
  htmlFor,
  error,
  children,
  testId,
}: {
  label: string
  htmlFor?: string
  error?: string
  children: ReactNode
  testId?: string
}) {
  const Label = htmlFor ? "label" : "span"
  return (
    <div className="grid min-w-0 content-start gap-1.5" data-testid={testId}>
      <Label {...(htmlFor ? { htmlFor } : {})} className="text-[13px] font-medium leading-4">
        {label}
      </Label>
      {children}
      <FieldError message={error} />
    </div>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p role="alert" className="text-xs leading-4 text-destructive">
      {message}
    </p>
  )
}
