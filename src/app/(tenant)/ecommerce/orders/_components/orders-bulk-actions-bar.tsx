"use client"

import { Truck, CheckCircle2, Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface OrdersBulkActionsBarProps {
  selectedCount: number
  loading: boolean
  onMarkShipped: () => void
  onMarkDelivered: () => void
  onExportSelected: () => void
  t: (key: string) => string
}

export function OrdersBulkActionsBar({
  selectedCount,
  loading,
  onMarkShipped,
  onMarkDelivered,
  onExportSelected,
  t,
}: OrdersBulkActionsBarProps) {
  if (selectedCount === 0) return null

  return (
    <div
      className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 transform"
      role="region"
      aria-live="polite"
      aria-label="Selection actions"
    >
      <div className="flex items-center gap-3 rounded-lg border bg-background px-6 py-3 shadow-lg">
        <span className="text-sm font-medium">
          {t("bulkActions.selected").replace("{count}", String(selectedCount))}
        </span>
        <Button
          size="sm"
          variant="outline"
          disabled={loading}
          onClick={onMarkShipped}
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Truck className="mr-2 h-4 w-4" />
          )}
          {t("bulkActions.markShipped")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={loading}
          onClick={onMarkDelivered}
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="mr-2 h-4 w-4" />
          )}
          {t("bulkActions.markDelivered")}
        </Button>
        <Button size="sm" variant="outline" onClick={onExportSelected}>
          <Download className="mr-2 h-4 w-4" />
          {t("bulkActions.exportSelected")}
        </Button>
      </div>
    </div>
  )
}
