"use client"

import { useTranslations } from "next-intl"
import { ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

/** Wireframe colours per section type (decorative preview of a template). */
const BLOCK_STYLE: Record<string, { icon: string; bg: string }> = {
  hero_banner: { icon: "🖼", bg: "bg-blue-100 dark:bg-blue-900/40" },
  featured_products: { icon: "🛍", bg: "bg-violet-100 dark:bg-violet-900/40" },
  category_grid: { icon: "📂", bg: "bg-emerald-100 dark:bg-emerald-900/40" },
  statistics: { icon: "📊", bg: "bg-amber-100 dark:bg-amber-900/40" },
  branches: { icon: "📍", bg: "bg-red-100 dark:bg-red-900/40" },
  custom_content: { icon: "📝", bg: "bg-gray-100 dark:bg-gray-800" },
  product_by_attribute: { icon: "✨", bg: "bg-pink-100 dark:bg-pink-900/40" },
}

const cell = "rounded-sm bg-white/60 dark:bg-white/10"

/** One section of a template preview, labelled with the short translated type (`homepageBuilder.wireframe.*`). */
export function MiniWireframeBlock({ type }: { type: string }) {
  const t = useTranslations("homepageBuilder")
  const style = BLOCK_STYLE[type] || { icon: "📄", bg: "bg-gray-100 dark:bg-gray-800" }
  const label = t.has(`wireframe.${type}`) ? t(`wireframe.${type}`) : type
  const caption = (
    <span className="mb-1 block truncate text-[8px] font-medium opacity-70">
      <span aria-hidden>{style.icon}</span> {label}
    </span>
  )

  if (type === "hero_banner") {
    return (
      <div className={cn(style.bg, "relative flex min-h-[40px] flex-1 flex-col items-center justify-center overflow-hidden rounded-md p-1.5")}>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-200/50 to-blue-300/30 dark:from-blue-800/30 dark:to-blue-700/20" />
        <span className="z-10 truncate text-[10px] font-semibold opacity-80">
          <span aria-hidden>{style.icon}</span> {label}
        </span>
        <div className="z-10 mt-1 flex gap-0.5">
          <div className="h-1 w-1 rounded-full bg-current opacity-60" />
          <div className="h-1 w-1 rounded-full bg-current opacity-30" />
          <div className="h-1 w-1 rounded-full bg-current opacity-30" />
        </div>
      </div>
    )
  }
  if (type === "featured_products" || type === "product_by_attribute") {
    return (
      <div className={cn(style.bg, "rounded-md p-1.5")}>
        {caption}
        <div className="grid grid-cols-4 gap-0.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={cn(cell, "aspect-square")} />
          ))}
        </div>
      </div>
    )
  }
  if (type === "category_grid") {
    return (
      <div className={cn(style.bg, "rounded-md p-1.5")}>
        {caption}
        <div className="grid grid-cols-3 gap-0.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className={cn(cell, "aspect-[4/3]")} />
          ))}
        </div>
      </div>
    )
  }
  if (type === "statistics") {
    return (
      <div className={cn(style.bg, "rounded-md p-1.5")}>
        {caption}
        <div className="grid grid-cols-4 gap-1">
          {["99+", "50", "200", "4.8"].map((n) => (
            <div key={n} className="text-center text-[8px] font-bold tabular-nums opacity-60">
              {n}
            </div>
          ))}
        </div>
      </div>
    )
  }
  if (type === "branches") {
    return (
      <div className={cn(style.bg, "rounded-md p-1.5")}>
        {caption}
        <div className="space-y-0.5">
          <div className={cn(cell, "h-2 w-3/4")} />
          <div className={cn(cell, "h-2 w-2/3")} />
        </div>
      </div>
    )
  }
  return (
    <div className={cn(style.bg, "rounded-md p-1.5")}>
      {caption}
      <div className="space-y-0.5">
        <div className={cn(cell, "h-1.5 w-full")} />
        <div className={cn(cell, "h-1.5 w-4/5")} />
      </div>
    </div>
  )
}

/**
 * A homepage template card (design: radius 8, preview, 13px/600 name, 12px
 * description, 11px section count). The whole card is a button that opens the
 * existing "replace homepage" confirmation.
 */
export function TemplateCard({
  name,
  description,
  sectionTypes,
  sectionCountLabel,
  applyLabel,
  onApply,
}: {
  name: string
  description: string
  sectionTypes: string[]
  sectionCountLabel: string
  applyLabel: string
  onApply: () => void
}) {
  return (
    <button
      type="button"
      onClick={onApply}
      className="group flex min-w-0 flex-col overflow-hidden rounded-lg border bg-card text-start transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      data-testid="hb-template"
    >
      <div className="w-full border-b bg-muted/50 p-2" aria-hidden>
        <div className="mb-1.5 flex items-center gap-1">
          <div className="h-1.5 w-1.5 rounded-full bg-red-400" />
          <div className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
          <div className="h-1.5 w-1.5 rounded-full bg-green-400" />
          <div className="ms-1.5 h-2 flex-1 rounded-full bg-white/80 dark:bg-white/10" />
        </div>
        <div className="flex min-h-[132px] flex-col gap-1 rounded-md bg-white p-1.5 dark:bg-gray-900">
          {sectionTypes.map((type, i) => (
            <MiniWireframeBlock key={i} type={type} />
          ))}
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 p-3">
        <span className="text-[13px] font-semibold">{name}</span>
        <span className="line-clamp-2 text-xs text-muted-foreground">{description}</span>
        <span className="mt-auto flex items-center justify-between gap-2 pt-1.5 text-[11px] text-muted-foreground">
          <span className="tabular-nums">{sectionCountLabel}</span>
          <span className="inline-flex items-center gap-1 font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            {applyLabel}
            <ArrowRight className="h-3 w-3 rtl:rotate-180" aria-hidden />
          </span>
        </span>
      </div>
    </button>
  )
}
