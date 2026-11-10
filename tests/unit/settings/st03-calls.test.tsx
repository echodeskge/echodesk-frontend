/**
 * ST-03 Calls & SIP settings (FORM page with tabs): same requests as before,
 * plus the fixed bugs (create keeps the password, edit loads every stored
 * value, translated toasts, oversize sound message) and the working-hours
 * save bar (dirty, Discard, same PATCH).
 */
import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { screen, fireEvent, within, waitFor, act } from "@testing-library/react"
import { renderSt } from "./st-helpers"

const state = vi.hoisted(() => ({
  user: { is_staff: true } as Record<string, unknown>,
  profile: { is_staff: true, feature_keys: ["ip_calling"] } as Record<string, unknown>,
  hasFeature: true,
  toast: vi.fn(),
  api: {
    sipConfigurationsList: vi.fn(),
    sipConfigurationsCreate: vi.fn(),
    sipConfigurationsUpdate: vi.fn(),
    sipConfigurationsDestroy: vi.fn(),
    sipConfigurationsSetDefaultCreate: vi.fn(),
    sipConfigurationsTestConnectionCreate: vi.fn(),
    sipConfigurationsRetrieve: vi.fn(),
  },
  axios: { get: vi.fn(), patch: vi.fn(), post: vi.fn(), delete: vi.fn() },
}))

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))
vi.mock("@/contexts/SubscriptionContext", () => ({
  useSubscription: () => ({ hasFeature: () => state.hasFeature, loading: false, subscription: null }),
}))
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: state.user }) }))
vi.mock("@/hooks/useUserProfile", () => ({ useUserProfile: () => ({ data: state.profile, isLoading: false }) }))
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: state.toast }) }))
vi.mock("@/api/generated/api", () => state.api)
vi.mock("@/api/axios", () => ({ default: state.axios }))

import CallSettingsPage from "@/app/(tenant)/settings/calls/page"

const config = { id: 1, name: "Demo PBX", sip_server: "pbx.demo.invalid", is_active: true, is_default: true, assignment_count: 1 }
const detail = {
  ...config,
  sip_port: 5060,
  username: "demo-trunk",
  password: "",
  realm: "",
  proxy: "",
  phone_number: "+995322000111",
  websocket_path: "/custom-ws",
  stun_server: "",
  turn_server: "",
  turn_username: "",
  max_concurrent_calls: 9,
}
const pbxSettings = {
  working_hours_enabled: false,
  timezone: "Asia/Tbilisi",
  working_hours_schedule: { monday: [9, 10] },
  holidays: [],
  after_hours_action: "voicemail",
  forward_number: "",
  review_method: "callback",
  sms_api_key: "",
  sms_rating_template_ka: "",
  sms_rating_template_en: "",
  review_delay_hours: 1,
  review_cooldown_hours: 24,
  sound_greeting_url: null,
}

beforeEach(() => {
  state.user = { is_staff: true }
  state.profile = { is_staff: true, feature_keys: ["ip_calling"] }
  state.hasFeature = true
  state.toast.mockClear()
  for (const f of Object.values(state.api)) f.mockReset()
  for (const f of Object.values(state.axios)) f.mockReset()
  state.api.sipConfigurationsList.mockResolvedValue({ results: [config] })
  state.api.sipConfigurationsRetrieve.mockResolvedValue(detail)
  state.api.sipConfigurationsCreate.mockResolvedValue({})
  state.api.sipConfigurationsUpdate.mockResolvedValue({})
  state.axios.get.mockImplementation((url: string) => {
    if (url.startsWith("/api/pbx-settings/")) return Promise.resolve({ data: pbxSettings })
    if (url.startsWith("/api/phone-assignments/")) return Promise.resolve({ data: { results: [] } })
    return Promise.resolve({ data: { results: [] } })
  })
  state.axios.patch.mockResolvedValue({ data: {} })
  state.axios.post.mockResolvedValue({ data: {} })
})

async function openTab(name: RegExp) {
  fireEvent.click(within(screen.getByTestId("calls-tabs")).getByRole("radio", { name }))
}

