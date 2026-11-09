import { describe, it, expect, vi, beforeEach } from "vitest"

const get = vi.fn()
vi.mock("@/api/axios", () => ({ default: { get: (...args: unknown[]) => get(...args) } }))

import { clientListParams, fetchEcommerceClients } from "@/app/(tenant)/ecommerce/clients/_lib/fetch-clients"

describe("clients list request", () => {
  beforeEach(() => get.mockReset().mockResolvedValue({ data: { count: 0, results: [] } }))

  it("sends is_active=false for the Inactive filter (the generated client dropped it)", async () => {
    await fetchEcommerceClients({ isActive: false, page: 1, pageSize: 20 })
    expect(get).toHaveBeenCalledWith("/api/ecommerce/admin/clients/?is_active=false&page=1&page_size=20")
  })

  it("keeps the generated client's query for All / Active and search", () => {
    expect(clientListParams({ page: 2, pageSize: 50 })).toBe("?page=2&page_size=50")
    expect(clientListParams({ isActive: true, page: 1, pageSize: 20, search: "ნინო a&b" })).toBe(
      `?is_active=true&page=1&page_size=20&search=${encodeURIComponent("ნინო a&b")}`
    )
    expect(clientListParams({})).toBe("")
  })
})
