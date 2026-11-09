import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, within, fireEvent } from "@testing-library/react"
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
const nav = vi.hoisted(() => ({ pathname: "/email", search: "" }))
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => nav.pathname,
  useSearchParams: () => new URLSearchParams(nav.search),
}))

const boardsState = vi.hoisted(() => ({
  boards: [
    { id: 1, name: "Support", color: "#3b82f6", position: 0, is_default: true, open_count: 7, columns_count: 4 },
    { id: 2, name: "Sales", color: "#f59e0b", position: 1, is_default: false, open_count: 4, columns_count: 3 },
  ],
  counts: { mine: 3, unassigned: 1, urgent: 2, due_this_week: 5 },
  viewCountsArgs: [] as unknown[][],
}))
vi.mock("@/app/(tenant)/tickets/_hooks/use-boards-lite", () => ({
  useBoardsLite: () => ({ data: boardsState.boards }),
  useViewCounts: (...args: unknown[]) => {
    boardsState.viewCountsArgs.push(args)
    return { data: boardsState.counts }
  },
}))

const flagsState = vi.hoisted(() => ({ flags: { listViewEnabled: false, detailRedesignEnabled: false } }))
vi.mock("@/app/(tenant)/tickets/_lib/flags", () => flagsState)

const admin = vi.hoisted(() => ({ openCreateBoard: vi.fn(), canCreateBoard: true }))
vi.mock("@/components/tickets-admin/board-admin-host", () => ({
  useBoardAdmin: () => ({
    openCreateBoard: admin.openCreateBoard,
    openEditColumns: vi.fn(),
    openManageUsers: vi.fn(),
    openBoardSettings: vi.fn(),
    gates: { canCreateBoard: admin.canCreateBoard, canEditColumns: false, canManageUsers: false, canOpenSettings: false },
  }),
}))

const boardCtx = vi.hoisted(() => ({ selectedBoardId: null as number | null, setSelectedBoardId: vi.fn() }))
vi.mock("@/contexts/BoardContext", () => ({ useBoard: () => boardCtx }))
vi.mock("@/contexts/ThemeContext", () => ({ useTheme: () => ({ mode: "system", setMode: vi.fn() }) }))
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }))
vi.mock("@/hooks/api/useSocial", () => ({
  useUnreadMessagesCount: () => ({ data: { email: 7, facebook: 2, instagram: 1, whatsapp: 1 } }),
}))
vi.mock("sonner", () => ({ toast: { info: vi.fn() } }))

import { AppSidebar, groupNavItems, navGroupOf, filtersEqual, viewHref, SIDEBAR_VIEWS } from "@/components/AppSidebar"
import { EMPTY_FILTERS } from "@/app/(tenant)/tickets/_hooks/use-ticket-filters"
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

function renderSidebar(open = true, currentView = "email") {
  return render(
    <SidebarProvider defaultOpen={open}>
      <AppSidebar
        tenant={{ name: "EchoDesk Demo", domain: "demo.echodesk.ge" } as never}
        userProfile={{ first_name: "Nino", last_name: "Beridze", email: "nino@echodesk.ge" } as never}
        visibleMenuItems={items}
        currentView={currentView}
        onMenuClick={vi.fn()}
        onLogout={vi.fn()}
      />
    </SidebarProvider>
  )
}

beforeEach(() => {
  localStorage.clear()
  nav.pathname = "/email"
  nav.search = ""
  flagsState.flags.listViewEnabled = false
  admin.canCreateBoard = true
  admin.openCreateBoard.mockClear()
  boardCtx.selectedBoardId = null
  boardCtx.setSelectedBoardId.mockClear()
  boardsState.viewCountsArgs.length = 0
})

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

