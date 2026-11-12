/**
 * The wizard page: steps from a mocked GET, apply posts the answers and
 * shows 400 field errors, skip advances, the finish screen after the last step.
 */
import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, screen, waitFor, within } from "@testing-library/react"

const mocks = vi.hoisted(() => ({
  access: { loaded: true, isSuperuser: false, isStaff: true, has: () => false } as {
    loaded: boolean
    isSuperuser: boolean
    isStaff: boolean
    has: (c: string) => boolean
  },
  search: "",
  replace: vi.fn(),
  push: vi.fn(),
  get: vi.fn(),
  post: vi.fn(),
}))

vi.mock("@/hooks/useMyAccess", () => ({ useMyAccess: () => mocks.access }))
vi.mock("@/contexts/TenantContext", () => ({ useTenant: () => ({ tenant: { tenant_name: "Amanati" }, loading: false }) }))
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace, push: mocks.push, prefetch: vi.fn() }),
  usePathname: () => "/onboarding",
  useSearchParams: () => new URLSearchParams(mocks.search),
}))
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.ComponentProps<"a"> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))
vi.mock("@/api/axios", () => ({
  default: { get: (...a: unknown[]) => mocks.get(...a), post: (...a: unknown[]) => mocks.post(...a) },
}))

import OnboardingPage from "@/app/(tenant)/onboarding/page"
import { ADMIN, AGENT, renderOnb, state, step } from "./helpers"

const STEPS = [
  step("workspace", 0, { prefill: { company_name: "Amanati", preferred_language: "ka" } }),
  step("tickets", 10),
  step("unknown_future_step", 99),
]

beforeEach(() => {
  mocks.replace.mockReset()
  mocks.push.mockReset()
  mocks.get.mockReset()
  mocks.post.mockReset()
  mocks.access = ADMIN
  mocks.search = ""
  mocks.get.mockResolvedValue({ data: state(STEPS) })
})

