"use client"

import type { FormEvent, ReactNode } from "react"
import { Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { bkgButton } from "./buttons"

/**
 * Compact dialog of the bookings section (the leave decision dialog's
 * style): 480px, 15px title + 12px description in a bordered header, a
 * 13px body and a bordered footer with Cancel + the primary action. With
 * `onSubmit` the body is a form (Enter submits).
 */
export function BookingsDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  onSubmit,
  submitLabel,
  submitting,
  submitDisabled,
  submitTone = "primary",
  cancelLabel,
  footer,
  testId = "bkg-dialog",
  className,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  description?: ReactNode
  children?: ReactNode
  onSubmit?: () => void
  submitLabel?: string
  submitting?: boolean
  submitDisabled?: boolean
  submitTone?: "primary" | "danger"
  cancelLabel?: string
  /** Replaces the default Cancel + submit footer. */
  footer?: ReactNode
  testId?: string
  className?: string
}) {
  const handle = (e: FormEvent) => {
    e.preventDefault()
    if (!submitting && !submitDisabled) onSubmit?.()
  }
  const actions =
    footer ??
    (onSubmit ? (
      <>
        <button type="button" className={bkgButton.outline} onClick={() => onOpenChange(false)} disabled={submitting}>
          {cancelLabel}
        </button>
        <button
          type="submit"
          className={submitTone === "danger" ? bkgButton.danger : bkgButton.primary}
          disabled={submitting || submitDisabled}
          data-testid={`${testId}-submit`}
        >
          {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
          {submitLabel}
        </button>
      </>
    ) : null)
  const body = (
    <>
      {children && <div className="flex flex-col gap-4 px-5 py-4">{children}</div>}
      {actions && <DialogFooter className="flex-row flex-wrap justify-end gap-2 border-t px-5 py-3">{actions}</DialogFooter>}
    </>
  )
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("gap-0 p-0 text-[13px] sm:max-w-[480px]", className)} data-testid={testId}>
        <DialogHeader className="space-y-1 border-b px-5 pb-4 pe-12 pt-5 text-start">
          <DialogTitle className="text-[15px] font-semibold leading-5">{title}</DialogTitle>
          {description ? (
            <DialogDescription className="text-xs">{description}</DialogDescription>
          ) : (
            <DialogDescription className="sr-only">{title}</DialogDescription>
          )}
        </DialogHeader>
        {onSubmit && !footer ? (
          <form onSubmit={handle} noValidate>
            {body}
          </form>
        ) : (
          body
        )}
      </DialogContent>
    </Dialog>
  )
}
