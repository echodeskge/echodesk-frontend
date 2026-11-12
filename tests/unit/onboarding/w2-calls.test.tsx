/** ONB-W2 calls step: hosting choice, BYO server + install command, trunk, agents → extensions, payload per SCHEMAS.md, nested errors; the settings page no longer ships a quick-setup block. */
import React, { useState } from "react"
import fs from "node:fs"
import path from "node:path"
import { describe, expect, it, vi } from "vitest"
import { fireEvent, screen, within } from "@testing-library/react"

vi.mock("@/api/axios", () => {
  const inst = { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() }
  return { default: inst, createAxiosInstance: () => inst, getApiUrl: () => "" }
})

import { CallsStep, initCallsAnswers, prepareCallsAnswers, type CallsAnswers } from "@/app/(tenant)/onboarding/_steps/ip_calling"
import { hasStepComponent } from "@/app/(tenant)/onboarding/_steps"
import { defaultHours } from "@/app/(tenant)/onboarding/_components/fields"
import type { FieldErrors } from "@/app/(tenant)/onboarding/_lib/onboarding-api"
import { renderOnb, step } from "./helpers"

const USERS = [
  { id: 1, email: "ana@x.ge", name: "Ana K" },
  { id: 2, email: "gio@x.ge", name: "Gio M" },
]
const CONTEXT = { server: null, trunks: 0, users: USERS, hosted_request_sent: false }
const SERVER = { id: 5, name: "pbx", fqdn: "pbx.amanati.ge", public_ip: "203.0.113.10", ami_port: 5038, status: "pending", install_command: "curl -fsSL https://api.echodesk.ge/api/pbx/install/TOKEN/ | sudo bash" }

function Harness({ initial, errors = null, onChange = () => {}, context = CONTEXT }: { initial: CallsAnswers; errors?: FieldErrors | null; onChange?: (a: CallsAnswers) => void; context?: Record<string, unknown> }) {
  const [answers, set] = useState(initial)
  const setAnswers = (next: CallsAnswers | ((p: CallsAnswers) => CallsAnswers)) =>
    set((prev) => {
      const v = typeof next === "function" ? next(prev) : next
      onChange(v)
      return v
    })
  return <CallsStep step={step("ip_calling", 70)} answers={answers} setAnswers={setAnswers} errors={errors} context={context} prefill={{}} />
}

describe("calls answers", () => {
  it("is registered", () => expect(hasStepComponent("ip_calling")).toBe(true))

  it("init fills defaults and takes the registered server from the context", () => {
    const a = initCallsAnswers({ answers: {}, prefill: { hours: { timezone: "Asia/Tbilisi", schedule: { sat: { from: "10:00", to: "14:00" } } } }, context: { ...CONTEXT, server: SERVER } })
    expect(a.hosting).toBe("byo")
    expect(a.server).toEqual({ name: "pbx", fqdn: "pbx.amanati.ge", public_ip: "203.0.113.10", ami_port: 5038 })
    expect(a.trunk).toEqual({ provider: "magti", sip_server: "", sip_port: 5060, username: "", password: "", realm: "", phone_numbers: [], caller_id_number: "" })
    expect(a.queue).toEqual({ strategy: "ringall", timeout_seconds: 30, max_wait_seconds: 300 })
    expect(a.hours.schedule.sat).toEqual({ from: "10:00", to: "14:00", break_from: null, break_to: null })
    expect(a.hours.schedule.mon).toEqual(defaultHours().mon)
    expect(a.hours.after_hours_action).toBe("announcement")
    expect(a.rating).toEqual({ review_method: "none", sms_api_key: "" })
  })

  it("prepare emits the SCHEMAS.md payload: server only for BYO, trunk null until typed, SMS key only for sms/both", () => {
    const a = initCallsAnswers({ answers: {}, prefill: {}, context: CONTEXT })
    const hosted = prepareCallsAnswers({ ...a, hosting: "hosted", server: { ...a.server, name: "x" } })
    expect(hosted).toEqual({
      hosting: "hosted",
      server: null,
      trunk: null,
      agent_user_ids: [],
      queue: { strategy: "ringall", timeout_seconds: 30, max_wait_seconds: 300 },
      hours: { timezone: "Asia/Tbilisi", schedule: defaultHours(), after_hours_action: "announcement", forward_number: "" },
      rating: { review_method: "none", sms_api_key: null },
    })

    const byo = prepareCallsAnswers({
      ...a,
      hosting: "byo",
      server: { name: " pbx ", fqdn: " PBX.Amanati.ge ", public_ip: "203.0.113.10", ami_port: null },
      trunk: { provider: "silknet", sip_server: " sip.silknet.ge ", sip_port: null, username: "u1", password: "p w", realm: "", phone_numbers: ["+995 32 200 0000", "+995322000000", ""], caller_id_number: " +995322000000 " },
      agent_user_ids: [2, 1, 2],
      hours: { ...a.hours, after_hours_action: "forward", forward_number: " +995555000000 " },
      rating: { review_method: "both", sms_api_key: " key " },
    })
    expect(byo.server).toEqual({ name: "pbx", fqdn: "pbx.amanati.ge", public_ip: "203.0.113.10", ami_port: 5038 })
    expect(byo.trunk).toEqual({ provider: "silknet", sip_server: "sip.silknet.ge", sip_port: 5060, username: "u1", password: "p w", realm: "", phone_numbers: ["+995322000000"], caller_id_number: "+995322000000" })
    expect(byo.agent_user_ids).toEqual([2, 1])
    expect(byo.hours.forward_number).toBe("+995555000000")
    expect(byo.rating).toEqual({ review_method: "both", sms_api_key: "key" })

    const sms = prepareCallsAnswers({ ...a, rating: { review_method: "callback", sms_api_key: "key" }, hours: { ...a.hours, forward_number: "+1" } })
    expect(sms.rating).toEqual({ review_method: "callback", sms_api_key: null })
    expect(sms.hours.forward_number).toBe("")
  })
})

