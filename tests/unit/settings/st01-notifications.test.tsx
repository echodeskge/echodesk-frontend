/**
 * ST-01: notification settings and preferences as design form sections in
 * the settings shell, the original card on /preferences/notifications.
 */
import React from "react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { screen, fireEvent, act, within } from "@testing-library/react"
import { renderSt } from "./st-helpers"

const h = vi.hoisted(() => ({
  get: vi.fn(async () => ({ data: [] })),
  put: vi.fn(async () => ({ data: {} })),
  sound: { isEnabled: () => true, getVolume: () => 0.5, enable: vi.fn(), disable: vi.fn(), setVolume: vi.fn(), play: vi.fn() },
  push: { isSupported: true, permission: "granted", isSubscribed: false, isLoading: false, subscribe: vi.fn(), unsubscribe: vi.fn(), sendTestNotification: vi.fn(), error: null as Error | null },
}))

vi.mock("@/api/axios", () => ({ default: { get: h.get, put: h.put } }))
vi.mock("@/utils/notificationSound", () => ({ getNotificationSound: () => h.sound }))
vi.mock("@/hooks/useWebPush", () => ({ useWebPush: () => h.push }))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { NotificationSettings } from "@/components/NotificationSettings"
import { NotificationPreferences } from "@/components/NotificationPreferences"
import NotificationSettingsPage from "@/app/(tenant)/settings/notifications/page"
import PreferencesNotificationsPage from "@/app/(tenant)/preferences/notifications/page"

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  h.push.isSubscribed = false
  h.push.permission = "granted"
})
afterEach(() => {
  vi.useRealTimers()
})

describe("notifications settings page", () => {
  it("renders both components as form sections under the page header", async () => {
    await act(async () => {
      renderSt(<NotificationSettingsPage />)
    })
    expect(screen.getByRole("heading", { name: "Notifications" })).toBeInTheDocument()
    const s = screen.getByTestId("notification-settings")
    expect(s.tagName).toBe("SECTION")
    expect(within(s).getByText("Notification Settings")).toBeInTheDocument()
    expect(screen.getByTestId("notification-preferences").tagName).toBe("SECTION")
  })

  it("/preferences/notifications keeps the card variant", async () => {
    await act(async () => {
      renderSt(<PreferencesNotificationsPage />)
    })
    expect(screen.getByTestId("notification-settings").tagName).toBe("DIV")
    expect(screen.getByTestId("notification-preferences").tagName).toBe("DIV")
    expect(screen.getByText("Notification Preferences")).toBeInTheDocument()
  })
})

describe("NotificationSettings", () => {
  it("toggles the sound and subscribes to push with the same handlers", async () => {
    renderSt(<NotificationSettings variant="settings" />)
    fireEvent.click(screen.getByRole("switch", { name: "Notification Sound" }))
    expect(h.sound.disable).toHaveBeenCalled()
    await act(async () => {
      fireEvent.click(screen.getByRole("switch", { name: /Push Notifications/ }))
    })
    expect(h.push.subscribe).toHaveBeenCalled()
    fireEvent.click(screen.getByTestId("notifications-test-sound"))
    expect(screen.getByTestId("notifications-test-sound")).toBeDisabled()
  })

  it("shows the blocked state and disables the push toggle", () => {
    h.push.permission = "denied"
    renderSt(<NotificationSettings variant="settings" />)
    expect(screen.getByText("Blocked")).toBeInTheDocument()
    expect(screen.getByRole("switch", { name: /Push Notifications/ })).toBeDisabled()
    expect(screen.getByText("Push notifications are blocked")).toBeInTheDocument()
  })
})

describe("NotificationPreferences", () => {
  it("translates the type rows in Georgian (no hard-coded English)", async () => {
    await act(async () => {
      renderSt(<NotificationPreferences variant="settings" />, "ka")
    })
    expect(screen.getByText("ნაწილობრივ დამტკიცებული")).toBeInTheDocument()
    expect(screen.queryByText("Partially Approved")).not.toBeInTheDocument()
    expect(screen.getAllByRole("switch", { name: "მინიჭებული აპში" }).length).toBeGreaterThan(0)
  })

  it("saves a toggle to localStorage and PUTs the bulk payload after 500ms", async () => {
    vi.useFakeTimers()
    await act(async () => {
      renderSt(<NotificationPreferences variant="settings" />)
    })
    const sw = within(screen.getByTestId("notification-category-calls")).getByRole("switch", { name: "Missed Push" })
    expect(sw).toHaveAttribute("aria-checked", "true")
    fireEvent.click(sw)
    expect(JSON.parse(localStorage.getItem("notification_preferences")!).calls.missed.push).toBe(false)
    expect(h.put).not.toHaveBeenCalled()
    await act(async () => {
      vi.advanceTimersByTime(500)
    })
    expect(h.put).toHaveBeenCalledTimes(1)
    const [url, body] = h.put.mock.calls[0] as unknown as [string, Array<Record<string, unknown>>]
    expect(url).toBe("/api/notification-preferences/bulk/")
    expect(body).toContainEqual({ notification_type: "call_missed", in_app: true, sound: true, push: false })
  })

  it("the category channel button flips the whole column", async () => {
    await act(async () => {
      renderSt(<NotificationPreferences variant="settings" />)
    })
    const cat = within(screen.getByTestId("notification-category-calls"))
    fireEvent.click(cat.getByRole("button", { name: /Sound/ }))
    expect(cat.getByRole("switch", { name: "Missed Sound" })).toHaveAttribute("aria-checked", "false")
    expect(cat.getByRole("switch", { name: "Voicemail Sound" })).toHaveAttribute("aria-checked", "false")
  })
})
