/**
 * ST-02 Auto-posting as a FORM PAGE: the save bar shows only with changes
 * (the old Save was disabled without them), saves formData unchanged, and
 * the queue filter keeps sending the same status param.
 */
import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { screen, fireEvent } from "@testing-library/react"
import { renderSt } from "./st-helpers"

const mutateAsync = vi.fn().mockResolvedValue({})
const generate = vi.fn().mockResolvedValue({})
const listCalls: unknown[] = []

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock("@/components/social/PublishingStatusBanner", () => ({ PublishingStatusBanner: () => <div data-testid="banner-mock" /> }))
vi.mock("@/hooks/api/useAutoPost", () => ({
  useAutoPostSettings: () => ({ data: { is_enabled: false, post_to_facebook: true, post_to_instagram: true, posting_time: "10:00", timezone: "UTC", tone: "professional", content_source: "both", content_language: "en", max_posts_per_day: 1, require_approval: true }, isLoading: false }),
  useUpdateAutoPostSettings: () => ({ mutateAsync, isPending: false }),
  useAutoPostList: (params: unknown) => {
    listCalls.push(params)
    return { data: { results: [] }, isLoading: false }
  },
  useGeneratePost: () => ({ mutateAsync: generate, isPending: false }),
}))

import AutoPostingPage from "@/app/(tenant)/settings/social/auto-posting/page"

beforeEach(() => {
  mutateAsync.mockClear()
  generate.mockClear()
  listCalls.length = 0
})

describe("Settings > Auto-posting (ST-02)", () => {
  it("shows the save bar only after a change and saves formData", async () => {
    renderSt(<AutoPostingPage />)
    expect(screen.queryByTestId("settings-savebar")).toBeNull()
    fireEvent.click(screen.getByRole("switch", { name: /disabled/i }))
    fireEvent.change(screen.getByLabelText(/Max Posts Per Day/i), { target: { value: "3" } })
    fireEvent.click(screen.getByTestId("settings-savebar-save"))
    expect(mutateAsync).toHaveBeenCalledWith({ is_enabled: true, max_posts_per_day: 3 })
  })

  it("Discard clears the unsaved changes", () => {
    renderSt(<AutoPostingPage />)
    fireEvent.change(screen.getByLabelText(/Max Posts Per Day/i), { target: { value: "4" } })
    fireEvent.click(screen.getByTestId("settings-savebar-discard"))
    expect(screen.getByLabelText(/Max Posts Per Day/i)).toHaveValue(1)
    expect(screen.queryByTestId("settings-savebar")).toBeNull()
  })

  it("Generate now and the queue status filter keep their behaviour", async () => {
    renderSt(<AutoPostingPage />)
    fireEvent.click(screen.getByTestId("auto-post-generate"))
    expect(generate).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole("radio", { name: /Post Queue/i }))
    fireEvent.click(await screen.findByRole("radio", { name: /^Failed$/i }))
    expect(listCalls.at(-1)).toEqual({ status: "failed" })
    fireEvent.click(screen.getByRole("radio", { name: /^All$/i }))
    expect(listCalls.at(-1)).toEqual({ status: undefined })
  })
})
