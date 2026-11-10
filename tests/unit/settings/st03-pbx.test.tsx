/**
 * ST-03 Calls & PBX settings: the PBX shell (tabs + gating), the LIST pages
 * (trunks, inbound routes, queues) with their unchanged payloads, the PBX
 * server form (edit no longer wipes the realtime DB fields), the STATS pages
 * and the stats helpers. Clock and timezone independent.
 */
import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { screen, fireEvent, within, waitFor } from "@testing-library/react"
import { renderSt, messages, lookup, flatten, pending } from "./st-helpers"

const state = vi.hoisted(() => ({
  pathname: "/settings/pbx/trunks",
  profile: { is_staff: true, feature_keys: ["ip_calling"] } as Record<string, unknown>,
  user: { is_staff: true } as Record<string, unknown>,
  trunks: [] as unknown[],
  routes: [] as unknown[],
  queues: [] as unknown[],
  servers: [] as unknown[],
  overview: {} as Record<string, unknown>,
  usersStats: { results: [] as unknown[] },
  mut: {} as Record<string, ReturnType<typeof vi.fn>>,
  toast: { error: vi.fn(), success: vi.fn() },
}))

vi.mock("next/navigation", () => ({
  usePathname: () => state.pathname,
  useSearchParams: () => new URLSearchParams("month=2026-04"),
}))
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))
vi.mock("sonner", () => ({ toast: state.toast }))
vi.mock("@/contexts/SubscriptionContext", () => ({ useSubscription: () => ({ hasFeature: () => true }) }))
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: state.user }) }))
vi.mock("@/hooks/useUserProfile", () => ({ useUserProfile: () => ({ data: state.profile }) }))

function mut(name: string) {
  if (!state.mut[name]) state.mut[name] = vi.fn().mockResolvedValue({})
  return { mutateAsync: state.mut[name], isPending: false }
}
vi.mock("@/hooks/usePbxQueries", () => ({
  statsKeys: { all: ["call-stats"] },
  useTrunks: () => ({ data: { results: state.trunks }, isLoading: false }),
  useCreateTrunk: () => mut("createTrunk"),
  useUpdateTrunk: () => mut("updateTrunk"),
  useDeleteTrunk: () => mut("deleteTrunk"),
  useInboundRoutes: () => ({ data: { results: state.routes }, isLoading: false }),
  useCreateInboundRoute: () => mut("createRoute"),
  useUpdateInboundRoute: () => mut("updateRoute"),
  useDeleteInboundRoute: () => mut("deleteRoute"),
  useQueues: () => ({ data: { results: state.queues }, isLoading: false }),
  useCreateQueue: () => mut("createQueue"),
  useUpdateQueue: () => mut("updateQueue"),
  useDeleteQueue: () => mut("deleteQueue"),
  useQueueMembers: () => ({ data: { results: [] }, isLoading: false }),
  usePbxServers: () => ({ data: { results: state.servers }, isLoading: false }),
  useCreatePbxServer: () => mut("createServer"),
  useUpdatePbxServer: () => mut("updateServer"),
  useDeletePbxServer: () => mut("deleteServer"),
  useRegeneratePbxServerToken: () => mut("regenServer"),
  useCallStatsOverview: () => ({ data: state.overview, isLoading: false }),
  useCallStatsUsers: () => ({ data: state.usersStats, isLoading: false }),
  useCallStatsUserTimeline: () => ({ data: { results: [] }, isLoading: false }),
}))
vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: { results: [] }, isLoading: false }),
  useQueryClient: () => ({ getQueriesData: () => [] }),
}))
const trunkDetail = vi.hoisted(() => ({
  id: 1,
  name: "Demo Magti",
  provider: "Magti",
  sip_server: "sip.demo.invalid",
  sip_port: 5060,
  username: "demo-trunk",
  password: "",
  realm: "",
  proxy: "",
  register: true,
  codecs: ["g722", "alaw"],
  caller_id_number: "",
  phone_numbers: ["+995322000111"],
  is_active: true,
}))
vi.mock("@/api/generated/api", () => ({
  trunksRetrieve: vi.fn().mockResolvedValue(trunkDetail),
  queuesRetrieve: vi.fn(),
  tenantGroupsList: vi.fn(),
  phoneAssignmentsList: vi.fn(),
  sipConfigurationsList: vi.fn(),
}))