describe("CallsStep form", () => {
  it("hosted hides the server block and shows the team note; BYO shows the server fields", () => {
    const onChange = vi.fn()
    renderOnb(<Harness initial={initCallsAnswers({ answers: {}, prefill: {}, context: CONTEXT })} onChange={onChange} />)
    const last = () => onChange.mock.calls[onChange.mock.calls.length - 1][0] as CallsAnswers

    expect(screen.getByTestId("onb-calls-server")).toBeInTheDocument()
    expect(screen.queryByTestId("onb-calls-install")).not.toBeInTheDocument()
    fireEvent.click(screen.getByTestId("onb-calls-hosting-hosted"))
    expect(last().hosting).toBe("hosted")
    expect(screen.queryByTestId("onb-calls-server")).not.toBeInTheDocument()
    expect(screen.getByTestId("onb-calls-hosted-note")).toHaveTextContent("The EchoDesk team will contact you")
  })

  it("shows the install command with a copy button and the server status once registered", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true })
    renderOnb(<Harness initial={initCallsAnswers({ answers: {}, prefill: {}, context: { ...CONTEXT, server: SERVER } })} context={{ ...CONTEXT, server: SERVER, hosted_request_sent: true }} />)
    expect(screen.getByTestId("onb-calls-server-status")).toHaveTextContent("Waiting for install")
    expect(screen.getByTestId("onb-calls-server-status")).toHaveTextContent("pbx.amanati.ge")
    expect(screen.getByTestId("onb-calls-install-command")).toHaveTextContent(SERVER.install_command)
    fireEvent.click(screen.getByTestId("onb-calls-install-copy"))
    expect(writeText).toHaveBeenCalledWith(SERVER.install_command)
    expect(await screen.findByText("Copied")).toBeInTheDocument()
  })

  it("trunk, DIDs, agents with extension preview, queue, hours and rating", () => {
    const onChange = vi.fn()
    renderOnb(<Harness initial={initCallsAnswers({ answers: {}, prefill: {}, context: CONTEXT })} onChange={onChange} />)
    const last = () => onChange.mock.calls[onChange.mock.calls.length - 1][0] as CallsAnswers

    fireEvent.click(within(screen.getByTestId("onb-calls-provider")).getByRole("radio", { name: "Silknet" }))
    fireEvent.change(screen.getByTestId("onb-calls-trunk-host-input"), { target: { value: "sip.silknet.ge" } })
    fireEvent.change(screen.getByTestId("onb-calls-trunk-username-input"), { target: { value: "u1" } })
    fireEvent.change(screen.getByTestId("onb-calls-trunk-password"), { target: { value: "secret" } })
    expect(screen.getByTestId("onb-calls-trunk-password")).toHaveAttribute("type", "password")
    fireEvent.change(screen.getByTestId("onb-calls-dids-input"), { target: { value: "+995322000000" } })
    fireEvent.keyDown(screen.getByTestId("onb-calls-dids-input"), { key: "Enter" })
    fireEvent.change(screen.getByTestId("onb-calls-dids-input"), { target: { value: "+995322000001" } })
    fireEvent.click(screen.getByTestId("onb-calls-dids-add"))
    expect(last().trunk).toMatchObject({ provider: "silknet", sip_server: "sip.silknet.ge", username: "u1", password: "secret", phone_numbers: ["+995322000000", "+995322000001"] })
    fireEvent.click(screen.getByRole("button", { name: "+995322000001 ×" }))
    expect(last().trunk.phone_numbers).toEqual(["+995322000000"])

    expect(screen.queryByTestId("onb-calls-extensions")).not.toBeInTheDocument()
    fireEvent.click(screen.getByTestId("onb-calls-agents-user-2"))
    fireEvent.click(screen.getByTestId("onb-calls-agents-user-1"))
    expect(last().agent_user_ids).toEqual([2, 1])
    expect(screen.getByTestId("onb-calls-ext-2")).toHaveTextContent("100")
    expect(screen.getByTestId("onb-calls-ext-2")).toHaveTextContent("Gio M")
    expect(screen.getByTestId("onb-calls-ext-1")).toHaveTextContent("101")

    fireEvent.click(within(screen.getByTestId("onb-calls-strategy")).getByRole("radio", { name: "Round robin" }))
    fireEvent.change(screen.getByTestId("onb-calls-timeout-input"), { target: { value: "20" } })
    expect(last().queue).toEqual({ strategy: "rrmemory", timeout_seconds: 20, max_wait_seconds: 300 })

    fireEvent.change(screen.getByTestId("onb-calls-timezone-select"), { target: { value: "Europe/Berlin" } })
    fireEvent.click(screen.getByTestId("onb-calls-hours-sat-toggle"))
    expect(last().hours.timezone).toBe("Europe/Berlin")
    expect(last().hours.schedule.sat).toEqual({ from: "09:00", to: "18:00", break_from: null, break_to: null })
    expect(screen.queryByTestId("onb-calls-forward-input")).not.toBeInTheDocument()
    fireEvent.click(within(screen.getByTestId("onb-calls-after-hours")).getByRole("radio", { name: "Forward to a number" }))
    fireEvent.change(screen.getByTestId("onb-calls-forward-input"), { target: { value: "+995555000000" } })
    expect(last().hours).toMatchObject({ after_hours_action: "forward", forward_number: "+995555000000" })

    expect(screen.queryByTestId("onb-calls-sms-key")).not.toBeInTheDocument()
    fireEvent.click(within(screen.getByTestId("onb-calls-rating")).getByRole("radio", { name: "SMS" }))
    fireEvent.change(screen.getByTestId("onb-calls-sms-key"), { target: { value: "sender-key" } })
    expect(last().rating).toEqual({ review_method: "sms", sms_api_key: "sender-key" })
  })

  it("renders nested errors next to the fields", () => {
    renderOnb(
      <Harness
        initial={initCallsAnswers({ answers: { hours: { after_hours_action: "forward" }, rating: { review_method: "sms" } }, prefill: {}, context: CONTEXT })}
        errors={{
          hosting: ["Pick one"],
          server: { fqdn: ["Enter a valid domain"] },
          trunk: { sip_server: ["Required"], phone_numbers: ["Add a number"] },
          agent_user_ids: ["Pick at least one"],
          "hours.forward_number": ["Enter a phone number"],
          rating: { sms_api_key: ["Required for SMS"] },
        }}
      />
    )
    expect(screen.getByTestId("onb-calls-hosting-error")).toHaveTextContent("Pick one")
    expect(screen.getByTestId("onb-calls-server-fqdn-error")).toHaveTextContent("Enter a valid domain")
    expect(screen.getByTestId("onb-calls-trunk-host-error")).toHaveTextContent("Required")
    expect(screen.getByTestId("onb-calls-dids-error")).toHaveTextContent("Add a number")
    expect(screen.getByTestId("onb-calls-agents-error")).toHaveTextContent("Pick at least one")
    expect(screen.getByTestId("onb-calls-forward-error")).toHaveTextContent("Enter a phone number")
    expect(screen.getByText("Required for SMS")).toBeInTheDocument()
  })
})

describe("settings/calls page", () => {
  it("no longer contains the quick-setup SIP block or any credential literal", () => {
    const page = fs.readFileSync(path.resolve(__dirname, "../../../src/app/(tenant)/settings/calls/page.tsx"), "utf8")
    expect(page).not.toMatch(/quickSetup/i)
    expect(page).not.toContain("setupAsteriskServer")
    expect(page).not.toContain("sip-quick-setup")
    // Every password / secret literal in the page is empty.
    for (const m of page.matchAll(/(password|secret)\s*:\s*"([^"]*)"/gi)) expect(m[2]).toBe("")
    expect(page).not.toMatch(/sip_server:\s*"[^"]+"/)
    expect(page).not.toMatch(/username:\s*"[^"]+"/)
  })
})
