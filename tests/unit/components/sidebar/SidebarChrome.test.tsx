import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { Ticket, Settings } from "lucide-react"

const push = vi.fn()
Element.prototype.scrollIntoView = vi.fn()
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }))
vi.mock("@/contexts/ThemeContext", () => ({ useTheme: () => ({ mode: "system", setMode: vi.fn() }) }))

import { flattenSearchEntries, SidebarSearch, SidebarWorkspaceHeader } from "@/components/sidebar/SidebarChrome"
import type { MenuItem } from "@/services/permissionService"

const icons: Record<string, typeof Ticket> = { Ticket, Settings }
const iconFor = (i: string) => icons[i]
const items = [
  { id: "tickets", label: "Tickets", icon: "Ticket" },
  { id: "settings", label: "Settings", icon: "Settings", children: [
    { id: "settings/general", label: "General", icon: "Settings" },
    { id: "settings/locked", label: "Locked", icon: "Settings", isLocked: true },
  ] },
  { id: "report-bug", label: "Report a bug", icon: "Bug" },
  { id: "premium", label: "Premium", icon: "Ticket", isLocked: true },
] as unknown as MenuItem[]

describe("flattenSearchEntries", () => {
  it("flattens children and skips locked items", () => {
    const ids = flattenSearchEntries(items, iconFor).map((e) => e.id)
    expect(ids).toEqual(["tickets", "settings/general", "report-bug"])
  })
})

describe("SidebarSearch", () => {
  it("opens with Cmd+K and navigates or runs actions", () => {
    const onAction = vi.fn()
    render(<SidebarSearch items={items} iconFor={iconFor} onAction={onAction} actionIds={new Set(["report-bug"])} />)
    fireEvent.keyDown(window, { key: "k", metaKey: true })
    fireEvent.click(screen.getByText("General"))
    expect(push).toHaveBeenCalledWith("/settings/general")

    fireEvent.keyDown(window, { key: "k", ctrlKey: true })
    fireEvent.click(screen.getByText("Report a bug"))
    expect(onAction).toHaveBeenCalledWith("report-bug")
  })
})

describe("SidebarWorkspaceHeader", () => {
  it("shows initials when there is no logo", () => {
    render(<SidebarWorkspaceHeader name="Amanati Shop" domain="amanati.echodesk.ge" />)
    expect(screen.getByText("AS")).toBeTruthy()
    expect(screen.getByText("amanati.echodesk.ge")).toBeTruthy()
  })
})