import PbxLayout from "@/app/(tenant)/settings/pbx/layout"
import TrunksPage from "@/app/(tenant)/settings/pbx/trunks/page"
import InboundRoutesPage from "@/app/(tenant)/settings/pbx/inbound/page"
import QueuesPage from "@/app/(tenant)/settings/pbx/queues/page"
import PbxServerPage from "@/app/(tenant)/settings/pbx/server/page"
import PbxOverviewPage from "@/app/(tenant)/settings/pbx/page"
import PbxStatisticsPage from "@/app/(tenant)/settings/pbx/statistics/page"
import { answerRateOf, formatRate, weekdayName } from "@/app/(tenant)/settings/pbx/_lib/stats"

beforeEach(() => {
  state.pathname = "/settings/pbx/trunks"
  state.profile = { is_staff: true, feature_keys: ["ip_calling"] }
  state.user = { is_staff: true }
  state.trunks = [
    { id: 1, name: "Demo Magti", provider: "Magti", phone_numbers: ["+995322000111"], is_active: true },
    { id: 2, name: "Silknet backup", provider: "silknet", phone_numbers: [], is_active: false },
  ]
  state.routes = [
    { id: 5, did: "+995322421219", destination_type: "queue", destination_queue: 2, destination_queue_slug: "support", priority: 100, is_active: true },
  ]
  state.queues = [
    { id: 7, name: "Support", slug: "support", strategy: "rrmemory", group: 1, group_name: "Agents", member_count: 3, is_active: true, is_default: true },
  ]
  state.servers = []
  state.overview = {}
  state.usersStats = { results: [] }
  for (const k of Object.keys(state.mut)) delete state.mut[k]
  state.toast.error.mockClear()
  state.toast.success.mockClear()
})

describe("stats helpers", () => {
  it("derives the answer rate the backend does not send", () => {
    expect(answerRateOf({ answered_calls: 12, total_calls: 20 })).toBeCloseTo(0.6)
    expect(answerRateOf({ answer_rate: 0.25, answered_calls: 1, total_calls: 2 })).toBe(0.25)
    expect(answerRateOf({ answered_calls: 0, total_calls: 0 })).toBeNull()
    expect(formatRate(0.6)).toBe("60%")
    expect(formatRate(null)).toBe("—")
  })

  it("names weekdays in the UI locale, Monday first", () => {
    expect(weekdayName(0, "en")).toBe("Mon")
    expect(weekdayName(4, "en")).toBe("Fri")
    expect(weekdayName(6, "en")).toBe("Sun")
    expect(weekdayName(4, "ka")).toMatch(/^[Ⴀ-ჿ.]+$/)
    expect(weekdayName(null, "en")).toBe("—")
  })
})

describe("PBX shell", () => {
  it("renders the page header and the link tabs, active one marked", () => {
    renderSt(
      <PbxLayout>
        <div>tab body</div>
      </PbxLayout>
    )
    expect(screen.getByRole("heading", { name: "PBX Management" })).toBeInTheDocument()
    const tabs = screen.getByTestId("pbx-tabs")
    expect(within(tabs).getAllByRole("link")).toHaveLength(7)
    expect(within(tabs).getByRole("link", { name: "Trunks" })).toHaveAttribute("aria-current", "page")
    expect(screen.getByText("tab body")).toBeInTheDocument()
  })

  it("keeps view_reports-only users on statistics (no-access elsewhere)", () => {
    state.user = { is_staff: false }
    state.profile = { is_staff: false, feature_keys: ["ip_calling"], permissions_list: ["view_reports"], all_permissions: ["view_reports"] }
    renderSt(
      <PbxLayout>
        <div>tab body</div>
      </PbxLayout>
    )
    expect(within(screen.getByTestId("pbx-tabs")).getAllByRole("link")).toHaveLength(1)
    expect(screen.getByTestId("pbx-no-access")).toHaveTextContent("No access")
    expect(screen.queryByText("tab body")).not.toBeInTheDocument()
  })
})

