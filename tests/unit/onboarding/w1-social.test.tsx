/** ONB-W1 Inbox step: connection status from context, inline connect actions (mocked endpoints), payload, nested errors. */
import React, { useState } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, screen, waitFor, within } from "@testing-library/react"

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), toast: vi.fn() }))
vi.mock("@/api/axios", () => ({
  default: { get: (...a: unknown[]) => mocks.get(...a), post: (...a: unknown[]) => mocks.post(...a) },
}))
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: mocks.toast }) }))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock("@/hooks/useMyAccess", () => ({ useMyAccess: () => ({ loaded: true, userId: 1, isStaff: true, isSuperuser: false, has: () => false }) }))

import {
  SocialIntegrationsStep,
  connectionsOf,
  initSocialAnswers,
  prepareSocialAnswers,
  type SocialAnswers,
} from "@/app/(tenant)/onboarding/_steps/social_integrations"
import { getStepDefinition, hasStepComponent } from "@/app/(tenant)/onboarding/_steps"
import { defaultHours } from "@/app/(tenant)/onboarding/_components/fields"
import type { FieldErrors } from "@/app/(tenant)/onboarding/_lib/onboarding-api"
import { renderOnb, step } from "./helpers"

const CONTEXT = {
  connections: {
    facebook: [{ page_name: "Amanati" }, { page_name: "Old page", is_active: false }],
    instagram: [{ username: "amanati.ge" }],
    whatsapp: [],
    telegram: null,
    email: [],
    widget: [],
  },
  oauth: { facebook_start: "/api/social/facebook/oauth/start/", whatsapp_start: "/api/social/whatsapp/oauth/start/" },
  has_ai_feature: true,
  quick_reply_presets: [
    { title: "Hours", message: { ka: "ვმუშაობთ 10-19", en: "We are open 10-19" } },
    { title: "Address", message: { ka: "თბილისი", en: "Tbilisi" } },
  ],
}

function Harness({
  initial,
  errors = null,
  context = CONTEXT,
  onChange,
}: {
  initial: SocialAnswers
  errors?: FieldErrors | null
  context?: Record<string, unknown>
  onChange: (a: SocialAnswers) => void
}) {
  const [answers, set] = useState(initial)
  const setAnswers = (next: SocialAnswers | ((p: SocialAnswers) => SocialAnswers)) => {
    set((prev) => {
      const v = typeof next === "function" ? next(prev) : next
      onChange(v)
      return v
    })
  }
  return (
    <SocialIntegrationsStep step={step("social_integrations", 20, { context })} answers={answers} setAnswers={setAnswers} errors={errors} context={context} prefill={{}} />
  )
}

beforeEach(() => {
  mocks.get.mockReset()
  mocks.post.mockReset()
  mocks.toast.mockReset()
  window.open = vi.fn()
})

describe("social answers", () => {
  it("is registered", () => {
    expect(hasStepComponent("social_integrations")).toBe(true)
    expect(getStepDefinition("social_integrations").titleKey).toBe("steps.social_integrations.title")
  })

  it("init: connected channels are selected, quick replies come from the presets, ai only with the feature", () => {
    const a = initSocialAnswers({ answers: {}, prefill: { timezone: "Europe/Berlin", assignment: "claim", welcome_message: "Hi" }, context: CONTEXT })
    expect(a.channels).toEqual(["facebook"])
    expect(a.timezone).toBe("Europe/Berlin")
    expect(a.assignment).toBe("claim")
    expect(a.welcome_message).toEqual({ ka: "Hi", en: "Hi" })
    expect(a.hours).toEqual(defaultHours())
    expect(a.quick_replies).toEqual(CONTEXT.quick_reply_presets)
    expect(a.ai).toEqual({ enabled: false, company_description: "", language: "ka" })

    const noAi = initSocialAnswers({ answers: {}, prefill: {}, context: { ...CONTEXT, has_ai_feature: false } })
    expect(noAi.ai).toBeNull()
    expect(initSocialAnswers({ answers: {}, prefill: {}, context: {} }).channels).toEqual([])
  })

  it("init prefers applied answers (no preset fallback once applied)", () => {
    const a = initSocialAnswers({
      answers: { channels: ["email", "bogus"], quick_replies: [], ai: { enabled: true, company_description: "We sell", language: "en" } },
      prefill: { channels: ["widget"] },
      context: CONTEXT,
    })
    expect(a.channels).toEqual(["email", "facebook"])
    expect(a.quick_replies).toEqual([])
    expect(a.ai).toEqual({ enabled: true, company_description: "We sell", language: "en" })
  })

  it("prepare emits exactly the SCHEMAS.md payload and omits ai without the feature", () => {
    const hours = defaultHours()
    const draft: SocialAnswers = {
      channels: ["facebook", "facebook", "email"],
      timezone: "Asia/Tbilisi",
      hours,
      welcome_message: { ka: " გამარჯობა ", en: "Hello " },
      away_message: { ka: "", en: "" },
      assignment: "claim",
      collect_rating: true,
      quick_replies: [
        { title: " Hours ", message: { ka: "10-19", en: " 10-19" } },
        { title: "", message: { ka: "", en: " " } },
      ],
      ai: { enabled: true, company_description: " Salon in Tbilisi ", language: "en" },
    }
    expect(prepareSocialAnswers(draft)).toEqual({
      channels: ["facebook", "email"],
      timezone: "Asia/Tbilisi",
      hours,
      welcome_message: { ka: "გამარჯობა", en: "Hello" },
      away_message: { ka: "", en: "" },
      assignment: "claim",
      collect_rating: true,
      quick_replies: [{ title: "Hours", message: { ka: "10-19", en: "10-19" } }],
      ai: { enabled: true, company_description: "Salon in Tbilisi", language: "en" },
    })
    const noAi = prepareSocialAnswers({ ...draft, ai: null })
    expect("ai" in noAi).toBe(false)
    expect(Object.keys(noAi).sort()).toEqual(["assignment", "away_message", "channels", "collect_rating", "hours", "quick_replies", "timezone", "welcome_message"])
  })

  it("connectionsOf counts pages + Instagram accounts, telegram objects and lists", () => {
    const c = connectionsOf(CONTEXT)
    expect(c.facebook).toEqual({ count: 2, names: ["Amanati", "amanati.ge"] })
    expect(c.telegram.count).toBe(0)
    expect(connectionsOf({ connections: { telegram: { connected: true, accounts: [{ username: "shop" }] } } }).telegram).toEqual({ count: 1, names: ["shop"] })
    expect(connectionsOf({ connections: { telegram: { connected: false } } }).telegram.count).toBe(0)
  })
})