describe("AppSidebar boards and views (FE-03)", () => {
  function openOnTickets(search = "") {
    nav.pathname = "/tickets"
    nav.search = search
    return renderSidebar(true, "tickets")
  }

  it("the Boards item has a trailing chevron that toggles the nested board rows", () => {
    openOnTickets()
    const toggle = screen.getByTestId("sidebar-boards-toggle")
    expect(toggle).toHaveAttribute("aria-expanded", "true")
    const list = screen.getByTestId("sidebar-boards")
    expect(list.className).toContain("pl-[9px]")
    expect(list.className).toContain("border-l")
    const row = screen.getByTestId("sidebar-board-1")
    expect(within(row).getByText("Support")).toBeInTheDocument()
    expect(within(row).getByText("7")).toBeInTheDocument()
    expect(row.querySelector('[data-slot="color-dot"]')).toHaveStyle({ background: "#3b82f6" })
    expect(row).toHaveAttribute("href", "/tickets?board=1")
    expect(row.className).toContain("h-7")

    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByTestId("sidebar-boards")).toBeNull()
    expect(localStorage.getItem("echodesk_sidebar_boards_open")).toBe("0")

    fireEvent.click(toggle)
    expect(screen.getByTestId("sidebar-board-2")).toBeInTheDocument()
  })

  it("starts collapsed away from /tickets and remembers the user's choice", () => {
    const { unmount } = renderSidebar(true, "email")
    expect(screen.queryByTestId("sidebar-boards")).toBeNull()
    fireEvent.click(screen.getByTestId("sidebar-boards-toggle"))
    expect(screen.getByTestId("sidebar-boards")).toBeInTheDocument()
    unmount()
    renderSidebar(true, "email")
    expect(screen.getByTestId("sidebar-boards")).toBeInTheDocument()
  })

  it("the Boards label still links to /tickets and stays active there", () => {
    openOnTickets()
    const link = screen.getByText("Boards").closest("a")!
    expect(link).toHaveAttribute("href", "/tickets")
    expect(link.closest("[data-active=true]")).not.toBeNull()
  })

  it("highlights the active board from ?board", () => {
    openOnTickets("board=2")
    expect(screen.getByTestId("sidebar-board-2")).toHaveAttribute("data-active", "true")
    expect(screen.getByTestId("sidebar-board-2")).toHaveAttribute("aria-current", "page")
    expect(screen.getByTestId("sidebar-board-1")).toHaveAttribute("data-active", "false")
  })

  it("falls back to the context board on /tickets without ?board, and highlights nothing elsewhere", () => {
    boardCtx.selectedBoardId = 1
    const { unmount } = openOnTickets()
    expect(screen.getByTestId("sidebar-board-1")).toHaveAttribute("data-active", "true")
    unmount()
    localStorage.setItem("echodesk_sidebar_boards_open", "1")
    nav.pathname = "/email"
    renderSidebar(true, "email")
    expect(screen.getByTestId("sidebar-board-1")).toHaveAttribute("data-active", "false")
  })

  it("selecting a board updates the board context", () => {
    openOnTickets()
    fireEvent.click(screen.getByTestId("sidebar-board-2"))
    expect(boardCtx.setSelectedBoardId).toHaveBeenCalledWith(2)
  })

  it("keeps the list view when switching boards from the list", () => {
    openOnTickets("board=1&view=list")
    expect(screen.getByTestId("sidebar-board-2")).toHaveAttribute("href", "/tickets?board=2&view=list")
  })

  it("+ New board calls useBoardAdmin().openCreateBoard", () => {
    openOnTickets()
    fireEvent.click(screen.getByTestId("sidebar-new-board"))
    expect(admin.openCreateBoard).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId("sidebar-new-board")).toHaveTextContent("newBoard")
  })

  it("hides + New board without permission", () => {
    admin.canCreateBoard = false
    openOnTickets()
    expect(screen.queryByTestId("sidebar-new-board")).toBeNull()
  })

  it("hides the Views section while flags.listViewEnabled is false", () => {
    openOnTickets("board=2")
    expect(screen.queryByTestId("sidebar-views")).toBeNull()
    expect(boardsState.viewCountsArgs.at(-1)?.[1]).toEqual({ enabled: false })
  })

  it("renders the Views with list-view links and view_counts for the current board", () => {
    flagsState.flags.listViewEnabled = true
    openOnTickets("board=2")
    const views = screen.getByTestId("sidebar-views")
    expect(within(views).getByText("title")).toBeInTheDocument()
    expect(screen.getByTestId("sidebar-view-mine")).toHaveAttribute("href", "/tickets?board=2&view=list&assignee=me")
    expect(screen.getByTestId("sidebar-view-unassigned")).toHaveAttribute("href", "/tickets?board=2&view=list&unassigned=1")
    expect(screen.getByTestId("sidebar-view-urgent")).toHaveAttribute(
      "href",
      "/tickets?board=2&view=list&priority=critical%2Chigh",
    )
    expect(screen.getByTestId("sidebar-view-dueThisWeek")).toHaveAttribute("href", "/tickets?board=2&view=list&due=week")
    expect(within(screen.getByTestId("sidebar-view-mine")).getByText("3")).toBeInTheDocument()
    expect(within(screen.getByTestId("sidebar-view-dueThisWeek")).getByText("5")).toBeInTheDocument()
    expect(screen.getByTestId("sidebar-view-mine").className).toContain("h-[30px]")
    expect(boardsState.viewCountsArgs.at(-1)).toEqual([2, { enabled: true }])
  })

  it("view counts use the default board away from /tickets", () => {
    flagsState.flags.listViewEnabled = true
    localStorage.setItem("echodesk_sidebar_boards_open", "1")
    renderSidebar(true, "email")
    expect(boardsState.viewCountsArgs.at(-1)?.[0]).toBe(1)
    expect(screen.getByTestId("sidebar-view-mine")).toHaveAttribute("href", "/tickets?board=1&view=list&assignee=me")
  })

  it("a view row is active when the URL filters equal its filter set (DC7)", () => {
    flagsState.flags.listViewEnabled = true
    const { unmount } = openOnTickets("board=2&view=list&priority=high,critical")
    expect(screen.getByTestId("sidebar-view-urgent")).toHaveAttribute("data-active", "true")
    expect(screen.getByTestId("sidebar-view-mine")).toHaveAttribute("data-active", "false")
    unmount()
    // An extra filter means it no longer equals the view's set.
    openOnTickets("board=2&view=list&priority=high,critical&assignee=me")
    for (const v of SIDEBAR_VIEWS) {
      expect(screen.getByTestId(`sidebar-view-${v.key}`)).toHaveAttribute("data-active", "false")
    }
  })

  it("no view is active on the detail page", () => {
    flagsState.flags.listViewEnabled = true
    nav.pathname = "/tickets/5"
    nav.search = "assignee=me"
    renderSidebar(true, "tickets")
    expect(screen.getByTestId("sidebar-view-mine")).toHaveAttribute("data-active", "false")
  })

  it("collapsed mode hides the nested list", () => {
    nav.pathname = "/tickets"
    renderSidebar(false, "tickets")
    expect(screen.queryByTestId("sidebar-boards")).toBeNull()
    expect(screen.queryByTestId("sidebar-board-1")).toBeNull()
  })
})

describe("saved view helpers", () => {
  it("compares filter sets ignoring list order", () => {
    expect(filtersEqual({ ...EMPTY_FILTERS, priority: ["high", "critical"] }, { ...EMPTY_FILTERS, priority: ["critical", "high"] })).toBe(true)
    expect(filtersEqual({ ...EMPTY_FILTERS, priority: ["high"] }, { ...EMPTY_FILTERS, priority: ["critical", "high"] })).toBe(false)
    expect(filtersEqual({ ...EMPTY_FILTERS, q: "x" }, EMPTY_FILTERS)).toBe(false)
    expect(filtersEqual({ ...EMPTY_FILTERS, due: "week" }, { ...EMPTY_FILTERS, due: "week" })).toBe(true)
  })

  it("builds list-view hrefs, with or without a board", () => {
    expect(viewHref(4, { ...EMPTY_FILTERS, assignee: ["me"] })).toBe("/tickets?board=4&view=list&assignee=me")
    expect(viewHref(null, { ...EMPTY_FILTERS, unassigned: true })).toBe("/tickets?view=list&unassigned=1")
  })
})
