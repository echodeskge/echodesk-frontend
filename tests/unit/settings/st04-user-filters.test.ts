/**
 * ST-04 bug fix: the users page role / status / account / staff filters were
 * shown but never sent, so the list did not change. They now go to
 * GET /api/users/ (UserViewSet filterset); the unfiltered request is unchanged.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import React from "react"

vi.mock("@/api/generated/api", () => ({
  usersList: vi.fn(),
  usersCreate: vi.fn(),
  usersUpdate: vi.fn(),
  usersPartialUpdate: vi.fn(),
  usersDestroy: vi.fn(),
}))
vi.mock("@/api/axios", () => ({ default: { get: vi.fn() } }))
vi.mock("@/services/auth", () => ({ authService: { isAuthenticated: vi.fn(() => true) } }))

import { useUsers, userFilterParams, userKeys } from "@/hooks/api/useUsers"
import { usersList } from "@/api/generated/api"
import axios from "@/api/axios"

const page = { count: 0, next: null, previous: null, results: [] }

function wrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  return ({ children }: { children: React.ReactNode }) => React.createElement(QueryClientProvider, { client: qc }, children)
}

describe("useUsers filters (ST-04 fix)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(usersList).mockResolvedValue(page as never)
    vi.mocked(axios.get).mockResolvedValue({ data: page } as never)
  })

  it("keeps today's request when no filter is set", async () => {
    const { result } = renderHook(
      () => useUsers({ page: 1, search: "ana", filters: { role: undefined, status: undefined, isActive: null, isStaff: null } }),
      { wrapper: wrapper() }
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(axios.get).not.toHaveBeenCalled()
    expect(usersList).toHaveBeenCalledWith(
      undefined, undefined, undefined, undefined, undefined, undefined, undefined, 1, undefined, undefined, "ana"
    )
  })

  it("sends role, status and false booleans", async () => {
    const { result } = renderHook(
      () => useUsers({ page: 2, search: undefined, filters: { role: "agent", status: "pending", isActive: false, isStaff: false } }),
      { wrapper: wrapper() }
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(usersList).not.toHaveBeenCalled()
    expect(axios.get).toHaveBeenCalledWith("/api/users/", {
      params: { page: 2, search: undefined, role: "agent", status: "pending", is_active: false, is_staff: false },
    })
  })

  it("puts the filters in the query key only when set", () => {
    expect(userKeys.list(1, "x", {})).toEqual(["users", "list", { page: 1, search: "x" }])
    expect(userKeys.list(1, "x", userFilterParams({ isStaff: true }))).toEqual(["users", "list", { page: 1, search: "x", is_staff: true }])
    expect(userFilterParams({ role: undefined, isActive: null })).toEqual({})
  })
})
