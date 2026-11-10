"use client"

import { createContext, useContext, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { rdButton } from "@/components/redesign/buttons"

/**
 * Where the settings shell wants the save bar: a DOM node under the scroll
 * area (design: the bar is the last row of the content column, outside the
 * scrolling page). Without a provider (tests, pages outside the shell) the bar
 * renders in place as a sticky footer.
 */
const SaveBarSlotContext = createContext<HTMLElement | null>(null)

export function SaveBarSlotProvider({ node, children }: { node: HTMLElement | null; children: ReactNode }) {
  return <SaveBarSlotContext.Provider value={node}>{children}</SaveBarSlotContext.Provider>
}

export function useSaveBarSlot(): HTMLElement | null {
  return useContext(SaveBarSlotContext)
}

export interface StickySaveBarLabels {
  /** "You have unsaved changes" */
  unsaved: string
  /** "Discard" */
  discard: string
  /** "Save changes" */
  save: string
  /** "Saving…" */
  saving?: string
  /** "All changes saved" — only for `mode="always"` while nothing changed. */
  saved?: string
}

export interface StickySaveBarProps {
  dirty: boolean
  saving?: boolean
  /** Runs the page's existing save (unchanged). Omit when `formId` submits a form. */
  onSave?: () => void
  /** Resets the form to the last loaded values. Without it no Discard button is shown. */
  onDiscard?: () => void
  /** Submit this form instead of calling `onSave` (the button gets `form={formId}`). */
  formId?: string
  labels: StickySaveBarLabels
  /**
   * `dirty` (design): the bar shows only while something changed.
   * `always`: the bar stays (pages whose Save was always reachable), showing
   * `labels.saved` while nothing changed.
   */
  mode?: "dirty" | "always"
  /** Disables Save (e.g. validation, load failed) — same rule as the page's old button. */
  saveDisabled?: boolean
  /** Replaces the status text (e.g. a validation warning); `messageTone="danger"` colours it. */
  message?: ReactNode
  messageTone?: "muted" | "danger"
  testId?: string
}

/**
 * Design sticky save bar: "You have unsaved changes · Discard · Save changes"
 * (10px 16px padding, top border, soft upward shadow, 32px buttons). Only a new
 * place for the page's own save: it calls the same handler, or submits the
 * same form.
 */
export function StickySaveBar({
  dirty,
  saving,
  onSave,
  onDiscard,
  formId,
  labels,
  mode = "dirty",
  saveDisabled,
  message,
  messageTone = "muted",
  testId = "settings-savebar",
}: StickySaveBarProps) {
  const slot = useSaveBarSlot()
  if (mode === "dirty" && !dirty && !saving && !message) return null

  const status = message ?? (dirty ? labels.unsaved : mode === "always" ? labels.saved ?? "" : "")
  const bar = (
    <div
      className={cn(
        // pe-16 keeps Save clear of the floating dialpad / team-chat buttons,
        // which sit at the bottom-right corner on every width.
        "flex min-h-[52px] shrink-0 flex-wrap items-center gap-2 border-t bg-background px-4 py-2.5 shadow-[0_-4px_12px_rgb(0_0_0/0.04)] pe-16",
        !slot && "sticky bottom-0 z-10"
      )}
      data-testid={testId}
      data-dirty={dirty || undefined}
    >
      <span
        className={cn(
          "min-w-0 flex-1 text-xs [text-wrap:pretty]",
          message && messageTone === "danger" ? "text-destructive" : "text-muted-foreground"
        )}
        aria-live="polite"
      >
        {status}
      </span>
      {onDiscard && dirty && (
        <button
          type="button"
          onClick={onDiscard}
          disabled={saving}
          className={cn(rdButton.outline, "px-3")}
          data-testid={`${testId}-discard`}
        >
          {labels.discard}
        </button>
      )}
      <button
        type={formId ? "submit" : "button"}
        form={formId}
        onClick={formId ? undefined : onSave}
        disabled={saving || saveDisabled}
        className={cn(rdButton.primary, "px-3")}
        data-testid={`${testId}-save`}
      >
        {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
        {saving ? labels.saving ?? labels.save : labels.save}
      </button>
    </div>
  )
  return slot ? createPortal(bar, slot) : bar
}
