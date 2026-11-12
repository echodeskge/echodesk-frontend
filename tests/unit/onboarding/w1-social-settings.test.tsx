/**
 * ONB-W1: Settings → Social opens the auto-reply / chat-management / e-mail /
 * advanced / AI tabs to tenant admins and `manage_social_settings` holders
 * (not only staff), and the Telegram notification sound is saved.
 */
import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, screen, within } from "@testing-library/react"
import { renderSt } from "../settings/st-helpers"

const mutate = vi.fn()
const state = { staff: false, canManage: false, settings: {} as Record<string, unknown> }

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { is_staff: state.staff } }) }))
vi.mock("@/hooks/useMyAccess", () => ({
  useMyAccess: () => ({ loaded: true, isStaff: state.staff, isSuperuser: false, canManageSocialSettings: state.staff || state.canManage, has: () => false }),
}))
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

const ALL_TABS = ["Notifications", "Auto-Reply", "Chat Management", "Email", "Advanced", "AI Companion"]
const tabs = () => within(screen.getByTestId("social-settings-tabs")).getAllByRole("radio").map((r) => r.textContent)

beforeEach(() => {
  mutate.mockClear()
  state.staff = false
  state.canManage = false
  state.settings = { timezone: "Asia/Tbilisi", notification_sound_telegram: "mixkit-bell-notification-933.wav" }
})

describe("Settings > Social gating (ONB-W1)", () => {
  it("an agent without the permission sees only Notifications", () => {
    renderSt(<SocialSettingsPage />)
    expect(tabs()).toEqual(["Notifications"])
  })

  it("a tenant admin / manage_social_settings holder gets every tab", () => {
    state.canManage = true
    renderSt(<SocialSettingsPage />)
    expect(tabs()).toEqual(ALL_TABS)
    fireEvent.click(screen.getByRole("radio", { name: /Chat Management/ }))
    expect(screen.getByRole("switch", { name: /hide assigned chats/i })).toBeInTheDocument()
  })

  it("staff users keep their access", () => {
    state.staff = true
    renderSt(<SocialSettingsPage />)
    expect(tabs()).toEqual(ALL_TABS)
  })

  it("the Telegram sound has a row and is part of the saved payload", () => {
    state.canManage = true
    renderSt(<SocialSettingsPage />)
    expect(screen.getByTestId("sound-row-telegram")).toBeInTheDocument()
    fireEvent.click(screen.getByTestId("settings-savebar-save"))
    expect(mutate).toHaveBeenCalledTimes(1)
    expect(mutate.mock.calls[0][0]).toMatchObject({ notification_sound_telegram: "mixkit-bell-notification-933.wav" })
  })
})
