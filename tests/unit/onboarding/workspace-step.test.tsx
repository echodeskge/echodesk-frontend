/** Workspace step: draft from prefill/answers, payload normalisation, form interactions. */
import React, { useState } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, screen, waitFor } from "@testing-library/react"

const mocks = vi.hoisted(() => ({ post: vi.fn() }))
vi.mock("@/api/axios", () => ({ default: { get: vi.fn(), post: (...a: unknown[]) => mocks.post(...a) } }))
// The registry pulls in the bookings step, which reads the current user through useMyAccess.
vi.mock("@/hooks/useMyAccess", () => ({ useMyAccess: () => ({ loaded: true, userId: 1, isStaff: true, isSuperuser: false, has: () => false }) }))

import {
  WorkspaceStep,
  initWorkspaceAnswers,
  prepareWorkspaceAnswers,
  type WorkspaceAnswers,
} from "@/app/(tenant)/onboarding/_steps/workspace"
import { getStepDefinition, hasStepComponent } from "@/app/(tenant)/onboarding/_steps"
import type { FieldErrors } from "@/app/(tenant)/onboarding/_lib/onboarding-api"
import { renderOnb, step } from "./helpers"

function Harness({ initial, errors = null, onChange }: { initial: WorkspaceAnswers; errors?: FieldErrors | null; onChange: (a: WorkspaceAnswers) => void }) {
  const [answers, set] = useState(initial)
  const setAnswers = (next: WorkspaceAnswers | ((p: WorkspaceAnswers) => WorkspaceAnswers)) => {
    set((prev) => {
      const v = typeof next === "function" ? next(prev) : next
      onChange(v)
      return v
    })
  }
  return (
    <WorkspaceStep step={step("workspace", 0)} answers={answers} setAnswers={setAnswers} errors={errors} context={{}} prefill={{}} />
  )
}

beforeEach(() => mocks.post.mockReset())

describe("workspace answers", () => {
  it("registry: workspace has a component, unknown keys get the placeholder", () => {
    expect(hasStepComponent("workspace")).toBe(true)
    expect(getStepDefinition("workspace").titleKey).toBe("steps.workspace.title")
    expect(hasStepComponent("tickets")).toBe(true)
    expect(hasStepComponent("ecommerce_crm")).toBe(true)
    expect(hasStepComponent("not_a_step")).toBe(false)
    expect(getStepDefinition("not_a_step").titleKey).toBe("steps.not_a_step.title")
  })

  it("init takes prefill when nothing was applied, with safe defaults", () => {
    const a = initWorkspaceAnswers({ answers: {}, prefill: { company_name: "Amanati", preferred_language: "xx", industry: "salon", team: [{ email: "a@x.ge", role: "boss" }] } })
    expect(a).toEqual({
      company_name: "Amanati",
      preferred_language: "ka",
      industry: "salon",
      departments: [],
      team: [{ email: "a@x.ge", first_name: "", last_name: "", role: "agent", department: null }],
    })
  })

  it("init prefers the last applied answers over the prefill", () => {
    const a = initWorkspaceAnswers({ answers: { company_name: "Applied", departments: ["Sales"] }, prefill: { company_name: "Prefill" } })
    expect(a.company_name).toBe("Applied")
    expect(a.departments).toEqual(["Sales"])
  })

  it("prepare trims, lower-cases e-mails, dedupes departments, drops empty rows and unknown departments", () => {
    const out = prepareWorkspaceAnswers({
      company_name: "  Amanati ",
      preferred_language: "en",
      industry: "shop",
      departments: [" Sales", "sales", "Sales ", "Support", ""],
      team: [
        { email: " Ana@X.ge ", first_name: " Ana ", last_name: "", role: "manager", department: "Sales" },
        { email: "", first_name: "", last_name: "", role: "agent", department: null },
        { email: "b@x.ge", first_name: "", last_name: "", role: "agent", department: "Gone" },
      ],
    })
    expect(out).toEqual({
      company_name: "Amanati",
      preferred_language: "en",
      industry: "shop",
      departments: ["Sales", "sales", "Support"],
      team: [
        { email: "ana@x.ge", first_name: "Ana", last_name: "", role: "manager", department: "Sales" },
        { email: "b@x.ge", first_name: "", last_name: "", role: "agent", department: null },
      ],
    })
  })
})

