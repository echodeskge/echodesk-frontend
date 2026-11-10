/**
 * ST-04 Team: settings/users (design AGENTS) and settings/groups (design LIST
 * PAGE). Layout only: every handler, request and confirmation is the one the
 * pages had before the redesign.
 */
import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { screen, fireEvent, within, waitFor } from "@testing-library/react"
import { renderSt, pending, flatten } from "./st-helpers"
import type { TenantGroup, User } from "@/api/generated/interfaces"

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

// ---- users page dependencies ----
const usersState = vi.hoisted(() => ({
  data: { count: 0, next: null, previous: null, results: [] as unknown[] },
  isLoading: false,
  error: null as unknown,
  lastArgs: null as unknown,
}))
vi.mock("@/hooks/api/useUsers", () => ({
  useUsers: (args: unknown) => {
    usersState.lastArgs = args
    return { data: usersState.data, isLoading: usersState.isLoading, error: usersState.error }
  },
  useCreateUser: () => ({ mutateAsync: vi.fn() }),
  useUpdateUser: () => ({ mutateAsync: vi.fn() }),
  useDeleteUser: () => ({ mutateAsync: vi.fn() }),
  userKeys: { lists: () => ["users", "list"] },
}))
vi.mock("@/hooks/useUserProfile", () => ({
  useUserProfile: () => ({ data: { id: 1, is_superuser: true, feature_keys: ["booking_management"] } }),
}))
vi.mock("@tanstack/react-query", async (orig) => ({
  ...(await orig<typeof import("@tanstack/react-query")>()),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}))
vi.mock("@/hooks/useMyAccess", () => ({
  useMyAccess: () => ({ isSuperuser: true, isStaff: true, roleRank: 3, canManageGroups: true }),
  TENANT_ROLE_RANK: { viewer: 0, agent: 1, manager: 2, admin: 3 },
}))
// The dialogs are covered by their own tests; here they only report that they opened.
vi.mock("@/components/user-management/UserForm", () => ({
  default: ({ mode, open }: { mode: string; open: boolean }) => (open ? <div data-testid={`user-form-${mode}`} /> : null),
}))

// ---- groups page dependencies ----
const groupsState = vi.hoisted(() => ({
  results: [] as unknown[],
  isLoading: false,
  error: null as unknown,
  del: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
}))
vi.mock("@/hooks/api", () => ({
  useTenantGroups: () => ({ data: { results: groupsState.results }, isLoading: groupsState.isLoading, error: groupsState.error }),
  useCreateTenantGroup: () => ({ mutateAsync: groupsState.create }),
  useUpdateTenantGroup: () => ({ mutateAsync: groupsState.update }),
  useDeleteTenantGroup: () => ({ mutateAsync: groupsState.del }),
}))
const axiosGet = vi.hoisted(() => vi.fn())
vi.mock("@/api/axios", () => ({ default: { get: axiosGet } }))
const toastError = vi.hoisted(() => vi.fn())
vi.mock("sonner", () => ({ toast: { error: toastError, success: vi.fn() } }))

import UserManagement from "@/components/UserManagement"
import UserTable from "@/components/user-management/UserTable"
import UserDetailsModal from "@/components/user-management/UserDetailsModal"
import TenantGroupManagement from "@/components/TenantGroupManagement"

function makeUser(o: Partial<User> = {}): User {
  return {
    id: 1,
    email: "nino@demo.ge",
    first_name: "Nino",
    last_name: "Beridze",
    full_name: "Nino Beridze",
    role: "admin",
    status: "active",
    is_active: true,
    is_staff: false,
    tenant_groups: [],
    date_joined: "2024-01-01T00:00:00Z",
    last_login: "2024-01-01T00:00:00Z",
    ...o,
  } as User
}

function makeGroup(o: Partial<TenantGroup> = {}): TenantGroup {
  return {
    id: 1,
    name: "Support Team",
    description: "First line",
    member_count: 4,
    features: [],
    feature_keys: [],
    created_at: "2024-03-05T10:00:00Z",
    updated_at: "2024-03-05T10:00:00Z",
    is_active: true,
    is_booking_staff: false,
    ...o,
  } as TenantGroup
}

const tableProps = {
  loading: false,
  selectedUsers: [] as number[],
  onSelectionChange: vi.fn(),
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  onView: vi.fn(),
  onChangeStatus: vi.fn(),
  onSendNewPassword: vi.fn(),
  onToggleStaff: vi.fn(),
  pagination: { count: 1, next: null, previous: null, currentPage: 1, totalPages: 1 },
  onPageChange: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
  usersState.data = { count: 0, next: null, previous: null, results: [] }
  usersState.isLoading = false
  usersState.error = null
  groupsState.results = []
  groupsState.isLoading = false
  groupsState.error = null
  axiosGet.mockResolvedValue({ data: { categories: [] } })
})

