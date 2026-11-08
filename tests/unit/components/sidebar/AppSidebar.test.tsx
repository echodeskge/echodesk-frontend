import { describe, it, expect, vi } from "vitest"
import { render, screen, within } from "@testing-library/react"
import React from "react"

globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({ matches: false, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() }),
})

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) =>
    params ? `${key}:${JSON.stringify(params)}` : key,
}))
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock("@/contexts/ThemeContext", () => ({ useTheme: () => ({ mode: "system", setMode: vi.fn() }) }))
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }))
vi.mock("@/hooks/api/useSocial", () => ({
  useUnreadMessagesCount: () => ({ data: { email: 7, facebook: 2, instagram: 1, whatsapp: 1 } }),
}))
vi.mock("sonner", () => ({ toast: { info: vi.fn() } }))

import { AppSidebar, groupNavItems, navGroupOf } from "@/components/AppSidebar"
import { SidebarProvider } from "@/components/ui/sidebar"
import type { MenuItem } from "@/services/permissionService"

const items = [
  { id: "tickets", label: "Boards", icon: "Ticket" },
  { id: "calls", label: "Calls", icon: "Phone" },
  { id: "leave", label: "Leave", icon: "Calendar", children: [{ id: "leave/my-requests", label: "My requests", icon: "List" }] },
  { id: "social/messages", label: "Messages", icon: "MessageSquare" },
  { id: "email", label: "Email", icon: "Mail" },
  { id: "settings", label: "Settings", icon: "Settings" },
  { id: "help", label: "Help Center", icon: "HelpCircle" },
] as unknown as MenuItem[]

function renderSidebar(open = true) {
  return render(
    <SidebarProvider defaultOpen={open}>
      <AppSidebar
        tenant={{ name: "EchoDesk Demo", domain: "demo.echodesk.ge" } as never}
        userProfile={{ first_name: "Nino", last_name: "Beridze", email: "nino@echodesk.ge" } as never}
        visibleMenuItems={items}
        currentView="email"
        onMenuClick={vi.fn()}
        onLogout={vi.fn()}
      />
    </SidebarProvider>
  )
}

describe("AppSidebar", () => {
  it("groups items under section headers without reordering them", () => {
    renderSidebar()
    expect(within(screen.getByTestId("nav-group-work")).getByText("Boards")).toBeInTheDocument()
    expect(within(screen.getByTestId("nav-group-business")).getByText("Leave")).toBeInTheDocument()
    expect(within(screen.getByTestId("nav-group-channels")).getByText("Email")).toBeInTheDocument()
    expect(screen.getByText("groups.work")).toBeInTheDocument()
    expect(screen.getByText("groups.channels")).toBeInTheDocument()
  })

  it("keeps footer items out of the groups and shows the user", () => {
    renderSidebar()
    expect(within(screen.getByTestId("nav-group-work")).queryByText("Settings")).toBeNull()
    expect(screen.getByText("Settings")).toBeInTheDocument()
    expect(screen.getByText("Nino Beridze")).toBeInTheDocument()
    expect(screen.getByText("EchoDesk Demo")).toBeInTheDocument()
  })

  it("marks the active item and shows unread badges", () => {
    renderSidebar()
    const email = screen.getByText("Email").closest("a")!
    expect(email.closest("[data-active=true]")).not.toBeNull()
    expect(screen.getByLabelText("7")).toBeInTheDocument()
    expect(screen.getByLabelText("4")).toBeInTheDocument()
  })

  it("collapses to icon mode", () => {
    const { container } = renderSidebar(false)
    expect(container.querySelector('[data-collapsible="icon"]')).not.toBeNull()
  })
})

describe("nav grouping", () => {
  it("assigns groups by id", () => {
    expect(navGroupOf("tickets")).toBe("work")
    expect(navGroupOf("bookings")).toBe("business")
    expect(navGroupOf("social/whatever")).toBe("channels")
    expect(navGroupOf("unknown")).toBe("work")
  })

  it("starts a new run whenever the group changes (custom order is kept)", () => {
    const runs = groupNavItems([{ id: "email" }, { id: "tickets" }, { id: "social/messages" }])
    expect(runs.map((r) => [r.group, r.items.map((i) => i.id)])).toEqual([
      ["channels", ["email"]],
      ["work", ["tickets"]],
      ["channels", ["social/messages"]],
    ])
  })
})