// Radix Select in jsdom: pointer capture / scrollIntoView stubs, keyboard open.
Object.assign(Element.prototype, {
  hasPointerCapture: () => false,
  releasePointerCapture: () => {},
  scrollIntoView: () => {},
})

async function pickConfig(testId: string) {
  const trigger = await screen.findByTestId(testId)
  trigger.focus()
  fireEvent.keyDown(trigger, { key: "ArrowDown" })
  fireEvent.click(await screen.findByRole("option", { name: /Demo PBX/ }))
  await waitFor(() => expect(state.axios.get).toHaveBeenCalledWith("/api/pbx-settings/1/"))
}

describe("Calls & SIP settings", () => {
  it("shows the no-access state to non PBX admins (no SIP request)", () => {
    state.user = { is_staff: false }
    state.profile = { is_staff: false, feature_keys: ["ip_calling"], permissions_list: ["view_reports"], all_permissions: ["view_reports"] }
    renderSt(<CallSettingsPage />)
    expect(screen.getByTestId("calls-no-access")).toHaveTextContent("No access")
  })

  it("shows a translated upgrade state when ip_calling is missing", () => {
    state.hasFeature = false
    renderSt(<CallSettingsPage />, "ka")
    const box = screen.getByTestId("calls-upgrade")
    expect(within(box).getByRole("link")).toHaveAttribute("href", "/settings/subscription")
    expect(box.textContent).not.toMatch(/Feature Not Available|Upgrade Plan/)
  })

  it("lists SIP configurations in a section with the old actions", async () => {
    renderSt(<CallSettingsPage />)
    const row = await screen.findByTestId("sip-config-row")
    expect(row).toHaveTextContent("Demo PBX")
    expect(row).toHaveTextContent("pbx.demo.invalid")
    expect(within(row).getByTestId("sip-delete")).toBeDisabled() // default config
    expect(within(row).queryByTestId("sip-set-default")).toBeNull()
  })

  it("has no Quick setup button (S1: it carried a real SIP password)", async () => {
    renderSt(<CallSettingsPage />)
    await screen.findByTestId("sip-config-row")
    expect(screen.queryByTestId("sip-quick-setup")).toBeNull()
    expect(screen.queryByText(/Quick Setup/i)).toBeNull()
    expect(screen.getByTestId("sip-add")).toBeInTheDocument()
  })

  it("creates a configuration WITH the typed password (bug fix) and a translated toast", async () => {
    renderSt(<CallSettingsPage />)
    await screen.findByTestId("sip-config-row")
    fireEvent.click(screen.getByTestId("sip-add"))
    fireEvent.change(screen.getByLabelText(/Configuration Name/), { target: { value: "New SIP" } })
    fireEvent.change(screen.getByLabelText(/^SIP Server/), { target: { value: "sip.x.invalid" } })
    fireEvent.change(screen.getByLabelText(/SIP Username/), { target: { value: "u" } })
    fireEvent.change(screen.getByLabelText(/SIP Password/), { target: { value: "pw" } })
    fireEvent.click(screen.getByTestId("sip-form-submit"))
    await waitFor(() => expect(state.api.sipConfigurationsCreate).toHaveBeenCalledTimes(1))
    expect(state.api.sipConfigurationsCreate.mock.calls[0][0]).toMatchObject({ name: "New SIP", sip_server: "sip.x.invalid", username: "u", password: "pw", id: 0 })
    await waitFor(() => expect(state.toast).toHaveBeenCalledWith(expect.objectContaining({ description: "SIP configuration created successfully" })))
  })

  it("edit loads every stored value (bug fix) and PUTs them", async () => {
    renderSt(<CallSettingsPage />)
    fireEvent.click(await screen.findByTestId("sip-edit"))
    await waitFor(() => expect(screen.getByLabelText(/Trunk Phone Number/)).toHaveValue("+995322000111"))
    expect(screen.getByLabelText(/WebSocket Path/i)).toHaveValue("/custom-ws")
    expect(screen.getByRole("checkbox", { name: /Active/ })).toBeChecked()
    fireEvent.click(screen.getByTestId("sip-form-submit"))
    await waitFor(() => expect(state.api.sipConfigurationsUpdate).toHaveBeenCalledTimes(1))
    expect(state.api.sipConfigurationsUpdate).toHaveBeenCalledWith(1, expect.objectContaining({ is_active: true, is_default: true, max_concurrent_calls: 9, websocket_path: "/custom-ws", password: "" }))
  })

  it("delete keeps the native confirmation, now translated", async () => {
    state.api.sipConfigurationsList.mockResolvedValue({ results: [{ ...config, is_default: false }] })
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false)
    renderSt(<CallSettingsPage />, "ka")
    fireEvent.click(await screen.findByTestId("sip-delete"))
    expect(confirm).toHaveBeenCalledWith("დარწმუნებული ხართ, რომ გსურთ ამ SIP კონფიგურაციის წაშლა?")
    expect(state.api.sipConfigurationsDestroy).not.toHaveBeenCalled()
    confirm.mockRestore()
  })

  it("working hours: the save bar tracks changes, Discard resets, Save sends the same PATCH", async () => {
    renderSt(<CallSettingsPage />)
    await screen.findByTestId("sip-config-row")
    await openTab(/Working Hours/)
    await pickConfig("hours-config")
    const bar = await screen.findByTestId("calls-savebar")
    expect(bar).toHaveTextContent("All changes saved")
    expect(bar.getAttribute("data-dirty")).toBeNull()

    fireEvent.click(screen.getByRole("switch"))
    expect(screen.getByTestId("calls-savebar")).toHaveTextContent("You have unsaved changes")
    fireEvent.click(screen.getByTestId("calls-savebar-discard"))
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false")
    expect(screen.getByTestId("calls-savebar")).toHaveTextContent("All changes saved")

    fireEvent.click(screen.getByRole("switch"))
    fireEvent.click(screen.getByTestId("calls-savebar-save"))
    await waitFor(() => expect(state.axios.patch).toHaveBeenCalledTimes(1))
    expect(state.axios.patch).toHaveBeenCalledWith("/api/pbx-settings/1/", {
      working_hours_enabled: true,
      timezone: "Asia/Tbilisi",
      working_hours_schedule: { monday: [9, 10] },
      holidays: [],
      after_hours_action: "voicemail",
      forward_number: "",
      review_method: "callback",
      sms_api_key: "",
      sms_rating_template_ka: "",
      sms_rating_template_en: "",
      review_delay_hours: 1,
      review_cooldown_hours: 24,
    })
    await waitFor(() => expect(screen.getByTestId("calls-savebar")).toHaveTextContent("All changes saved"))
  })

  it("working hours grid labels weekdays in Georgian", async () => {
    renderSt(<CallSettingsPage />, "ka")
    await screen.findByTestId("sip-config-row")
    await openTab(/სამუშაო საათები/)
    await pickConfig("hours-config")
    const grid = await screen.findByTestId("hours-grid")
    expect(grid.textContent).not.toMatch(/Mon|Tue|Sun/)
  })

  it("sounds: upload posts the same form data; a file over 10 MB shows an error instead of nothing", async () => {
    const { container } = renderSt(<CallSettingsPage />)
    await screen.findByTestId("sip-config-row")
    await openTab(/Sound Management/)
    await pickConfig("sounds-config")
    await screen.findAllByTestId("sound-row")
    const inputs = container.querySelectorAll<HTMLInputElement>("input[type=file]")
    const small = new File(["RIFF"], "a.wav", { type: "audio/wav" })
    await act(async () => {
      fireEvent.change(inputs[0], { target: { files: [small] } })
    })
    await waitFor(() => expect(state.axios.post).toHaveBeenCalledWith("/api/pbx-settings/1/upload-sound/", expect.any(FormData)))
    const fd = state.axios.post.mock.calls[0][1] as FormData
    expect(fd.get("sound_type")).toBe("greeting")

    const big = new File(["x"], "big.wav", { type: "audio/wav" })
    Object.defineProperty(big, "size", { value: 10 * 1024 * 1024 + 1 })
    state.axios.post.mockClear()
    fireEvent.change(inputs[1], { target: { files: [big] } })
    expect(await screen.findByText("This file is larger than 10 MB. Choose a smaller one.")).toBeInTheDocument()
    expect(state.axios.post).not.toHaveBeenCalled()
  })
})
