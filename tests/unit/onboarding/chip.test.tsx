/** "Finish setup" header chip: admins while steps are pending; the sheet opens / skips steps. */
import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, screen, waitFor } from "@testing-library/react"

const mocks = vi.hoisted(() => ({
  access: { loaded: true, isSuperuser: false, isStaff: true, has: () => false } as {
    loaded: boolean
    isSuperuser: boolean
    isStaff: boolean
    has: (c: string) => boolean
  },
  push: vi.fn(),
  get: vi.fn(),
  post: vi.fn(),
}))

vi.mock("@/hooks/useMyAccess", () => ({ useMyAccess: () => mocks.access }))
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: mocks.push, prefetch: vi.fn() }),
  usePathname: () => "/tickets",
}))
vi.mock("@/api/axios", () => ({
  default: { get: (...a: unknown[]) => mocks.get(...a), post: (...a: unknown[]) => mocks.post(...a) },
}))

import { FinishSetupChip } from "@/app/(tenant)/onboarding/_components/FinishSetupChip"
import { ADMIN, AGENT, renderOnb, state, step } from "./helpers"

beforeEach(() => {
  mocks.push.mockReset()
  mocks.get.mockReset()
  mocks.post.mockReset()
  mocks.access = ADMIN
  mocks.get.mockResolvedValue({ data: state([step("workspace", 0, { status: "done" }), step("tickets", 10), step("leave_management", 60)]) })
})

describe("FinishSetupChip", () => {
  it("shows the pending count for admins and lists the steps with Open / Skip", async () => {
    renderOnb(<FinishSetupChip />)
    const chip = await screen.findByTestId("onb-chip")
    expect(screen.getByTestId("onb-chip-count")).toHaveTextContent("2")
    fireEvent.click(chip)
    await screen.findByTestId("onb-chip-sheet")
    expect(screen.getByTestId("onb-chip-step-workspace")).toHaveTextContent("Done")
    expect(screen.queryByTestId("onb-chip-skip-workspace")).not.toBeInTheDocument()
    expect(screen.getByTestId("onb-chip-step-tickets")).toHaveTextContent("To do")

    fireEvent.click(screen.getByTestId("onb-chip-open-tickets"))
    expect(mocks.push).toHaveBeenCalledWith("/onboarding?step=tickets")
  })

  it("skip posts and updates the count; the chip disappears when nothing is pending", async () => {
    mocks.post.mockImplementation((url: string) => {
      const key = url.split("/")[3]
      return Promise.resolve({ data: { step: step(key, 10, { status: "skipped" }) } })
    })
    renderOnb(<FinishSetupChip />)
    fireEvent.click(await screen.findByTestId("onb-chip"))
    fireEvent.click(await screen.findByTestId("onb-chip-skip-tickets"))
    await waitFor(() => expect(mocks.post).toHaveBeenCalledWith("/api/onboarding/tickets/skip/"))
    await waitFor(() => expect(screen.getByTestId("onb-chip-count")).toHaveTextContent("1"))
    fireEvent.click(screen.getByTestId("onb-chip-skip-leave_management"))
    await waitFor(() => expect(screen.queryByTestId("onb-chip")).not.toBeInTheDocument())
  })

  it("renders nothing for non-admins and when everything is done", async () => {
    mocks.access = AGENT
    const { unmount } = renderOnb(<FinishSetupChip />)
    await new Promise((r) => setTimeout(r, 10))
    expect(screen.queryByTestId("onb-chip")).not.toBeInTheDocument()
    expect(mocks.get).not.toHaveBeenCalled()
    unmount()

    mocks.access = ADMIN
    mocks.get.mockResolvedValue({ data: state([step("workspace", 0, { status: "done" })]) })
    renderOnb(<FinishSetupChip />)
    await waitFor(() => expect(mocks.get).toHaveBeenCalled())
    expect(screen.queryByTestId("onb-chip")).not.toBeInTheDocument()
  })
})
