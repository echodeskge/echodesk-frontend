"use client"

import { Truck, CheckCircle2, Download, Loader2 } from "lucide-react"
import { BulkBar, rdButton } from "../../_components/ui"

type Translate = (key: string, values?: Record<string, string | number>) => string

interface OrdersBulkActionsBarProps {
  selectedCount: number
  loading: boolean
  onMarkShipped: () => void
  onMarkDelivered: () => void
  onExportSelected: () => void
  onClear: () => void
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
  t,
  tUi,
}: OrdersBulkActionsBarProps) {
  const Spin = <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
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
