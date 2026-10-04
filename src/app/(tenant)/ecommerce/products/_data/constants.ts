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

// Translation key (in the "products" namespace) for each status value.
export const PRODUCT_STATUS_LABEL_KEYS: Record<string, string> = {
  active: "active",
  draft: "draft",
  inactive: "inactive",
  out_of_stock: "outOfStock",
}
