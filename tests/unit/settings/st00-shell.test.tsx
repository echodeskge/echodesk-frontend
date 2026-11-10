/**
 * ST-00 settings shell: grouped nav, header breadcrumb + back + search box,
 * search over translated labels and descriptions, the HOME grid (and the
 * mobile list it doubles as), the drill-down crumb and the save bar slot.
 */
import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { screen, fireEvent, within, act } from "@testing-library/react"
import { renderSt } from "./st-helpers"

const state = vi.hoisted(() => ({
  pathname: "/settings/general",
  user: { is_staff: true } as Record<string, unknown>,
  profile: { is_staff: true, feature_keys: [] } as Record<string, unknown>,
}))

vi.mock("next/navigation", () => ({ usePathname: () => state.pathname }))
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))
vi.mock("@/contexts/SubscriptionContext", () => ({ useSubscription: () => ({ hasFeature: () => false }) }))
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: state.user }) }))
vi.mock("@/hooks/useUserProfile", () => ({ useUserProfile: () => ({ data: state.profile }) }))
vi.mock("@/contexts/TenantContext", () => ({ useTenant: () => ({ tenant: { tenant_name: "Demo Shop" } }) }))

import { SettingsShell } from "@/app/(tenant)/settings/_components/settings-shell"
import SettingsIndexPage from "@/app/(tenant)/settings/page"
import { useSettingsSubCrumb } from "@/app/(tenant)/settings/_lib/settings-crumb"
import { StickySaveBar } from "@/components/redesign/settings"

const saveLabels = { unsaved: "Unsaved", discard: "Discard", save: "Save changes" }

function renderShell(child: React.ReactNode = <div>page body</div>, locale: "en" | "ka" = "en") {
  return renderSt(<SettingsShell>{child}</SettingsShell>, locale)
}

beforeEach(() => {
  state.pathname = "/settings/general"
  state.user = { is_staff: true }
  state.profile = { is_staff: true, feature_keys: [] }
})

describe("settings shell", () => {
  it("renders the grouped nav with the active page and the content", () => {
    renderShell()
    const nav = screen.getByTestId("settings-nav")
    expect(within(nav).getByText("Workspace")).toBeInTheDocument()
    expect(within(nav).getByText("Business modules")).toBeInTheDocument()
    expect(within(nav).getByTestId("settings-nav-general")).toHaveAttribute("aria-current", "page")
    expect(within(nav).getByTestId("settings-nav-pbx")).toHaveAttribute("href", "/settings/pbx")
    expect(screen.getByTestId("settings-scroll")).toHaveTextContent("page body")
  })

  it("puts the page label and a phone back link into the header crumb", () => {
    state.pathname = "/settings/social/connections"
    renderShell()
    const crumb = within(screen.getByTestId("outlet-breadcrumb"))
    expect(crumb.getByText("Connections")).toBeInTheDocument()
    expect(crumb.getByTestId("settings-header-back")).toHaveAttribute("href", "/settings")
    expect(crumb.getByTestId("settings-header-back")).toHaveAttribute("aria-label", "Back to settings")
  })

  it("keeps the page label and back link on a page whose nav item is hidden for the user", () => {
    state.pathname = "/settings/calls"
    state.user = { is_staff: false }
    state.profile = { is_staff: false, feature_keys: ["settings"], permissions_list: [] }
    renderShell()
    expect(within(screen.getByTestId("settings-nav")).queryByTestId("settings-nav-calls")).toBeNull()
    expect(within(screen.getByTestId("settings-nav")).queryByRole("link", { current: "page" })).toBeNull()
    const crumb = within(screen.getByTestId("outlet-breadcrumb"))
    expect(crumb.getByText("Calls & SIP")).toBeInTheDocument()
    expect(crumb.getByTestId("settings-header-back")).toHaveAttribute("href", "/settings")
  })

  it("adds a drill-down crumb from the page and links the page label", () => {
    state.pathname = "/settings/item-lists/1"
    function Detail() {
      useSettingsSubCrumb("Branches")
      return <div>detail</div>
    }
    renderShell(<Detail />)
    const crumb = within(screen.getByTestId("outlet-breadcrumb"))
    expect(crumb.getByText("Item Lists").closest("a")).toHaveAttribute("href", "/settings/item-lists")
    expect(crumb.getByText("Branches")).toBeInTheDocument()
  })

  it("links view_reports-only users to PBX statistics, like before", () => {
    state.user = { is_staff: false }
    state.profile = { is_staff: false, feature_keys: ["ip_calling", "settings"], permissions_list: ["view_reports"] }
    renderShell()
    const nav = screen.getByTestId("settings-nav")
    expect(within(nav).getByTestId("settings-nav-pbx")).toHaveAttribute("href", "/settings/pbx/statistics")
    expect(within(nav).queryByTestId("settings-nav-calls")).toBeNull()
    expect(within(nav).queryByTestId("settings-nav-security")).toBeNull()
  })

  it("filters the nav from the header search box and shows no-results", () => {
    renderShell()
    const search = within(screen.getByTestId("outlet-icons")).getByTestId("settings-search")
    expect(search).toHaveAttribute("placeholder", "Search settings…")
    fireEvent.change(search, { target: { value: "roles" } })
    const nav = screen.getByTestId("settings-nav")
    expect(within(nav).getByTestId("settings-nav-users")).toBeInTheDocument()
    expect(within(nav).queryByTestId("settings-nav-general")).toBeNull()
    fireEvent.change(within(screen.getByTestId("outlet-icons")).getByTestId("settings-search"), { target: { value: "zzz" } })
    expect(within(nav).getByTestId("settings-no-results")).toHaveTextContent('No settings match "zzz"')
    fireEvent.click(within(screen.getByTestId("outlet-icons")).getByRole("button", { name: "Clear search" }))
    expect(within(nav).getByTestId("settings-nav-general")).toBeInTheDocument()
  })

  it("portals a page's save bar into the slot under the scroll area", () => {
    renderShell(<StickySaveBar dirty onSave={() => {}} labels={saveLabels} />)
    expect(within(screen.getByTestId("settings-scroll")).queryByTestId("settings-savebar")).toBeNull()
    const slot = screen.getByTestId("settings-savebar-slot")
    expect(within(slot).getByTestId("settings-savebar")).toHaveTextContent("Unsaved")
  })
})