describe("trunks LIST page", () => {
  it("lists trunks with translated status badges and the count line (ka)", () => {
    renderSt(<TrunksPage />, "ka")
    const rows = screen.getAllByTestId("pbx-trunks-table-row")
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent("აქტიური")
    expect(rows[1]).toHaveTextContent("არააქტიური")
    expect(screen.getByTestId("pbx-trunks-count")).toHaveTextContent("2 ტრანკი")
    expect(screen.queryByText("Active")).not.toBeInTheDocument()
  })

  it("creates a trunk with the same payload as before", async () => {
    renderSt(<TrunksPage />)
    fireEvent.click(screen.getByTestId("trunk-new"))
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: " New trunk " } })
    fireEvent.change(screen.getByLabelText("SIP server host"), { target: { value: "sip.x.invalid" } })
    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "u1" } })
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "pw" } })
    fireEvent.change(screen.getByPlaceholderText("+995322421219"), { target: { value: "+995322999999" } })
    fireEvent.click(screen.getByRole("button", { name: "Add number" }))
    fireEvent.click(screen.getByTestId("trunk-submit"))
    await waitFor(() => expect(state.mut.createTrunk).toHaveBeenCalledTimes(1))
    expect(state.mut.createTrunk).toHaveBeenCalledWith({
      name: "New trunk",
      provider: undefined,
      sip_server: "sip.x.invalid",
      sip_port: 5060,
      username: "u1",
      password: "pw",
      realm: undefined,
      proxy: undefined,
      register: true,
      codecs: ["g722", "alaw", "ulaw"],
      caller_id_number: undefined,
      phone_numbers: ["+995322999999"],
      is_active: true,
    })
  })

  it("keeps the required-field check (no request)", () => {
    renderSt(<TrunksPage />)
    fireEvent.click(screen.getByTestId("trunk-new"))
    fireEvent.click(screen.getByTestId("trunk-submit"))
    expect(state.mut.createTrunk).not.toHaveBeenCalled()
    expect(state.toast.error).toHaveBeenCalled()
  })

  it("row click opens the edit dialog with the loaded trunk", async () => {
    renderSt(<TrunksPage />)
    fireEvent.click(screen.getAllByTestId("pbx-trunks-table-row")[0])
    expect(await screen.findByRole("heading", { name: "Edit trunk" })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByLabelText("SIP server host")).toHaveValue("sip.demo.invalid"))
    fireEvent.click(screen.getByTestId("trunk-submit"))
    await waitFor(() => expect(state.mut.updateTrunk).toHaveBeenCalledWith(expect.objectContaining({ id: 1 })))
  })

  it("deletes through the same confirmation", async () => {
    renderSt(<TrunksPage />)
    fireEvent.click(screen.getAllByTestId("trunk-delete")[1])
    const dlg = await screen.findByRole("alertdialog")
    expect(dlg).toHaveTextContent('Delete trunk "Silknet backup"?')
    fireEvent.click(within(dlg).getByRole("button", { name: "Delete" }))
    await waitFor(() => expect(state.mut.deleteTrunk).toHaveBeenCalledWith(2))
  })
})

describe("inbound routes LIST page", () => {
  it("shows the translated destination and refuses a missing DID with a real message", () => {
    renderSt(<InboundRoutesPage />)
    const row = screen.getByTestId("pbx-inbound-table-row")
    expect(row).toHaveTextContent("+995322421219")
    expect(row).toHaveTextContent("Queue")
    expect(row).toHaveTextContent("support")
    fireEvent.click(screen.getByTestId("route-new"))
    fireEvent.click(screen.getByTestId("pbx-dialog-submit"))
    expect(state.toast.error).toHaveBeenCalledWith("Enter the DID or pattern.")
    expect(state.mut.createRoute).not.toHaveBeenCalled()
  })

  it("edits a route with the old payload shape", async () => {
    renderSt(<InboundRoutesPage />)
    fireEvent.click(screen.getByTestId("pbx-inbound-table-row"))
    fireEvent.change(screen.getByLabelText("Priority"), { target: { value: "7" } })
    fireEvent.click(screen.getByTestId("pbx-dialog-submit"))
    await waitFor(() =>
      expect(state.mut.updateRoute).toHaveBeenCalledWith({
        id: 5,
        data: {
          did: "+995322421219",
          trunk: undefined,
          destination_type: "queue",
          destination_queue: 2,
          destination_extension: undefined,
          ivr_custom_context: undefined,
          working_hours_override: undefined,
          priority: 7,
          is_active: true,
        },
      })
    )
  })
})

describe("queues LIST page", () => {
  it("shows strategy, group, members, default badge and opens the members dialog", async () => {
    renderSt(<QueuesPage />)
    const row = screen.getByTestId("pbx-queues-table-row")
    expect(row).toHaveTextContent("Round robin (memory)")
    expect(row).toHaveTextContent("Agents")
    expect(row).toHaveTextContent("Default")
    fireEvent.click(screen.getByTestId("queue-members"))
    expect(await screen.findByText(/Queue agents — Support/)).toBeInTheDocument()
  })

  it("requires a backing group before creating", () => {
    renderSt(<QueuesPage />)
    fireEvent.click(screen.getByTestId("queue-new"))
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Sales" } })
    fireEvent.click(screen.getByTestId("pbx-dialog-submit"))
    expect(state.mut.createQueue).not.toHaveBeenCalled()
    expect(state.toast.error).toHaveBeenCalled()
  })
})