describe("onboarding wizard", () => {
  it("renders the steps of the mocked GET in the rail, starting at the first pending one", async () => {
    renderOnb(<OnboardingPage />)
    await screen.findByTestId("onb-step-workspace")
    const rail = screen.getByTestId("onb-rail")
    expect(within(rail).getByTestId("onb-rail-step-workspace")).toHaveTextContent("Workspace")
    expect(within(rail).getByTestId("onb-rail-step-tickets")).toHaveTextContent("Tickets")
    // A key the web does not know yet is still listed (by its key) and opens the placeholder.
    expect(within(rail).getByTestId("onb-rail-step-unknown_future_step")).toHaveTextContent("unknown_future_step")
    expect(screen.getByTestId("onb-progress")).toHaveTextContent("0 of 3")
    expect(screen.getByTestId("onb-rail-step-workspace")).toHaveAttribute("aria-current", "step")
    // Prefill lands in the form.
    expect(screen.getByTestId("onb-company-name-input")).toHaveValue("Amanati")
  })

  it("opens the step from ?step=", async () => {
    mocks.search = "step=unknown_future_step"
    renderOnb(<OnboardingPage />)
    await screen.findByTestId("onb-step-placeholder-unknown_future_step")
    expect(screen.getByTestId("onb-step-title")).toHaveTextContent("unknown_future_step")
  })

  it("apply posts the prepared answers, then shows the 400 field errors", async () => {
    mocks.post.mockRejectedValueOnce({ response: { status: 400, data: { errors: { company_name: ["Too short"], team: [{}, { email: ["Already exists"] }] } } } })
    renderOnb(<OnboardingPage />)
    await screen.findByTestId("onb-step-workspace")

    fireEvent.change(screen.getByTestId("onb-company-name-input"), { target: { value: "  Amanati LLC " } })
    fireEvent.click(screen.getByTestId("onb-team-add"))
    fireEvent.click(screen.getByTestId("onb-team-add"))
    fireEvent.change(screen.getByTestId("onb-team-row-0-email"), { target: { value: "A@x.ge" } })
    fireEvent.change(screen.getByTestId("onb-team-row-1-email"), { target: { value: "b@x.ge" } })
    fireEvent.click(screen.getByTestId("onb-apply"))

    await waitFor(() => expect(mocks.post).toHaveBeenCalledTimes(1))
    const [url, body] = mocks.post.mock.calls[0]
    expect(url).toBe("/api/onboarding/workspace/apply/")
    expect(body).toEqual({
      answers: {
        company_name: "Amanati LLC",
        preferred_language: "ka",
        industry: null,
        departments: [],
        team: [
          { email: "a@x.ge", first_name: "", last_name: "", role: "agent", department: null },
          { email: "b@x.ge", first_name: "", last_name: "", role: "agent", department: null },
        ],
      },
    })

    expect(await screen.findByTestId("onb-company-name-error")).toHaveTextContent("Too short")
    expect(within(screen.getByTestId("onb-team-row-1")).getByRole("alert")).toHaveTextContent("Already exists")
    // Still on the same step.
    expect(screen.getByTestId("onb-step-workspace")).toBeInTheDocument()
    expect(mocks.replace).not.toHaveBeenCalled()
  })

  it("apply success marks the step done and advances to the next one", async () => {
    mocks.post.mockResolvedValueOnce({
      data: { step: { ...STEPS[0], status: "done", answers: { company_name: "Amanati" } }, result: { created: {}, updated: ["name"], notes: [] } },
    })
    renderOnb(<OnboardingPage />)
    await screen.findByTestId("onb-step-workspace")
    fireEvent.click(screen.getByTestId("onb-apply"))
    await screen.findByTestId("onb-step-tickets")
    expect(screen.getByTestId("onb-rail-step-workspace")).toHaveAttribute("data-status", "done")
    expect(screen.getByTestId("onb-progress")).toHaveTextContent("1 of 3")
    expect(mocks.replace).toHaveBeenCalledWith("/onboarding?step=tickets", { scroll: false })
  })

  it("skip posts to the skip endpoint and advances; after the last step the finish screen shows", async () => {
    mocks.post.mockImplementation((url: string) => {
      const key = url.split("/")[3]
      const s = STEPS.find((x) => x.key === key)!
      return Promise.resolve({ data: { step: { ...s, status: "skipped" } } })
    })
    renderOnb(<OnboardingPage />)
    await screen.findByTestId("onb-step-workspace")

    fireEvent.click(screen.getByTestId("onb-skip"))
    await screen.findByTestId("onb-step-tickets")
    expect(mocks.post).toHaveBeenCalledWith("/api/onboarding/workspace/skip/")

    fireEvent.click(screen.getByTestId("onb-skip"))
    await screen.findByTestId("onb-step-placeholder-unknown_future_step")

    fireEvent.click(screen.getByTestId("onb-skip"))
    await screen.findByTestId("onb-finish")
    expect(screen.getByTestId("onb-finish-skipped")).toHaveTextContent("3 steps were skipped")
    expect(screen.getByTestId("onb-go-workspace")).toHaveAttribute("href", "/tickets")
    // Back from the finish screen reopens the last step.
    fireEvent.click(screen.getByTestId("onb-back"))
    await screen.findByTestId("onb-step-placeholder-unknown_future_step")
  })

  it("Back goes to the previous step and keeps the draft", async () => {
    renderOnb(<OnboardingPage />)
    await screen.findByTestId("onb-step-workspace")
    fireEvent.change(screen.getByTestId("onb-company-name-input"), { target: { value: "Draft Co" } })
    expect(screen.getByTestId("onb-back")).toBeDisabled()
    fireEvent.click(screen.getByTestId("onb-rail-step-tickets"))
    await screen.findByTestId("onb-step-tickets")
    fireEvent.click(screen.getByTestId("onb-back"))
    await screen.findByTestId("onb-step-workspace")
    expect(screen.getByTestId("onb-company-name-input")).toHaveValue("Draft Co")
  })

  it("after apply the step re-initialises from the stored answers (contract shape, not the draft shape)", async () => {
    mocks.search = "step=tickets"
    mocks.post.mockResolvedValueOnce({
      data: {
        step: {
          ...STEPS[1],
          status: "done",
          answers: { purpose: "support", board_name: "Support", form_fields: ["phone", { label: "Plate", type: "string" }], tags: [], team_user_ids: [] },
        },
        result: { created: {}, updated: [], notes: [] },
      },
    })
    renderOnb(<OnboardingPage />)
    await screen.findByTestId("onb-step-tickets")
    expect(screen.queryByTestId("onb-tickets-custom-row-0-label")).toBeNull()
    fireEvent.click(screen.getByTestId("onb-apply"))
    await screen.findByTestId("onb-step-placeholder-unknown_future_step")
    expect(screen.getByTestId("onb-rail-step-tickets")).toHaveAttribute("data-status", "done")
    fireEvent.click(screen.getByTestId("onb-back"))
    await screen.findByTestId("onb-step-tickets")
    expect(screen.getByTestId("onb-tickets-custom-row-0-label")).toHaveValue("Plate")
  })

  it("applying the last step shows the finish screen although ?step= still names it", async () => {
    mocks.search = "step=tickets"
    mocks.get.mockResolvedValue({ data: state([step("workspace", 0, { status: "done" }), step("tickets", 10)]) })
    mocks.post.mockResolvedValueOnce({
      data: { step: { ...step("tickets", 10), status: "done", answers: { purpose: "support" } }, result: { created: {}, updated: [], notes: [] } },
    })
    renderOnb(<OnboardingPage />)
    await screen.findByTestId("onb-step-tickets")
    fireEvent.click(screen.getByTestId("onb-apply"))
    await screen.findByTestId("onb-finish")
    expect(mocks.replace).toHaveBeenCalledWith("/onboarding", { scroll: false })
    expect(screen.queryByTestId("onb-step-tickets")).toBeNull()
  })

  it("shows the finish screen directly when nothing is pending", async () => {
    mocks.get.mockResolvedValue({ data: state([step("workspace", 0, { status: "done" }), step("tickets", 10, { status: "skipped" })]) })
    renderOnb(<OnboardingPage />)
    await screen.findByTestId("onb-finish")
    expect(screen.getByTestId("onb-finish-link-workspace")).toHaveAttribute("href", "/settings/general")
    expect(screen.getByTestId("onb-finish-open-tickets")).toBeInTheDocument()
  })

  it("non-admins get the no-access block and no request", async () => {
    mocks.access = AGENT
    renderOnb(<OnboardingPage />)
    const block = await screen.findByTestId("onb-no-access")
    expect(block).toHaveAttribute("data-forbidden", "true")
    expect(mocks.get).not.toHaveBeenCalled()
  })

  it("renders in Georgian", async () => {
    renderOnb(<OnboardingPage />, { locale: "ka" })
    await screen.findByTestId("onb-step-workspace")
    expect(screen.getByTestId("onb-apply")).toHaveTextContent("შენახვა და გაგრძელება")
    expect(screen.getByTestId("onb-skip")).toHaveTextContent("ჯერ გამოტოვება")
  })
})