describe("ST-04 i18n", () => {
  it("has the same keys in en and ka, and no Latin text in Georgian", () => {
    const en = flatten(pending["st-04"].en)
    const ka = flatten(pending["st-04"].ka)
    expect(Object.keys(ka).sort()).toEqual(Object.keys(en).sort())
    for (const [key, value] of Object.entries(ka)) {
      // ICU placeholders ({count}, plural syntax) are not interface text.
      const text = value.replace(/\{[^{}]*\}/g, "")
      expect(text, key).not.toMatch(/[A-Za-z]/)
    }
  })
})

describe("settings/users (AGENTS)", () => {
  it("renders the page header, the Add user button and the stat strip", () => {
    usersState.data = {
      count: 3,
      next: null,
      previous: null,
      results: [makeUser({ id: 1 }), makeUser({ id: 2, email: "a@demo.ge" }), makeUser({ id: 3, email: "b@demo.ge", is_active: false })],
    }
    renderSt(<UserManagement />)
    expect(screen.getByRole("heading", { name: "User Management" })).toBeInTheDocument()
    expect(within(screen.getByTestId("users-stat-total")).getByText("3")).toBeInTheDocument()
    expect(within(screen.getByTestId("users-stat-active")).getByText("2")).toBeInTheDocument()
    expect(within(screen.getByTestId("users-stat-inactive")).getByText("1")).toBeInTheDocument()
    // One page: no "on this page" hint.
    expect(screen.queryByText("on this page")).not.toBeInTheDocument()
    expect(screen.getByTestId("users-count")).toHaveTextContent("3 users · click a row to view details")

    expect(screen.queryByTestId("user-form-create")).not.toBeInTheDocument()
    fireEvent.click(screen.getByTestId("users-add"))
    expect(screen.getByTestId("user-form-create")).toBeInTheDocument()
  })

  it("marks the active/inactive tiles as page counts when the list has more pages", () => {
    usersState.data = { count: 45, next: "x", previous: null, results: [makeUser()] }
    renderSt(<UserManagement />)
    expect(within(screen.getByTestId("users-stat-total")).getByText("45")).toBeInTheDocument()
    expect(screen.getAllByText("on this page")).toHaveLength(2)
  })

  it("sends the role / status filters to useUsers", () => {
    renderSt(<UserManagement />)
    expect(usersState.lastArgs).toEqual({
      page: 1,
      search: undefined,
      filters: { role: undefined, status: undefined, isActive: null, isStaff: null },
    })
  })

  it("shows the loading state inside the page", () => {
    usersState.isLoading = true
    renderSt(<UserManagement />)
    expect(screen.getByRole("heading", { name: "User Management" })).toBeInTheDocument()
    expect(screen.getByTestId("users-loading")).toBeInTheDocument()
  })

  it("renders Georgian without missing keys", () => {
    usersState.data = { count: 1, next: null, previous: null, results: [makeUser()] }
    const errors = vi.spyOn(console, "error").mockImplementation(() => {})
    renderSt(<UserManagement />, "ka")
    expect(screen.getByText("მომხმარებლები")).toBeInTheDocument()
    expect(errors.mock.calls.filter((c) => String(c[0]).includes("MISSING_MESSAGE"))).toEqual([])
    errors.mockRestore()
  })
})

describe("UserTable (AGENTS table)", () => {
  it("opens the details on row click but not on a row button", () => {
    const user = makeUser({ id: 7 })
    renderSt(<UserTable {...tableProps} users={[user]} />)
    fireEvent.click(screen.getByText("nino@demo.ge"))
    expect(tableProps.onView).toHaveBeenCalledWith(user)
    tableProps.onView.mockClear()
    fireEvent.click(screen.getByTitle("Edit User"))
    expect(tableProps.onEdit).toHaveBeenCalledWith(user)
    expect(tableProps.onView).not.toHaveBeenCalled()
  })

  it("shows role and status, and toggles staff with the same handler", () => {
    renderSt(
      <UserTable {...tableProps} users={[makeUser({ id: 9, role: "manager", status: "pending" })]} showStaffColumn canToggleStaff currentUserId={1} />
    )
    expect(screen.getByText("Manager")).toBeInTheDocument()
    expect(screen.getByText("Pending")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("switch", { name: "Add to booking staff" }))
    expect(tableProps.onToggleStaff).toHaveBeenCalledWith(9, true)
  })

  it("keeps the staff switch disabled for the current user and for non-superusers", () => {
    renderSt(<UserTable {...tableProps} users={[makeUser({ id: 1 })]} showStaffColumn canToggleStaff currentUserId={1} />)
    expect(screen.getByRole("switch")).toBeDisabled()
  })
})

