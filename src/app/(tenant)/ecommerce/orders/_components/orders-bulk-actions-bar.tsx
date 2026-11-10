"use client"

import { Truck, CheckCircle2, Download, Loader2, RotateCcw } from "lucide-react"
import { BulkBar, rdButton } from "../../_components/ui"

type Translate = (key: string, values?: Record<string, string | number>) => string

interface OrdersBulkActionsBarProps {
  selectedCount: number
  loading: boolean
  onMarkShipped: () => void
  onMarkDelivered: () => void
  onExportSelected: () => void
  onClear: () => void
  /** Cleaned view: only "Restore selected" (no status changes or export). */
  cleaned?: boolean
  onRestoreSelected?: () => void
  t: Translate
  tUi: Translate
}

/** Replaces the toolbar while orders are selected (same three actions as before). */
export function OrdersBulkActionsBar({
  selectedCount,
  loading,
  onMarkShipped,
  onMarkDelivered,
  onExportSelected,
  onClear,
  cleaned,
  onRestoreSelected,
  t,
  tUi,
}: OrdersBulkActionsBarProps) {
  const Spin = <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
  if (cleaned) {
    return (
      <BulkBar
        count={selectedCount}
        label={t("bulkActions.selected", { count: selectedCount })}
        clearLabel={tUi("clearSelection")}
        onClear={onClear}
      >
        {/* Store admins only: managers can look at cleaned orders but not restore them. */}
        {onRestoreSelected && (
          <button
            type="button"
            className={rdButton.outlineSm}
            disabled={loading}
            onClick={onRestoreSelected}
            data-testid="ec-orders-restore-selected"
          >
            {loading ? Spin : <RotateCcw className="h-3.5 w-3.5" aria-hidden />}
            {t("cleaned.restoreSelected")}
          </button>
        )}
      </BulkBar>
    )
  }
  return (
    <BulkBar
      count={selectedCount}
      label={t("bulkActions.selected", { count: selectedCount })}
      clearLabel={tUi("clearSelection")}
      onClear={onClear}
    >
      <button type="button" className={rdButton.outlineSm} disabled={loading} onClick={onMarkShipped}>
        {loading ? Spin : <Truck className="h-3.5 w-3.5" aria-hidden />}
        {t("bulkActions.markShipped")}
      </button>
      <button type="button" className={rdButton.outlineSm} disabled={loading} onClick={onMarkDelivered}>
        {loading ? Spin : <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />}
        {t("bulkActions.markDelivered")}
      </button>
      <button type="button" className={rdButton.outlineSm} onClick={onExportSelected}>
        <Download className="h-3.5 w-3.5" aria-hidden />
        {t("bulkActions.exportSelected")}
      </button>
    </BulkBar>
  )
}