describe("settings home", () => {
  beforeEach(() => {
    state.pathname = "/settings"
  })

  it("shows the workspace grid built from the visible nav (no redirect)", () => {
    renderShell(<SettingsIndexPage />)
    const home = screen.getByTestId("settings-home")
    expect(within(home).getByRole("heading", { name: "Workspace settings" })).toBeInTheDocument()
    expect(within(home).getByText("Configure Demo Shop for your team.")).toBeInTheDocument()
    expect(within(home).getByTestId("settings-home-group-calls")).toBeInTheDocument()
    expect(within(home).getByTestId("settings-home-users")).toHaveAttribute("href", "/settings/users")
    expect(within(home).getByText("Team members, roles and access")).toBeInTheDocument()
    // No page crumb on the home.
    expect(screen.getByTestId("outlet-breadcrumb")).toBeEmptyDOMElement()
  })

  it("hides cards the user can't open", () => {
    state.user = { is_staff: false }
    state.profile = { is_staff: false, feature_keys: ["leave_management", "settings"], permissions_list: [] }
    renderShell(<SettingsIndexPage />)
    const home = screen.getByTestId("settings-home")
    expect(within(home).queryByTestId("settings-home-group-calls")).toBeNull()
    expect(within(home).queryByTestId("settings-home-security")).toBeNull()
    expect(within(home).getByTestId("settings-home-leave")).toBeInTheDocument()
  })

  it("doubles as the mobile nav list with descriptions, sharing the search", () => {
    renderShell(<SettingsIndexPage />)
    const list = screen.getByTestId("settings-mobile-nav")
    expect(within(list).getByTestId("settings-mnav-calls")).toHaveTextContent("SIP accounts, working hours and sounds")
    fireEvent.change(within(list).getByTestId("settings-search-mobile"), { target: { value: "invoice" } })
    expect(within(list).getByTestId("settings-mnav-invoices")).toBeInTheDocument()
    expect(within(list).queryByTestId("settings-mnav-users")).toBeNull()
    const home = screen.getByTestId("settings-home")
    expect(within(home).getByTestId("settings-home-invoices")).toBeInTheDocument()
    expect(within(home).queryByTestId("settings-home-users")).toBeNull()
    act(() => {
      fireEvent.change(within(list).getByTestId("settings-search-mobile"), { target: { value: "nothing-here" } })
    })
    expect(within(home).getByTestId("settings-no-results")).toBeInTheDocument()
  })

  it("is fully Georgian in ka", () => {
    renderShell(<SettingsIndexPage />, "ka")
    const home = screen.getByTestId("settings-home")
    expect(within(home).getByRole("heading", { name: "სამუშაო სივრცის პარამეტრები" })).toBeInTheDocument()
    expect(within(screen.getByTestId("outlet-icons")).getByTestId("settings-search")).toHaveAttribute("placeholder", "პარამეტრების ძიება…")
  })
})