describe("PBX server FORM page", () => {
  const server = {
    id: 3,
    name: "Main PBX",
    fqdn: "pbx.example.invalid",
    public_ip: "192.0.2.1",
    realtime_db_host: "db.internal",
    realtime_db_name: "asterisk_demo",
    realtime_db_user: "asterisk_rw_demo",
    ami_port: 5038,
    use_tenant_prefix: false,
    status: "pending",
    asterisk_version: "",
    last_seen_at: null,
    install_command: "curl -sSL http://example.invalid/api/pbx/install/x/ | sudo bash",
  }

  it("registers with the old create payload", async () => {
    renderSt(<PbxServerPage />)
    fireEvent.click(screen.getByTestId("pbx-server-register"))
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "PBX" } })
    fireEvent.change(screen.getByLabelText("FQDN"), { target: { value: "pbx.x.invalid" } })
    fireEvent.click(screen.getByTestId("pbx-server-submit"))
    await waitFor(() =>
      expect(state.mut.createServer).toHaveBeenCalledWith({
        name: "PBX",
        fqdn: "pbx.x.invalid",
        public_ip: undefined,
        realtime_db_host: "",
        realtime_db_name: "",
        realtime_db_user: "",
        ami_port: 5038,
        use_tenant_prefix: false,
      })
    )
  })

  it("an edit no longer blanks the realtime DB settings", async () => {
    state.servers = [server]
    renderSt(<PbxServerPage />)
    expect(screen.getByTestId("pbx-server-install")).toHaveTextContent("curl -sSL")
    fireEvent.click(screen.getByTestId("pbx-server-edit"))
    fireEvent.click(screen.getByTestId("pbx-server-submit"))
    await waitFor(() => expect(state.mut.updateServer).toHaveBeenCalledTimes(1))
    const { data } = state.mut.updateServer.mock.calls[0][0]
    expect(data).not.toHaveProperty("realtime_db_host")
    expect(data).not.toHaveProperty("realtime_db_name")
    expect(data).not.toHaveProperty("realtime_db_user")
    expect(data).toMatchObject({ name: "Main PBX", fqdn: "pbx.example.invalid", public_ip: "192.0.2.1", ami_port: 5038 })
  })

  it("deletes from the danger zone through the existing confirmation", async () => {
    state.servers = [server]
    renderSt(<PbxServerPage />)
    fireEvent.click(within(screen.getByTestId("settings-danger-zone")).getByRole("button"))
    const dlg = await screen.findByRole("alertdialog")
    expect(dlg).toHaveTextContent("Main PBX (pbx.example.invalid)")
    fireEvent.click(within(dlg).getByRole("button", { name: "Delete" }))
    await waitFor(() => expect(state.mut.deleteServer).toHaveBeenCalledWith(3))
  })
})

describe("PBX STATS pages", () => {
  it("overview shows the derived answer rate and the busiest day in Georgian", () => {
    state.overview = { total_calls: 20, answered_calls: 12, missed_calls: 5, busiest_weekday: 4, top_5_users: [{ user_id: 3, user_name: "Luka", total_talk_seconds: 530, answered_count: 2 }] }
    renderSt(<PbxOverviewPage />, "ka")
    expect(screen.getByText("60%")).toBeInTheDocument()
    expect(screen.getByTestId("pbx-busiest-day").textContent).not.toMatch(/Fri/)
    expect(screen.getByText("Luka")).toBeInTheDocument()
  })

  it("statistics keeps the agent links with the month", () => {
    state.usersStats = { results: [{ user_id: 9, user_name: "Ana", answered_count: 1, total_talk_seconds: 60, avg_talk_seconds: 60 }] }
    renderSt(<PbxStatisticsPage />)
    expect(screen.getByRole("link", { name: "Ana" }).getAttribute("href")).toMatch(/^\/settings\/pbx\/statistics\/users\/9\?month=\d{4}-\d{2}$/)
  })
})

describe("st-03 catalog", () => {
  it("has every new key in en and ka, with no Latin words in Georgian besides product acronyms", () => {
    const p = pending["st-03"]
    expect(p).toBeTruthy()
    const en = flatten(p.en)
    const ka = flatten(p.ka)
    expect(Object.keys(ka).sort()).toEqual(Object.keys(en).sort())
    const allowed = /\b(SIP|DID|PBX|ICU|count|number|extension|name|day|from|to|plural|one|other)\b/g
    for (const [k, v] of Object.entries(ka)) {
      const stripped = v.replace(/\{[^}]*\}/g, "").replace(allowed, "")
      expect(stripped, k).not.toMatch(/[A-Za-z]{2,}/)
    }
    expect(lookup(messages.ka, "pbxSettings.status.active")).toBe("აქტიური")
  })
})
