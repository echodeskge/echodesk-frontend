"use client"

import type { ReactNode } from "react"
import { Loader2 } from "lucide-react"
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

/**
 * Delete confirmation of the catalog pages (replaces `window.confirm`):
 * title, description naming the row, Cancel + destructive confirm. The
 * dialog stays open while `busy` so a failure (e.g. a 409) can be shown
 * without the row disappearing first.
 */
export function DeleteDialog({
  open,
  onOpenChange,
  title,
  description,
  cancelLabel,
  confirmLabel,
  onConfirm,
  busy,
  testId = "bkg-delete-dialog",
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  description: ReactNode
  cancelLabel: string
  confirmLabel: string
  onConfirm: () => void
  busy?: boolean
  testId?: string
}) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <AlertDialogContent data-testid={testId}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              // Keep the dialog open until the request settles; the page closes it.
              e.preventDefault()
              onConfirm()
            }}
            disabled={busy}
            className="bg-destructive text-white hover:bg-destructive/90"
            data-testid={`${testId}-confirm`}
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
