/**
 * ST-00 settings nav: the gates are the pre-redesign sidebar's (same fields,
 * same filter, same links), every item has a design group + description in
 * en and ka, and search matches translated labels and descriptions.
 * The role matrix is the one recorded from today's sidebar in the local
 * browser (fixtures/nav-matrix-baseline.json, ~/Echodesk/.wt/st-shots).
 */
import { describe, it, expect, vi } from "vitest"
import { renderHook } from "@testing-library/react"
import matrix from "./fixtures/nav-matrix-baseline.json"
import { messages, lookup } from "./st-helpers"

const state = vi.hoisted(() => ({
  pathname: "/settings/general",
  user: {} as Record<string, unknown>,
  profile: {} as Record<string, unknown>,
  subscription: [] as string[],
}))

vi.mock("next/navigation", () => ({ usePathname: () => state.pathname }))
vi.mock("@/contexts/SubscriptionContext", () => ({ useSubscription: () => ({ hasFeature: (k: string) => state.subscription.includes(k) }) }))
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: state.user }) }))
vi.mock("@/hooks/useUserProfile", () => ({ useUserProfile: () => ({ data: state.profile }) }))

import {
  SETTINGS_GROUPS,
  activeSettingsId,
  groupSettingsNav,
  matchesSettingsSearch,
  settingsNav,
} from "@/app/(tenant)/settings/_lib/settings-nav"
import { useSettingsNav } from "@/app/(tenant)/settings/_lib/use-settings-nav"

const ALL = [
  "advanced_analytics", "ai_companion", "booking_management", "ecommerce_crm", "invoice_management", "ip_calling",
  "leave_management", "order_management", "settings", "social_integrations", "ticket_management", "user_management",
]
const ADMIN_PERMS = ["manage_settings", "manage_users", "view_reports", "manage_groups"]
const MANAGER_PERMS = ["view_reports", "assign_tickets", "export_data"]
const AGENT_PERMS = ["create_tickets", "edit_own_tickets", "make_calls"]

/** Profiles of the local demo users the matrix was recorded with (only the fields the gates read). */
const ROLES: Record<string, { staff: boolean; perms: string[]; features: string[] }> = {
  admin: { staff: true, perms: ADMIN_PERMS, features: ALL },
  manager: { staff: false, perms: MANAGER_PERMS, features: ALL },
  agent: { staff: false, perms: AGENT_PERMS, features: ALL },
  agent2: { staff: false, perms: [...AGENT_PERMS, "access_orders"], features: ALL },
  viewer: { staff: false, perms: ["create_tickets"], features: ["leave_management", "ticket_management"] },
  "manager:no-ip_calling,social_integrations": { staff: false, perms: MANAGER_PERMS, features: ALL.filter((k) => !["ip_calling", "social_integrations"].includes(k)) },
  "manager:only-ecommerce_crm+settings": { staff: false, perms: MANAGER_PERMS, features: ["ecommerce_crm", "settings"] },
  "manager:no-ticket_management,ecommerce_crm": { staff: false, perms: MANAGER_PERMS, features: ALL.filter((k) => !["ticket_management", "ecommerce_crm"].includes(k)) },
  "agent:+manage_settings": { staff: false, perms: [...AGENT_PERMS, "manage_settings"], features: ALL },
  "admin:only-leave_management+settings": { staff: true, perms: ADMIN_PERMS, features: ["leave_management", "settings"] },
}

function hrefsFor(role: string) {
  const r = ROLES[role]
  state.user = { is_staff: r.staff, is_superuser: false }
  state.profile = { is_staff: r.staff, is_superuser: false, permissions_list: r.perms, feature_keys: r.features }
  const { result } = renderHook(() => useSettingsNav())
  return result.current.visibleItems.map((i) => result.current.linkFor(i))
}