describe("SocialIntegrationsStep", () => {
  const initial = initSocialAnswers({ answers: {}, prefill: {}, context: CONTEXT })

  it("shows the connection status per channel and the selection", () => {
    renderOnb(<Harness initial={initial} onChange={() => {}} />)
    expect(screen.getByTestId("onb-social-status-facebook")).toHaveTextContent("2 connected")
    expect(screen.getByTestId("onb-social-names-facebook")).toHaveTextContent("Amanati, amanati.ge")
    expect(screen.getByTestId("onb-social-status-whatsapp")).toHaveTextContent("Not connected")
    expect(screen.getByTestId("onb-social-select-facebook")).toHaveAttribute("aria-checked", "true")
    expect(screen.getByTestId("onb-social-select-email")).toHaveAttribute("aria-checked", "false")
    expect(screen.getByTestId("onb-social-ai")).toBeInTheDocument()
  })

  it("Facebook / WhatsApp: fetch the OAuth start URL (with a return hint) and open it in a new tab", async () => {
    mocks.get.mockResolvedValueOnce({ data: { oauth_url: "https://facebook.com/dialog/oauth?x=1" } })
    renderOnb(<Harness initial={initial} onChange={() => {}} context={{ ...CONTEXT, oauth: { whatsapp_start: "/api/social/whatsapp/custom-start/" } }} />)
    fireEvent.click(screen.getByTestId("onb-social-connect-facebook"))
    await waitFor(() => expect(window.open).toHaveBeenCalledWith("https://facebook.com/dialog/oauth?x=1", "_blank", "noopener"))
    expect(mocks.get).toHaveBeenCalledWith("/api/social/facebook/oauth/start/", { params: { return_to: "onboarding" } })

    mocks.get.mockResolvedValueOnce({ data: { oauth_url: "https://wa.example/start" } })
    fireEvent.click(screen.getByTestId("onb-social-connect-whatsapp"))
    await waitFor(() => expect(window.open).toHaveBeenCalledWith("https://wa.example/start", "_blank", "noopener"))
    expect(mocks.get).toHaveBeenLastCalledWith("/api/social/whatsapp/custom-start/", { params: { return_to: "onboarding" } })

    mocks.get.mockRejectedValueOnce({ response: { data: { error: "App not configured" } } })
    fireEvent.click(screen.getByTestId("onb-social-connect-facebook"))
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ variant: "destructive", description: "App not configured" })))
  })

  it("Telegram: phone → code → connected, through the connect and verify endpoints", async () => {
    const onChange = vi.fn()
    renderOnb(<Harness initial={initial} onChange={onChange} />)
    fireEvent.click(screen.getByTestId("onb-social-connect-telegram"))
    const form = screen.getByTestId("onb-social-telegram-form")
    expect(screen.getByTestId("onb-social-telegram-send")).toBeDisabled()
    fireEvent.change(within(form).getByTestId("onb-tg-phone"), { target: { value: "+995 599 123456" } })
    expect(within(form).getByTestId("onb-tg-phone")).toHaveValue("+995599123456")

    mocks.post.mockResolvedValueOnce({ data: { status: "code_sent", login_token: "tok" } })
    fireEvent.click(screen.getByTestId("onb-social-telegram-send"))
    await waitFor(() => expect(mocks.post).toHaveBeenCalledWith("/api/social/telegram/connect/", { phone_number: "+995599123456" }))
    await waitFor(() => expect(within(form).getByTestId("onb-tg-code")).toBeInTheDocument())

    fireEvent.change(within(form).getByTestId("onb-tg-code"), { target: { value: "12345" } })
    mocks.post.mockResolvedValueOnce({ data: { status: "connected", account: { first_name: "Shop", last_name: "", username: "shop", phone_number: "+995599123456" } } })
    fireEvent.click(screen.getByTestId("onb-social-telegram-verify"))
    await waitFor(() => expect(mocks.post).toHaveBeenLastCalledWith("/api/social/telegram/verify/", { login_token: "tok", code: "12345" }))
    await waitFor(() => expect(screen.getByTestId("onb-social-status-telegram")).toHaveTextContent("1 connected"))
    expect(screen.queryByTestId("onb-social-telegram-form")).toBeNull()
    const last = onChange.mock.calls[onChange.mock.calls.length - 1][0] as SocialAnswers
    expect(last.channels).toContain("telegram")
  })

  it("Telegram: a 2FA account asks for the password", async () => {
    renderOnb(<Harness initial={initial} onChange={() => {}} />)
    fireEvent.click(screen.getByTestId("onb-social-connect-telegram"))
    fireEvent.change(screen.getByTestId("onb-tg-phone"), { target: { value: "+995599123456" } })
    mocks.post.mockResolvedValueOnce({ data: { status: "code_sent", login_token: "tok" } })
    fireEvent.click(screen.getByTestId("onb-social-telegram-send"))
    await waitFor(() => expect(screen.getByTestId("onb-tg-code")).toBeInTheDocument())
    fireEvent.change(screen.getByTestId("onb-tg-code"), { target: { value: "12345" } })
    mocks.post.mockResolvedValueOnce({ data: { status: "password_required" } })
    fireEvent.click(screen.getByTestId("onb-social-telegram-verify"))
    await waitFor(() => expect(screen.getByTestId("onb-tg-password")).toBeInTheDocument())
    fireEvent.change(screen.getByTestId("onb-tg-password"), { target: { value: "secret" } })
    mocks.post.mockResolvedValueOnce({ data: { status: "connected" } })
    fireEvent.click(screen.getByTestId("onb-social-telegram-verify"))
    await waitFor(() => expect(mocks.post).toHaveBeenLastCalledWith("/api/social/telegram/verify/", { login_token: "tok", password: "secret" }))
  })

  it("E-mail: the connect form in a sheet with provider presets posts to /api/social/email/connect/", async () => {
    renderOnb(<Harness initial={initial} onChange={() => {}} />)
    fireEvent.click(screen.getByTestId("onb-social-connect-email"))
    const form = await screen.findByTestId("email-connect-form")
    fireEvent.click(within(form).getByTestId("email-provider-gmail"))
    expect(within(form).getByTestId("email-connect-imap")).toHaveValue("imap.gmail.com")
    fireEvent.change(within(form).getByTestId("email-connect-address"), { target: { value: "shop@outlook.com" } })
    expect(within(form).getByTestId("email-connect-imap")).toHaveValue("outlook.office365.com")
    expect(within(form).getByTestId("email-connect-smtp")).toHaveValue("smtp.office365.com")
    fireEvent.change(within(form).getByTestId("email-connect-password"), { target: { value: "app-pass" } })

    mocks.post.mockResolvedValueOnce({ data: { status: "ok", connection: { id: 5 } } })
    fireEvent.click(within(form).getByTestId("email-connect-submit"))
    await waitFor(() => expect(mocks.post).toHaveBeenCalledTimes(1))
    const [url, body] = mocks.post.mock.calls[0]
    expect(url).toBe("/api/social/email/connect/")
    expect(body).toMatchObject({
      email_address: "shop@outlook.com",
      username: "shop@outlook.com",
      password: "app-pass",
      imap_server: "outlook.office365.com",
      imap_port: 993,
      smtp_server: "smtp.office365.com",
      smtp_port: 587,
    })
    await waitFor(() => expect(screen.getByTestId("onb-social-status-email")).toHaveTextContent("1 connected"))
  })

  it("Website chat: creates the widget connection and shows the embed snippet", async () => {
    mocks.post.mockResolvedValueOnce({ data: { id: 9, widget_token: "wtok123", label: "Website" } })
    renderOnb(<Harness initial={initial} onChange={() => {}} />)
    fireEvent.click(screen.getByTestId("onb-social-connect-widget"))
    await waitFor(() => expect(mocks.post).toHaveBeenCalledWith("/api/widget/admin/connections/", { label: "Website" }))
    await waitFor(() => expect(screen.getByTestId("widget-install")).toHaveTextContent("widget.js?t=wtok123"))
    expect(screen.getByTestId("onb-social-status-widget")).toHaveTextContent("1 connected")
    fireEvent.click(screen.getByTestId("onb-social-widget-snippet"))
    expect(screen.queryByTestId("widget-install")).toBeNull()
  })

  it("an existing widget shows its snippet without creating another", () => {
    renderOnb(<Harness initial={initial} onChange={() => {}} context={{ ...CONTEXT, connections: { ...CONTEXT.connections, widget: [{ widget_token: "existing", label: "Site" }] } }} />)
    expect(screen.queryByTestId("onb-social-connect-widget")).toBeNull()
    fireEvent.click(screen.getByTestId("onb-social-widget-snippet"))
    expect(screen.getByTestId("widget-install")).toHaveTextContent("t=existing")
    expect(mocks.post).not.toHaveBeenCalled()
  })

  it("builds the rest of the answers: timezone, hours, messages, assignment, rating, quick replies, AI", () => {
    const onChange = vi.fn()
    renderOnb(<Harness initial={initial} onChange={onChange} />)
    const last = () => onChange.mock.calls[onChange.mock.calls.length - 1][0] as SocialAnswers

    fireEvent.click(screen.getByTestId("onb-social-select-email"))
    expect(last().channels).toEqual(["facebook", "email"])
    fireEvent.change(screen.getByTestId("onb-social-timezone-select"), { target: { value: "Europe/London" } })
    expect(last().timezone).toBe("Europe/London")
    fireEvent.click(screen.getByTestId("onb-social-hours-sat-toggle"))
    expect(last().hours.sat).toEqual({ from: "09:00", to: "18:00", break_from: null, break_to: null })
    fireEvent.change(screen.getByTestId("onb-social-welcome-ka"), { target: { value: "გამარჯობა" } })
    fireEvent.change(screen.getByTestId("onb-social-away-en"), { target: { value: "We are closed" } })
    expect(last().welcome_message.ka).toBe("გამარჯობა")
    expect(last().away_message.en).toBe("We are closed")
    fireEvent.click(screen.getByTestId("onb-social-assignment-claim"))
    expect(last().assignment).toBe("claim")
    fireEvent.click(screen.getByTestId("onb-social-rating-switch"))
    expect(last().collect_rating).toBe(true)

    expect(screen.getByTestId("onb-social-quick-row-0-title")).toHaveValue("Hours")
    fireEvent.click(screen.getByTestId("onb-social-quick-add"))
    fireEvent.change(screen.getByTestId("onb-social-quick-row-2-title"), { target: { value: "Thanks" } })
    fireEvent.change(screen.getByTestId("onb-social-quick-row-2-message-en"), { target: { value: "Thank you!" } })
    expect(last().quick_replies[2]).toEqual({ title: "Thanks", message: { ka: "", en: "Thank you!" } })
    fireEvent.click(screen.getByTestId("onb-social-quick-row-1-remove"))
    expect(last().quick_replies.map((q) => q.title)).toEqual(["Hours", "Thanks"])

    fireEvent.click(screen.getByTestId("onb-social-ai-enabled-switch"))
    fireEvent.change(screen.getByTestId("onb-social-ai-description"), { target: { value: "Salon in Tbilisi" } })
    fireEvent.change(screen.getByTestId("onb-social-ai-language-select"), { target: { value: "en" } })
    expect(last().ai).toEqual({ enabled: true, company_description: "Salon in Tbilisi", language: "en" })
  })

  it("renders nested errors next to the fields", () => {
    renderOnb(
      <Harness
        initial={initial}
        errors={{
          channels: ["Pick at least one"],
          welcome_message: { ka: ["Too long"] },
          quick_replies: [{ title: ["Required"] }],
          ai: { company_description: ["Tell us more"] },
          hours: { mon: { to: ["Must be after from"] } },
        }}
        onChange={() => {}}
      />
    )
    expect(screen.getByText("Pick at least one")).toBeInTheDocument()
    expect(screen.getByTestId("onb-social-welcome-error")).toHaveTextContent("Too long")
    expect(screen.getByTestId("onb-social-quick-row-0")).toHaveTextContent("Required")
    expect(screen.getByTestId("onb-social-ai-description-error")).toHaveTextContent("Tell us more")
    expect(screen.getByTestId("onb-social-hours-error")).toHaveTextContent("Must be after from")
  })
})
