import axios from "@/api/axios"
import type { PaginatedEcommerceClientListList } from "@/api/generated/interfaces"

export interface ClientListQuery {
  /** `undefined` = all, `true` = active, `false` = inactive. */
  isActive?: boolean
  page?: number
  pageSize?: number
  search?: string
}

/** The query string the clients list sends (same order and names as the generated client). */
export function clientListParams({ isActive, page, pageSize, search }: ClientListQuery): string {
  const parts: string[] = []
  if (isActive !== undefined) parts.push(`is_active=${isActive}`)
  if (page) parts.push(`page=${page}`)
  if (pageSize) parts.push(`page_size=${pageSize}`)
  if (search) parts.push(`search=${encodeURIComponent(search)}`)
  return parts.length ? `?${parts.join("&")}` : ""
}

/**
 * GET /api/ecommerce/admin/clients/ — the same request as the generated
 * `ecommerceAdminClientsList`, except that `is_active=false` is really sent:
 * the generated client drops falsy booleans (`isActive ? ... : null`), so the
 * "Inactive" filter used to list every client.
 */
export async function fetchEcommerceClients(query: ClientListQuery): Promise<PaginatedEcommerceClientListList> {
  const response = await axios.get<PaginatedEcommerceClientListList>(
    `/api/ecommerce/admin/clients/${clientListParams(query)}`
  )
  return response.data
}
