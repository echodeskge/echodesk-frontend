import type { EcommerceClientList } from "@/api/generated/interfaces"

/** Columns the clients table can sort by (on the loaded page, as the old table did). */
export type ClientSortKey = "full_name" | "phone_number" | "is_verified" | "is_active" | "created_at"
export interface ClientSort {
  key: ClientSortKey
  desc: boolean
}

function value(c: EcommerceClientList, key: ClientSortKey): string | number {
  switch (key) {
    case "is_verified":
      return c.is_verified ? 1 : 0
    case "is_active":
      return c.is_active ? 1 : 0
    case "created_at": {
      const t = Date.parse(c.created_at)
      return Number.isNaN(t) ? 0 : t
    }
    default:
      return (c[key] || "").toLocaleLowerCase()
  }
}

/** Stable sort of the current page; `null` keeps the API order. */
export function sortClients(rows: EcommerceClientList[], sort: ClientSort | null): EcommerceClientList[] {
  if (!sort) return rows
  const dir = sort.desc ? -1 : 1
  return rows
    .map((row, i) => ({ row, i }))
    .sort((a, b) => {
      const va = value(a.row, sort.key)
      const vb = value(b.row, sort.key)
      const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb))
      return cmp !== 0 ? cmp * dir : a.i - b.i
    })
    .map((x) => x.row)
}

/** Header click cycle, like the old column header menu: ascending -> descending -> API order. */
export function nextSort(current: ClientSort | null, key: ClientSortKey): ClientSort | null {
  if (!current || current.key !== key) return { key, desc: false }
  if (!current.desc) return { key, desc: true }
  return null
}
