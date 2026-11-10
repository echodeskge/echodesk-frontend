/**
 * ST-02 Social connections as the design CONNECTIONS page: channel list in
 * place of the tabs, channel components mount only when opened, the same
 * connect / disconnect handlers and the always-visible Facebook Login.
 */
import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { screen, fireEvent, within } from "@testing-library/react"
import { renderSt } from "./st-helpers"

const fb = { connected: true, pages_count: 1, pages: [] }
const connect = vi.fn().mockResolvedValue({})
const disconnect = vi.fn().mockResolvedValue({})
const push = vi.fn()

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock("@/components/WhatsAppConnection", () => ({ WhatsAppConnection: () => <div data-testid="wa-mock" /> }))
vi.mock("@/components/EmailConnection", () => ({ EmailConnection: () => <div data-testid="email-mock" /> }))
vi.mock("@/components/TikTokConnection", () => ({ TikTokConnection: () => <div data-testid="tiktok-mock" /> }))
vi.mock("@/components/WidgetConnection", () => ({ WidgetConnection: () => <div data-testid="widget-mock" /> }))
vi.mock("@/components/TelegramConnection", () => ({ TelegramConnection: () => <div data-testid="tg-mock" />, TelegramIcon: () => <svg /> }))
vi.mock("@/hooks/api", () => {
  const q = (data: unknown) => () => ({ data, isLoading: false, refetch: vi.fn() })
  return {
    useFacebookStatus: () => ({ data: fb, isLoading: false, refetch: vi.fn() }),
    useFacebookPages: q({ count: 2, results: [
      { id: 1, page_id: "p1", page_name: "Shop", is_active: true, created_at: "2026-11-01T10:00:00Z" },
      { id: 2, page_id: "p2", page_name: "Old page", is_active: false, created_at: "2026-10-01T10:00:00Z" },
    ] }),
    useFacebookMessages: q({ count: 12, results: [] }),
    useConnectFacebook: () => ({ mutateAsync: connect, isPending: false }),
    useDisconnectFacebook: () => ({ mutateAsync: disconnect, isPending: false }),
    useInstagramStatus: q({ connected: false, accounts_count: 0, accounts: [] }),
    useInstagramAccounts: q({ results: [] }),
    useInstagramMessages: q({ count: 0 }),
    useDisconnectInstagram: () => ({ mutateAsync: vi.fn(), isPending: false }),
    useRecheckInstagramMessaging: () => ({ mutate: vi.fn(), isPending: false }),
  }
})

import SocialIntegrations from "@/components/SocialIntegrations"

beforeEach(() => {
  connect.mockClear()
  disconnect.mockClear()
  push.mockClear()
})

describe("Settings > Social connections (ST-02)", () => {
  it("lists the seven channels and opens Facebook first", () => {
    renderSt(<SocialIntegrations />)
    const list = screen.getByTestId("channel-list")
    expect(within(list).getAllByRole("button").map((b) => b.querySelector("span.flex-col > span")?.textContent)).toEqual([
      "Facebook", "Instagram", "WhatsApp", "Email", "Website widget", "TikTok", "Telegram",
    ])
    expect(screen.getByTestId("facebook-detail")).toBeInTheDocument()
    expect(screen.queryByTestId("wa-mock")).toBeNull()
  })

  it("mounts a channel component only when it is opened", () => {
    renderSt(<SocialIntegrations />)
    fireEvent.click(screen.getByTestId("channel-whatsapp"))
    expect(screen.getByTestId("wa-mock")).toBeInTheDocument()
    expect(screen.queryByTestId("facebook-detail")).toBeNull()
    fireEvent.click(screen.getByTestId("channel-email"))
    expect(screen.getByTestId("email-mock")).toBeInTheDocument()
    expect(screen.queryByTestId("wa-mock")).toBeNull()
  })

  it("renders Connect Facebook Pages as the official Facebook Login button", () => {
    renderSt(<SocialIntegrations />)
    const btn = screen.getByTestId("facebook-connect")
    expect(btn.className).toContain("bg-[#1877F2]")
    expect(btn.className).toContain("text-white")
    expect(btn.querySelector('[data-testid="facebook-logo"]')).not.toBeNull()
  })

  it("keeps the Facebook Login button visible when connected and calls the same handlers", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true)
    renderSt(<SocialIntegrations />)
    fireEvent.click(screen.getByTestId("facebook-connect"))
    expect(connect).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByTestId("facebook-disconnect"))
    expect(window.confirm).toHaveBeenCalled()
    await vi.waitFor(() => expect(disconnect).toHaveBeenCalledTimes(1))
  })

  it("shows View messages, the page rows, remove only for inactive pages and the human-agent note", () => {
    renderSt(<SocialIntegrations />)
    fireEvent.click(screen.getByTestId("channel-inbox-link"))
    expect(push).toHaveBeenCalledWith("/social/messages")
    const rows = screen.getAllByTestId("facebook-page-row")
    expect(rows).toHaveLength(2)
    expect(within(rows[0]).queryByTestId("facebook-remove-page")).toBeNull()
    fireEvent.click(within(rows[1]).getByTestId("facebook-remove-page"))
    expect(screen.getByRole("alertdialog")).toBeInTheDocument()
    expect(screen.getByTestId("human-agent-note")).toBeInTheDocument()
  })

  it("Georgian channel labels", () => {
    renderSt(<SocialIntegrations />, "ka")
    expect(screen.getByTestId("channel-email")).toHaveTextContent("ელფოსტა")
    expect(screen.getByTestId("channel-widget")).toHaveTextContent("საიტის ვიჯეტი")
  })
})
