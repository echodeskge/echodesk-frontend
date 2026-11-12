/**
 * OnboardingGate: an admin with pending, never-started setup is sent to
 * /onboarding once per session; non-admins and started setups are not.
 */
import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { screen, waitFor } from "@testing-library/react"

const mocks = vi.hoisted(() => ({
  access: { loaded: true, isSuperuser: false, isStaff: true, has: () => false } as {
    loaded: boolean
    isSuperuser: boolean
    isStaff: boolean
    has: (c: string) => boolean
  },
  pathname: "/tickets",
  replace: vi.fn(),
  get: vi.fn(),
}))

vi.mock("@/hooks/useMyAccess", () => ({ useMyAccess: () => mocks.access }))
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace, push: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => mocks.pathname,
}))
vi.mock("@/api/axios", () => ({ default: { get: (...a: unknown[]) => mocks.get(...a), post: vi.fn() } }))

import { OnboardingGate } from "@/app/(tenant)/onboarding/_components/OnboardingGate"
import { ONBOARDING_REDIRECTED_KEY } from "@/app/(tenant)/onboarding/_lib/wizard"
import { ADMIN, AGENT, SETTINGS_ADMIN, renderOnb, state, step } from "./helpers"

const PENDING = state([step("workspace", 0), step("tickets", 10)])

beforeEach(() => {
  window.sessionStorage.clear()
  mocks.replace.mockReset()
  mocks.get.mockReset()
  mocks.access = ADMIN
  mocks.pathname = "/tickets"
  mocks.get.mockResolvedValue({ data: PENDING })
})

describe("OnboardingGate", () => {
  it("redirects an admin with pending, never-started setup to /onboarding once", async () => {
    renderOnb(
      <OnboardingGate>
        <div data-testid="page" />
      </OnboardingGate>
    )
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/onboarding"))
    expect(mocks.replace).toHaveBeenCalledTimes(1)
    expect(window.sessionStorage.getItem(ONBOARDING_REDIRECTED_KEY)).toBe("1")
    expect(mocks.get).toHaveBeenCalledWith("/api/onboarding/")
  })

  it("does not flash the page before the decision", () => {
    renderOnb(
      <OnboardingGate>
        <div data-testid="page" />
      </OnboardingGate>
    )
    expect(screen.queryByTestId("page")).not.toBeInTheDocument()
  })

  it("does not redirect again in the same session (flag set)", async () => {
    window.sessionStorage.setItem(ONBOARDING_REDIRECTED_KEY, "1")
    renderOnb(
      <OnboardingGate>
        <div data-testid="page" />
      </OnboardingGate>
    )
    await screen.findByTestId("page")
    expect(mocks.replace).not.toHaveBeenCalled()
  })

  it("never redirects a non-admin, and does not even call the endpoint", async () => {
    mocks.access = AGENT
    renderOnb(
      <OnboardingGate>
        <div data-testid="page" />
      </OnboardingGate>
    )
    await screen.findByTestId("page")
    await new Promise((r) => setTimeout(r, 20))
    expect(mocks.replace).not.toHaveBeenCalled()
    expect(mocks.get).not.toHaveBeenCalled()
  })

  it("treats manage_settings as admin", async () => {
    mocks.access = SETTINGS_ADMIN
    renderOnb(
      <OnboardingGate>
        <div data-testid="page" />
      </OnboardingGate>
    )
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/onboarding"))
  })

  it("does not redirect when the setup was already started or nothing is pending", async () => {
    mocks.get.mockResolvedValue({ data: state(PENDING.steps, { started_at: "2026-11-12T10:00:00Z" }) })
    const { unmount } = renderOnb(
      <OnboardingGate>
        <div data-testid="page" />
      </OnboardingGate>
    )
    await screen.findByTestId("page")
    expect(mocks.replace).not.toHaveBeenCalled()
    unmount()

    window.sessionStorage.clear()
    mocks.get.mockResolvedValue({ data: state([step("workspace", 0, { status: "done" })]) })
    renderOnb(
      <OnboardingGate>
        <div data-testid="page" />
      </OnboardingGate>
    )
    await screen.findByTestId("page")
    expect(mocks.replace).not.toHaveBeenCalled()
  })

  it("shows the page when the endpoint fails (backend without onboarding)", async () => {
    mocks.get.mockRejectedValue({ response: { status: 404 } })
    renderOnb(
      <OnboardingGate>
        <div data-testid="page" />
      </OnboardingGate>
    )
    await screen.findByTestId("page")
    expect(mocks.replace).not.toHaveBeenCalled()
  })
})