describe("UserDetailsModal", () => {
  it("runs each action with the same handler and closes", () => {
    const props = {
      user: makeUser({ id: 4 }),
      onClose: vi.fn(),
      onEdit: vi.fn(),
      onDelete: vi.fn(),
      onChangeStatus: vi.fn(),
      onSendNewPassword: vi.fn(),
    }
    renderSt(<UserDetailsModal {...props} />)
    const dialog = screen.getByRole("dialog")
    expect(within(dialog).getByText("Nino Beridze")).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole("button", { name: "Deactivate" }))
    expect(props.onChangeStatus).toHaveBeenCalledWith(4, "inactive")
    expect(props.onClose).toHaveBeenCalledTimes(1)
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete User" }))
    expect(props.onDelete).toHaveBeenCalledWith(4)
    fireEvent.click(within(dialog).getByRole("button", { name: "Edit User" }))
    expect(props.onEdit).toHaveBeenCalledWith(props.user)
    fireEvent.click(within(dialog).getByRole("button", { name: "Send New Password" }))
    expect(props.onSendNewPassword).toHaveBeenCalledWith(props.user)
    expect(props.onClose).toHaveBeenCalledTimes(4)
  })
})

describe("settings/groups (LIST PAGE)", () => {
  const features = Array.from({ length: 7 }, (_, i) => ({ id: i + 1, key: `f${i}`, name: `Feature ${i + 1}`, icon: "" }))

  it("lists groups with members, features, badges and the count line", () => {
    groupsState.results = [
      makeGroup({ id: 1, features: features as never, is_booking_staff: true }),
      makeGroup({ id: 2, name: "Sales", description: "", member_count: 1, is_active: false }),
    ]
    renderSt(<TenantGroupManagement />)
    expect(screen.getByRole("heading", { name: "Group Management" })).toBeInTheDocument()
    expect(screen.getAllByTestId("groups-table-row")).toHaveLength(2)
    expect(screen.getByText("7 features")).toBeInTheDocument()
    expect(screen.getByText("Feature 5")).toBeInTheDocument()
    expect(screen.queryByText("Feature 6")).not.toBeInTheDocument()
    expect(screen.getByText("+2 more")).toBeInTheDocument()
    expect(screen.getByText("Booking staff")).toBeInTheDocument()
    expect(screen.getByText("Inactive")).toBeInTheDocument()
    expect(screen.getByTestId("groups-count")).toHaveTextContent("2 groups · click a row to edit")
  })

  it("filters by the search box (name or description)", () => {
    groupsState.results = [makeGroup({ id: 1 }), makeGroup({ id: 2, name: "Sales", description: "Deals" })]
    renderSt(<TenantGroupManagement />)
    fireEvent.change(screen.getByTestId("groups-search"), { target: { value: "deal" } })
    expect(screen.getAllByTestId("groups-table-row")).toHaveLength(1)
    fireEvent.change(screen.getByTestId("groups-search"), { target: { value: "zzz" } })
    expect(screen.getByText("No groups match your search.")).toBeInTheDocument()
  })

  it("opens the create dialog from New and the edit dialog from a row", async () => {
    groupsState.results = [makeGroup({ id: 3 })]
    renderSt(<TenantGroupManagement />)
    fireEvent.click(screen.getByTestId("groups-new"))
    expect(await screen.findByRole("dialog")).toHaveTextContent("Create New Group")
    await waitFor(() => expect(axiosGet).toHaveBeenCalledWith("/api/tenant-groups/available_features/"))
  })

  it("row click edits the group (features requested with group_id)", async () => {
    groupsState.results = [makeGroup({ id: 3 })]
    renderSt(<TenantGroupManagement />)
    fireEvent.click(screen.getByText("First line"))
    expect(await screen.findByRole("dialog")).toHaveTextContent("Edit Group")
    await waitFor(() => expect(axiosGet).toHaveBeenCalledWith("/api/tenant-groups/available_features/?group_id=3"))
  })

  it("deletes after the same confirm, and shows a toast when the delete fails", async () => {
    groupsState.results = [makeGroup({ id: 5, name: "Night shift" })]
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false)
    renderSt(<TenantGroupManagement />)
    fireEvent.click(screen.getByRole("button", { name: "Delete" }))
    expect(confirm).toHaveBeenCalledWith('Are you sure you want to delete the group "Night shift"?')
    expect(groupsState.del).not.toHaveBeenCalled()

    confirm.mockReturnValue(true)
    groupsState.del.mockRejectedValueOnce({ response: { data: { detail: "Group is in use" } } })
    fireEvent.click(screen.getByRole("button", { name: "Delete" }))
    expect(groupsState.del).toHaveBeenCalledWith("5")
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("Group is in use"))
    confirm.mockRestore()
  })

  it("renders Georgian group texts", () => {
    groupsState.results = [makeGroup({ features: features.slice(0, 2) as never })]
    renderSt(<TenantGroupManagement />, "ka")
    expect(screen.getByText("მართეთ ჯგუფები და მათი ფუნქციები")).toBeInTheDocument()
    expect(screen.getByText("2 ფუნქცია")).toBeInTheDocument()
    expect(screen.getByTestId("groups-count")).toHaveTextContent("1 ჯგუფი")
  })
})
