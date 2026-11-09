"use client"

import { Pencil, Trash2 } from "lucide-react"
import type { PromoCode } from "@/api/generated/interfaces"
import {
  IdText,
  MoneyCell,
  PromoStatePill,
  TonePill,
  formatCount,
  formatEcDate,
  promoCodeState,
  rdButton,
  type EcColumn,
} from "@/app/(tenant)/ecommerce/_components/ui"

type T = (key: string, values?: Record<string, string | number>) => string

/** "15%" for a percentage code (value as the API sends it, trailing zeros dropped). */
export function formatPercentValue(value: string | number | null | undefined): string {
  const n = Number(value)
  if (value === null || value === undefined || value === "" || !Number.isFinite(n)) return "—"
  return `${Number(n.toFixed(2))}%`
}

/** "Nov 2 – Dec 1" (each side "—" when missing). */
export function validRange(from: string | null | undefined, until: string | null | undefined, locale: string): string {
  return `${formatEcDate(from, locale)} – ${formatEcDate(until, locale)}`
}

/**
 * Promo codes table (SPEC §2 EC-03): code | type | discount | min order |
 * uses | valid | status | actions. Below 768px: code + status on line 1;
 * discount · min order · uses · valid on line 2; edit / delete on line 3.
 */
export function getPromoColumns({
  t,
  locale,
  now,
  onEdit,
  onDelete,
}: {
  t: T
  locale: string
  now: Date
  onEdit: (code: PromoCode) => void
  onDelete: (code: PromoCode) => void
}): EcColumn<PromoCode>[] {
  return [
    {
      id: "code",
      header: t("table.code"),
      width: "minmax(0,1.2fr)",
      mobile: "title",
      cell: (c) => <IdText className="text-[13px] font-medium">{c.code}</IdText>,
    },
    {
      id: "type",
      header: t("table.type"),
      width: "110px",
      mobile: "hidden",
      cell: (c) => (
        <TonePill tone="neutral">
          {String(c.discount_type) === "percentage" ? t("types.percentage") : t("types.fixed")}
        </TonePill>
      ),
    },
    {
      id: "discount",
      header: t("table.discount"),
      width: "100px",
      align: "end",
      mobile: "meta",
      cell: (c) =>
        String(c.discount_type) === "percentage" ? (
          <span className="font-medium tabular-nums">{formatPercentValue(c.discount_value)}</span>
        ) : (
          <MoneyCell value={c.discount_value} className="font-medium" />
        ),
    },
    {
      id: "minOrder",
      header: t("table.minOrder"),
      width: "100px",
      align: "end",
      mobile: "meta",
      cell: (c) => (
        <span className="inline-flex items-baseline gap-1">
          {/* Phones: line 2 has no column headers, so name the figure. */}
          <span className="@3xl:hidden">{t("table.minOrder")}</span>
          {c.min_order_amount ? <MoneyCell value={c.min_order_amount} /> : <span className="text-muted-foreground">—</span>}
        </span>
      ),
    },
    {
      id: "usage",
      header: t("table.usage"),
      width: "80px",
      align: "end",
      mobile: "meta",
      cell: (c) => (
        <span className="tabular-nums" title={c.max_uses == null ? t("noLimit") : undefined}>
          <span className="@3xl:hidden">{t("table.usage")} </span>
          {formatCount(c.times_used)}
          {c.max_uses !== undefined && c.max_uses !== null ? (
            <span className="text-muted-foreground"> / {formatCount(c.max_uses)}</span>
          ) : null}
        </span>
      ),
    },
    {
      id: "valid",
      header: t("table.valid"),
      width: "minmax(150px,1fr)",
      mobile: "meta",
      muted: true,
      cell: (c) => (
        <span
          className="truncate tabular-nums"
          title={`${t("table.validFrom")}: ${formatEcDate(c.valid_from, locale, { year: "always" })} · ${t("table.validUntil")}: ${formatEcDate(c.valid_until, locale, { year: "always" })}`}
        >
          {validRange(c.valid_from, c.valid_until, locale)}
        </span>
      ),
    },
    {
      id: "status",
      header: t("table.status"),
      width: "130px",
      mobile: "end",
      cell: (c) => <PromoStatePill state={promoCodeState(c, now)} />,
    },
    {
      id: "actions",
      header: <span className="sr-only">{t("table.actions")}</span>,
      width: "64px",
      align: "end",
      mobile: "actions",
      cell: (c) => (
        <span className="flex items-center justify-end gap-0.5">
          <button
            type="button"
            className={rdButton.ghostIconSm}
            onClick={() => onEdit(c)}
            aria-label={t("editNamed", { code: c.code })}
            title={t("editNamed", { code: c.code })}
            data-testid="promo-edit"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
          </button>
          <button
            type="button"
            className={rdButton.ghostIconSm}
            onClick={() => onDelete(c)}
            aria-label={t("deleteNamed", { code: c.code })}
            title={t("deleteNamed", { code: c.code })}
            data-testid="promo-delete"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          </button>
        </span>
      ),
    },
  ]
}