describe("WorkspaceStep form", () => {
  const initial = initWorkspaceAnswers({ answers: {}, prefill: { company_name: "Amanati" } })

  it("builds the answers from the fields: name, language, industry, departments, team rows", async () => {
    const onChange = vi.fn()
    renderOnb(<Harness initial={initial} onChange={onChange} />)
    const last = () => onChange.mock.calls[onChange.mock.calls.length - 1][0] as WorkspaceAnswers

    fireEvent.change(screen.getByTestId("onb-company-name-input"), { target: { value: "Amanati LLC" } })
    expect(last().company_name).toBe("Amanati LLC")

    fireEvent.change(screen.getByTestId("onb-language-select"), { target: { value: "ru" } })
    expect(last().preferred_language).toBe("ru")

    fireEvent.click(screen.getByTestId("onb-industry-clinic"))
    expect(last().industry).toBe("clinic")
    expect(screen.getByTestId("onb-industry-clinic")).toHaveAttribute("aria-checked", "true")

    // Departments: typed + Enter, and a preset chip of the chosen industry.
    fireEvent.change(screen.getByTestId("onb-departments-input"), { target: { value: "Sales" } })
    fireEvent.keyDown(screen.getByTestId("onb-departments-input"), { key: "Enter" })
    fireEvent.click(screen.getByTestId("onb-departments-suggest-Doctors"))
    expect(last().departments).toEqual(["Sales", "Doctors"])

    // Team rows.
    fireEvent.click(screen.getByTestId("onb-team-add"))
    fireEvent.change(screen.getByTestId("onb-team-row-0-email"), { target: { value: "ana@x.ge" } })
    fireEvent.change(screen.getByTestId("onb-team-row-0-first_name"), { target: { value: "Ana" } })
    fireEvent.change(screen.getByTestId("onb-team-row-0-last_name"), { target: { value: "K" } })
    fireEvent.change(screen.getByTestId("onb-team-row-0-role"), { target: { value: "manager" } })
    fireEvent.change(screen.getByTestId("onb-team-row-0-department"), { target: { value: "Doctors" } })
    expect(last().team).toEqual([{ email: "ana@x.ge", first_name: "Ana", last_name: "K", role: "manager", department: "Doctors" }])

    // Removing a department clears it from the rows that used it.
    fireEvent.click(screen.getByRole("button", { name: "Doctors ×" }))
    expect(last().departments).toEqual(["Sales"])
    expect(last().team[0].department).toBeNull()

    fireEvent.click(screen.getByTestId("onb-team-row-0-remove"))
    expect(last().team).toEqual([])
    expect(screen.getByTestId("onb-team-empty")).toBeInTheDocument()
  })

  it("shows field and row errors from the 400 payload", () => {
    renderOnb(
      <Harness
        initial={{ ...initial, team: [{ email: "x", first_name: "", last_name: "", role: "agent", department: null }] }}
        errors={{ company_name: ["Required"], industry: ["Pick one"], team: [{ email: ["Enter a valid e-mail"] }] }}
        onChange={() => {}}
      />
    )
    expect(screen.getByTestId("onb-company-name-error")).toHaveTextContent("Required")
    expect(screen.getByTestId("onb-industry-error")).toHaveTextContent("Pick one")
    expect(screen.getByTestId("onb-team-row-0")).toHaveTextContent("Enter a valid e-mail")
  })

  it("uploads the logo through /api/tenant-settings/upload-logo/", async () => {
    mocks.post.mockResolvedValue({ data: { logo_url: "https://cdn/logo.png" } })
    renderOnb(<Harness initial={initial} onChange={() => {}} />)
    const file = new File(["x"], "logo.png", { type: "image/png" })
    fireEvent.change(screen.getByTestId("onb-logo-input"), { target: { files: [file] } })
    await waitFor(() => expect(mocks.post).toHaveBeenCalledTimes(1))
    const [url, body] = mocks.post.mock.calls[0]
    expect(url).toBe("/api/tenant-settings/upload-logo/")
    expect(body).toBeInstanceOf(FormData)
    expect((body as FormData).get("logo")).toBe(file)
    await waitFor(() => expect(screen.getByTestId("onb-logo-preview").querySelector("img")).toHaveAttribute("src", "https://cdn/logo.png"))
  })
})