describe("settings nav gates (unchanged from the pre-redesign sidebar)", () => {
  const recorded = matrix as Record<string, string[]>
  // An empty row: the tenant layout sent the user away from /settings (no "settings"
  // feature, e.g. the viewer -> /tickets) before any settings nav rendered.
  const shown = Object.keys(recorded).filter((r) => recorded[r].length > 0)
  const redirected = Object.keys(recorded).filter((r) => recorded[r].length === 0)

  it.each(shown)("shows %s exactly the items and links of today's sidebar", (role) => {
    expect(hrefsFor(role)).toEqual(recorded[role])
  })

  it.each(redirected)("%s never reaches the settings nav (no settings feature)", (role) => {
    expect(ROLES[role].features).not.toContain("settings")
  })

  it("keeps every gate field as before", () => {
    const gates = Object.fromEntries(
      settingsNav.map((i) => [i.id, [i.href, i.labelKey, i.featureKey ?? null, i.staffOnly ?? false, i.anyPermission ?? null, i.hrefWithoutManageSettings ?? null]])
    )
    expect(gates).toEqual({
      general: ["/settings/general", "nav.general", null, false, null, null],
      appearance: ["/settings/appearance", "nav.appearance", null, false, null, null],
      notifications: ["/settings/notifications", "nav.notifications", null, false, null, null],
      social: ["/settings/social", "nav.social", "social_integrations", false, null, null],
      "social-connections": ["/settings/social/connections", "nav.socialConnections", "social_integrations", false, null, null],
      "social-auto-posting": ["/settings/social/auto-posting", "nav.autoPosting", "social_integrations", false, null, null],
      templates: ["/settings/templates", "nav.templates", "social_integrations", false, null, null],
      "social-rating-statistics": ["/settings/social/rating-statistics", "nav.ratingStatistics", "social_integrations", true, null, null],
      calls: ["/settings/calls", "nav.calls", "ip_calling", false, ["can_manage_settings"], null],
      pbx: ["/settings/pbx", "nav.pbx", "ip_calling", false, ["can_manage_settings", "can_view_reports"], "/settings/pbx/statistics"],
      ecommerce: ["/settings/ecommerce", "nav.ecommerce", "ecommerce_crm", false, null, null],
      invoices: ["/settings/invoices", "nav.invoices", "invoice_management", false, null, null],
      bookings: ["/settings/bookings", "nav.bookings", "booking_management", false, null, null],
      leave: ["/settings/leave", "nav.leave", "leave_management", false, null, null],
      "item-lists": ["/settings/item-lists", "nav.itemLists", ["ticket_management", "ecommerce_crm"], false, null, null],
      "ticket-forms": ["/settings/ticket-forms", "nav.ticketForms", "ticket_management", false, null, null],
      users: ["/settings/users", "nav.users", null, false, null, null],
      groups: ["/settings/groups", "nav.groups", null, false, null, null],
      subscription: ["/settings/subscription", "nav.subscription", null, true, null, null],
      security: ["/settings/security", "nav.security", null, true, null, null],
    })
  })

  it("lets staff with no feature keys see everything, and falls back to the subscription for others", () => {
    state.user = { is_staff: true }
    state.profile = { is_staff: true, permissions_list: [], feature_keys: [] }
    let r = renderHook(() => useSettingsNav())
    expect(r.result.current.visibleItems).toHaveLength(settingsNav.length)

    state.user = { is_staff: false }
    state.profile = { is_staff: false, permissions_list: [], feature_keys: "[]" }
    state.subscription = ["leave_management"]
    r = renderHook(() => useSettingsNav())
    expect(r.result.current.visibleItems.map((i) => i.id)).toEqual(["general", "appearance", "notifications", "leave", "users", "groups"])
    state.subscription = []
  })

  it("marks the longest matching item active and knows the home route", () => {
    expect(activeSettingsId(settingsNav, "/settings/social/connections")).toBe("social-connections")
    expect(activeSettingsId(settingsNav, "/settings/social")).toBe("social")
    expect(activeSettingsId(settingsNav, "/settings/pbx/statistics/users/3")).toBe("pbx")
    expect(activeSettingsId(settingsNav, "/settings/item-lists/1")).toBe("item-lists")
    expect(activeSettingsId(settingsNav, "/settings")).toBeUndefined()
    state.pathname = "/settings"
    state.user = { is_staff: true }
    state.profile = { is_staff: true, feature_keys: [] }
    const { result } = renderHook(() => useSettingsNav())
    expect(result.current.isHome).toBe(true)
    expect(result.current.activeItem).toBeUndefined()
    state.pathname = "/settings/general"
  })
})

describe("settings nav groups and texts", () => {
  it("puts every item in a design group, in design order", () => {
    const grouped = groupSettingsNav(settingsNav)
    expect(grouped.map((g) => g.group)).toEqual([...SETTINGS_GROUPS])
    expect(grouped.flatMap((g) => g.items.map((i) => i.id))).toEqual(settingsNav.map((i) => i.id))
    expect(Object.fromEntries(grouped.map((g) => [g.group, g.items.map((i) => i.id)]))).toEqual({
      workspace: ["general", "appearance", "notifications"],
      channels: ["social", "social-connections", "social-auto-posting", "templates", "social-rating-statistics"],
      calls: ["calls", "pbx"],
      business: ["ecommerce", "invoices", "bookings", "leave", "item-lists", "ticket-forms"],
      team: ["users", "groups"],
      account: ["subscription", "security"],
    })
  })

  it("drops empty groups", () => {
    const only = settingsNav.filter((i) => i.id === "users" || i.id === "general")
    expect(groupSettingsNav(only).map((g) => g.group)).toEqual(["workspace", "team"])
  })

  it.each(["en", "ka"] as const)("has a label, description and group label in %s", (loc) => {
    for (const item of settingsNav) {
      expect(typeof lookup(messages[loc], `settings.${item.labelKey}`)).toBe("string")
      expect(lookup(messages[loc], `settings.${item.descKey}`)).toMatch(/\S/)
    }
    for (const g of SETTINGS_GROUPS) expect(lookup(messages[loc], `settings.navGroups.${g}`)).toMatch(/\S/)
  })

  it("matches the search on label or description, ignoring case and spaces", () => {
    expect(matchesSettingsSearch("", "Users", "Team")).toBe(true)
    expect(matchesSettingsSearch("  USE ", "Users", "Team")).toBe(true)
    expect(matchesSettingsSearch("roles", "Users", "Team members, roles and access")).toBe(true)
    expect(matchesSettingsSearch("ზარ", "ზარები", "")).toBe(true)
    expect(matchesSettingsSearch("invoice", "Users", "Team")).toBe(false)
  })
})
