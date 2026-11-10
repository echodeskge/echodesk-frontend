/**
 * ST-02 Settings > Social as a FORM PAGE: same tabs and staff gate, the
 * page Save in the sticky save bar (always visible), Discard restores the
 * loaded values, and Save sends exactly the payload the page always sent.
 */
import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { screen, fireEvent, within } from "@testing-library/react"
import { renderSt } from "./st-helpers"

const mutate = vi.fn()
const state: { staff: boolean; settings: Record<string, unknown> } = { staff: true, settings: {} }

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { is_staff: state.staff } }) }))
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }))
vi.mock("@/components/social/EmailSyncDebug", () => ({ EmailSyncDebug: () => <div data-testid="email-sync-debug-mock" /> }))
vi.mock("@/app/(tenant)/settings/social/AICompanionTab", () => ({ AICompanionTab: () => <div data-testid="ai-tab-mock" /> }))
vi.mock("@/utils/notificationSound", async (orig) => {
  const real = await orig<typeof import("@/utils/notificationSound")>()
  return { ...real, getNotificationSound: () => ({ updateSettings: vi.fn(), preview: vi.fn() }) }
})
vi.mock("@/hooks/api/useSocial", () => ({
  useSocialSettings: () => ({ data: state.settings, isLoading: false }),
  useUpdateSocialSettings: () => ({ mutate, isPending: false }),
  useClearPlatformHistory: () => ({ mutate: vi.fn(), isPending: false }),
  useEmailStatus: () => ({ data: { connections: [] } }),
}))

import SocialSettingsPage from "@/app/(tenant)/settings/social/page"

const SETTINGS = {
  chat_assignment_enabled: true,
  hide_assigned_chats: false,
  collect_customer_rating: false,
  stale_assignment_reminder_enabled: true,
  stale_assignment_reminder_minutes: 90,
  link_based_rating_enabled: false,
  rating_request_message_template_ka: "",
  rating_request_message_template_en: "",
  post_review_redirect_url: "",
  notification_sound_facebook: "mixkit-bell-notification-933.wav",
  notification_sound_instagram: "",
  notification_sound_whatsapp: "",
  notification_sound_email: "",
  notification_sound_widget: "default",
  notification_sound_team_chat: "",
  notification_sound_system: "",
  timezone: "Asia/Tbilisi",
  away_hours_enabled: false,
  away_hours_schedule: {},
  auto_reply_settings: { facebook: { welcome_enabled: true, welcome_message: "Hi", away_enabled: false, away_message: "" } },
}

beforeEach(() => {
  mutate.mockClear()
  state.staff = true
  state.settings = { ...SETTINGS }
})

const tabs = () => within(screen.getByTestId("social-settings-tabs")).getAllByRole("radio").map((r) => r.textContent)

describe("Settings > Social (ST-02)", () => {
  it("offers staff the same six tabs", () => {
    renderSt(<SocialSettingsPage />)
    expect(tabs()).toEqual(["Notifications", "Auto-Reply", "Chat Management", "Email", "Advanced", "AI Companion"])
  })

  it("non-staff users see only the Notifications tab", () => {
    state.staff = false
    renderSt(<SocialSettingsPage />)
    expect(tabs()).toEqual(["Notifications"])
    expect(screen.getByTestId("settings-savebar")).toBeInTheDocument()
  })

  it("Save sends the same payload as before (widget 'default' falls back to a real sound)", () => {
    renderSt(<SocialSettingsPage />)
    expect(screen.getByTestId("settings-savebar")).toHaveTextContent("All changes saved")
    fireEvent.click(screen.getByTestId("settings-savebar-save"))
    expect(mutate).toHaveBeenCalledTimes(1)
    expect(mutate.mock.calls[0][0]).toEqual({
      chat_assignment_enabled: true,
      session_management_enabled: true,
      hide_assigned_chats: false,
      collect_customer_rating: false,
      stale_assignment_reminder_enabled: true,
      stale_assignment_reminder_minutes: 90,
      link_based_rating_enabled: false,
      rating_request_message_template_ka: "გმადლობთ ჩვენთან საუბრისთვის! გთხოვთ შეაფასოთ თქვენი გამოცდილება: {link}",
      rating_request_message_template_en: "Thank you for chatting with us! Please rate your experience: {link}",
      post_review_redirect_url: "",
      notification_sound_facebook: "mixkit-bell-notification-933.wav",
      notification_sound_instagram: "mixkit-magic-notification-ring-2344.wav",
      notification_sound_whatsapp: "mixkit-positive-notification-951.wav",
      notification_sound_email: "mixkit-bell-notification-933.wav",
      notification_sound_widget: "mixkit-bubble-pop-up-alert-notification-2357.wav",
      notification_sound_team_chat: "mixkit-happy-bells-notification-937.wav",
      notification_sound_system: "mixkit-confirmation-tone-2867.wav",
      timezone: "Asia/Tbilisi",
      away_hours_enabled: false,
      away_hours_schedule: {},
      auto_reply_settings: {
        facebook: { welcome_enabled: true, welcome_message: "Hi", away_enabled: false, away_message: "" },
        instagram: { welcome_enabled: false, welcome_message: "", away_enabled: false, away_message: "" },
        whatsapp: { welcome_enabled: false, welcome_message: "", away_enabled: false, away_message: "" },
      },
    })
  })

  it("a change marks the bar dirty, clamps the minutes on save and Discard restores the loaded values", () => {
    renderSt(<SocialSettingsPage />)
    fireEvent.click(screen.getByRole("radio", { name: /Chat Management/ }))
    fireEvent.click(screen.getByRole("switch", { name: /hide assigned chats/i }))
    fireEvent.change(screen.getByLabelText(/Inactivity threshold/i), { target: { value: "2" } })
    expect(screen.getByTestId("settings-savebar")).toHaveTextContent("You have unsaved changes")
    fireEvent.click(screen.getByTestId("settings-savebar-save"))
    expect(mutate.mock.calls[0][0]).toMatchObject({ hide_assigned_chats: true, stale_assignment_reminder_minutes: 5 })

    fireEvent.click(screen.getByTestId("settings-savebar-discard"))
    expect(screen.getByRole("switch", { name: /hide assigned chats/i })).toHaveAttribute("aria-checked", "false")
    expect(screen.getByLabelText(/Inactivity threshold/i)).toHaveValue(90)
    expect(screen.getByTestId("settings-savebar")).toHaveTextContent("All changes saved")
  })

  it("keeps the dependent rows hidden until their switch is on", () => {
    renderSt(<SocialSettingsPage />)
    fireEvent.click(screen.getByRole("radio", { name: /Chat Management/ }))
    expect(screen.queryByLabelText(/Rating request message \(Georgian\)/i)).toBeNull()
    fireEvent.click(screen.getByRole("switch", { name: /collect customer rating/i }))
    fireEvent.click(screen.getByRole("switch", { name: /link-based rating/i }))
    expect(screen.getByLabelText(/Rating request message \(Georgian\)/i)).toBeInTheDocument()
  })

  it("renders in Georgian with the new save bar texts", () => {
    renderSt(<SocialSettingsPage />, "ka")
    expect(screen.getByTestId("settings-savebar")).toHaveTextContent("ყველა ცვლილება შენახულია")
  })
})
