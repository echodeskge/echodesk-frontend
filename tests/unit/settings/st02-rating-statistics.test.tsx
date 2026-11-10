/**
 * ST-02 Rating statistics as a STATS page: staff gate, stat cards, sortable
 * per-agent table, row click opens the sessions dialog, and the date /
 * source controls feed the same hook arguments.
 */
import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { screen, fireEvent, within } from "@testing-library/react"
import { renderSt } from "./st-helpers"

const state = { staff: true }
const statsCalls: unknown[][] = []
const sessionCalls: unknown[][] = []

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { is_staff: state.staff } }) }))
const users = [
  { user_id: 1, name: "Ana", email: "ana@x.ge", total_ratings: 5, average_rating: 4.4, social_ratings: 5, call_ratings: 0, rating_breakdown: { "5": 2, "4": 3, "3": 0, "2": 0, "1": 0 } },
  { user_id: 2, name: "Luka", email: "luka@x.ge", total_ratings: 4, average_rating: 4.5, social_ratings: 4, call_ratings: 0, rating_breakdown: { "5": 2, "4": 2, "3": 0, "2": 0, "1": 0 } },
]
vi.mock("@/hooks/api/useSocial", () => ({
  useRatingStatistics: (...args: unknown[]) => {
    statsCalls.push(args)
    return { data: { users, overall: { total_ratings: 9, average_rating: 4.44, by_source: { social: { total: 9 } } } }, isLoading: false, error: null }
  },
  useUserChatSessions: (...args: unknown[]) => {
    sessionCalls.push(args)
    return { data: args[0] ? { user: { name: "Luka" }, total_sessions: 0, start_date: "", end_date: "", sessions: [] } : undefined, isLoading: false }
  },
}))

import RatingStatisticsPage from "@/app/(tenant)/settings/social/rating-statistics/page"

beforeEach(() => {
  state.staff = true
  statsCalls.length = 0
  sessionCalls.length = 0
})

const names = () => screen.getAllByTestId("rating-table-row").map((r) => within(r).getAllByText(/^(Ana|Luka)$/)[0].textContent)

describe("Settings > Rating statistics (ST-02)", () => {
  it("non-staff users get the superadmin message", () => {
    state.staff = false
    renderSt(<RatingStatisticsPage />)
    expect(screen.getByTestId("rating-statistics-no-access")).toHaveTextContent("Only superadmins")
  })

  it("shows the four stat cards and sorts by average (desc) then by name", () => {
    renderSt(<RatingStatisticsPage />)
    expect(screen.getByTestId("stat-rated-users")).toHaveTextContent("2")
    expect(screen.getByTestId("stat-total-ratings")).toHaveTextContent("9")
    expect(screen.getByTestId("stat-total-ratings")).toHaveTextContent("Social: 9")
    expect(screen.getByTestId("stat-average")).toHaveTextContent("4.4")
    expect(screen.getByTestId("stat-top")).toHaveTextContent("4.5")
    expect(names()).toEqual(["Luka", "Ana"])
    fireEvent.click(screen.getByTestId("sort-name"))
    expect(names()).toEqual(["Luka", "Ana"])
    fireEvent.click(screen.getByTestId("sort-name"))
    expect(names()).toEqual(["Ana", "Luka"])
  })

  it("row click opens the sessions dialog for that user", () => {
    renderSt(<RatingStatisticsPage />)
    fireEvent.click(screen.getAllByTestId("rating-table-row")[0])
    expect(screen.getByRole("dialog")).toHaveTextContent("Luka")
    expect(sessionCalls.at(-1)?.[0]).toBe(2)
  })

  it("date inputs and the source filter feed the same hook arguments", () => {
    renderSt(<RatingStatisticsPage />)
    fireEvent.change(screen.getByLabelText("Session Start"), { target: { value: "2026-10-01" } })
    fireEvent.change(screen.getByLabelText("Session End"), { target: { value: "2026-10-31" } })
    fireEvent.click(screen.getByRole("radio", { name: /Phone Calls/ }))
    expect(statsCalls.at(-1)).toEqual(["2026-10-01", "2026-10-31", "calls"])
  })
})
