export const PRODUCT_STATUS_OPTIONS = [
  "all",
  "active",
  "draft",
  "inactive",
  "out_of_stock",
] as const

// Translation key (in the "products" namespace) for each status value.
export const PRODUCT_STATUS_LABEL_KEYS: Record<string, string> = {
  active: "active",
  draft: "draft",
  inactive: "inactive",
  out_of_stock: "outOfStock",
}
