"use client"

import { Check, Star, Trash2, X } from "lucide-react"
import type { ProductReview } from "@/api/generated/interfaces"
import {
  ProductThumb,
  ReviewStatusPill,
  TonePill,
  formatEcDate,
  localizedText,
  rdButton,
  type EcColumn,
} from "@/app/(tenant)/ecommerce/_components/ui"
import { cn } from "@/lib/utils"

export type ReviewFilter = "all" | "pending" | "approved"

type T = (key: string, values?: Record<string, string | number>) => string

/** 5 stars, 12px, amber fill for the rating (one accessible label for the group). */
export function StarRating({ rating, label }: { rating: number; label: string }) {
  return (
    <span role="img" aria-label={label} title={label} className="inline-flex items-center gap-px" data-testid="review-rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          aria-hidden
          className={cn(
            "h-3 w-3",
            star <= rating ? "fill-amber-400 text-amber-400" : "fill-transparent text-muted-foreground/40"
          )}
        />
      ))}
    </span>
  )
}

/** "Title: content" on one line (full text in the tooltip). */
export function reviewText(r: Pick<ProductReview, "title" | "content">): string {
  return [r.title, r.content].filter(Boolean).join(": ")
}

/**
 * Reviews moderation table (SPEC §2 EC-03). Desktop: product | rating |
 * review | client | verified | status | date | actions. Below 768px: review
 * + status on line 1; product · rating · client · verified · date on line 2;
 * the moderation buttons on line 3.
 */
export function getReviewColumns({
  t,
  locale,
  actionLoading,
  onApprove,
  onReject,
  onDelete,
}: {
  t: T
  locale: string
  actionLoading: number | null
  onApprove: (r: ProductReview) => void
  onReject: (r: ProductReview) => void
  onDelete: (r: ProductReview) => void
}): EcColumn<ProductReview>[] {
  return [
    {
      id: "product",
      header: t("table.product"),
      width: "minmax(0,1.3fr)",
      mobile: "meta",
      cell: (r) => {
        const name = localizedText(r.product_name, locale) || t("productFallback", { id: r.product })
        return (
          <span className="flex min-w-0 items-center gap-2" title={r.product_sku ? `${name} · ${r.product_sku}` : name}>
            <ProductThumb src={r.product_image} alt="" className="size-5 @3xl:size-8" />
            <span className="truncate @3xl:font-medium @3xl:text-foreground">{name}</span>
          </span>
        )
      },
    },
    {
      id: "rating",
      header: t("table.rating"),
      width: "80px",
      mobile: "meta",
      cell: (r) => <StarRating rating={r.rating} label={t("ratingLabel", { rating: r.rating })} />,
    },
    {
      id: "review",
      header: t("table.review"),
      width: "minmax(0,2fr)",
      mobile: "title",
      cell: (r) => {
        const text = reviewText(r)
        return (
          <span className="min-w-0 truncate" title={text || undefined}>
            {r.title && <span className="font-medium">{r.title}: </span>}
            <span className={r.title ? "text-muted-foreground" : undefined}>{r.content || "—"}</span>
          </span>
        )
      },
    },
    {
      id: "client",
      header: t("table.client"),
      width: "minmax(0,0.9fr)",
      mobile: "meta",
      cell: (r) => <span className="truncate">{r.client_name || "—"}</span>,
    },
    {
      id: "verified",
      header: t("table.verified"),
      width: "120px",
      mobile: "meta",
      cell: (r) =>
        r.is_verified_purchase ? (
          <TonePill tone="success">{t("verified")}</TonePill>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: "status",
      header: t("table.status"),
      width: "120px",
      mobile: "end",
      cell: (r) => <ReviewStatusPill approved={r.is_approved} />,
    },
    {
      id: "date",
      header: t("table.date"),
      width: "80px",
      mobile: "meta",
      muted: true,
      cell: (r) => <span className="tabular-nums">{formatEcDate(r.created_at, locale)}</span>,
    },
    {
      id: "actions",
      header: <span className="sr-only">{t("table.actions")}</span>,
      width: "160px",
      align: "end",
      mobile: "actions",
      cell: (r) => {
        const busy = actionLoading === r.id
        return (
          <span className="flex items-center justify-end gap-1.5">
            {!r.is_approved ? (
              <button
                type="button"
                className={rdButton.primarySm}
                onClick={() => onApprove(r)}
                disabled={busy}
                data-testid="review-approve"
              >
                <Check className="h-3.5 w-3.5" aria-hidden />
                {t("approve")}
              </button>
            ) : (
              <button
                type="button"
                className={rdButton.dangerSm}
                onClick={() => onReject(r)}
                disabled={busy}
                data-testid="review-reject"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
                {t("reject")}
              </button>
            )}
            <button
              type="button"
              className={rdButton.ghostIconSm}
              onClick={() => onDelete(r)}
              aria-label={t("deleteNamed", { name: r.client_name || "—" })}
              title={t("delete")}
              data-testid="review-delete"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
            </button>
          </span>
        )
      },
    },
  ]
}
