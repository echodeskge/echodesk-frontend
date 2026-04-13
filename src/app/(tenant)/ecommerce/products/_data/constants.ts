export const PRODUCT_STATUS_OPTIONS = [
  "all",
  "active",
  "draft",
  "inactive",
  "out_of_stock",
] as const

export const PRODUCT_STATUS_BADGE_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  active: "default",
  draft: "secondary",
  inactive: "outline",
  out_of_stock: "destructive",
}
