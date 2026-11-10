/**
 * ST-05 business modules, LIST PAGEs: ticket forms, item lists and the item
 * list detail. Same requests and the same canManageSettings gates as before;
 * only the layout changed (plus the bug fixes listed in the ST-05 report).
 */
import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { screen, fireEvent, waitFor, within } from "@testing-library/react"
import { renderSt } from "./st-helpers"
import { SettingsCrumbContext } from "@/app/(tenant)/settings/_lib/settings-crumb"

const s = vi.hoisted(() => ({
  canManageSettings: true,
  push: vi.fn(),
  back: vi.fn(),
  crumb: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: s.push, back: s.back }),
  useParams: () => ({ id: "1" }),
  usePathname: () => "/settings/item-lists",
}))
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))
vi.mock("next/dynamic", () => ({ default: () => () => null }))
vi.mock("@/hooks/useMyAccess", () => ({ useMyAccess: () => ({ canManageSettings: s.canManageSettings }) }))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock("@/components/ImageGalleryPicker", () => ({ ImageGalleryPicker: () => null }))

const api = vi.hoisted(() => ({
  ticketFormsList: vi.fn(),
  ticketFormsCreate: vi.fn(),
  ticketFormsUpdate: vi.fn(),
  ticketFormsDestroy: vi.fn(),
  ticketFormsSetDefaultCreate: vi.fn(),
  itemListsList: vi.fn(),
  itemListsCreate: vi.fn(),
  itemListsUpdate: vi.fn(),
  itemListsDestroy: vi.fn(),
  itemListsRetrieve: vi.fn(),
  listItemsCreate: vi.fn(),
  listItemsUpdate: vi.fn(),
  listItemsDestroy: vi.fn(),
}))
vi.mock("@/api/generated/api", () => api)

import TicketFormsPage from "@/app/(tenant)/settings/ticket-forms/page"
import ItemListsPage from "@/app/(tenant)/settings/item-lists/page"
import ItemListDetailPage from "@/app/(tenant)/settings/item-lists/[id]/page"

const CREATED = "2026-03-04T12:00:00Z"
const FORMS = [
  {
    id: 1,
    title: "Support request",
    description: "Default form",
    is_default: true,
    is_active: true,
    item_lists: [{ id: 7, title: "Branches" }],
    child_forms: [{ id: 2 }],
    submissions_count: 4,
    created_at: CREATED,
    custom_fields: [],
  },
  {
    id: 2,
    title: "Return",
    description: "",
    is_default: false,
    is_active: false,
    parent_form: { id: 1, title: "Support request" },
    item_lists: [],
    child_forms: [],
    submissions_count: 0,
    created_at: CREATED,
    custom_fields: [{ name: "addr", label: "Address", type: "string", required: true }],
  },
]
const LISTS = [
  {
    id: 7,
    title: "Branches",
    description: "Pickup points",
    is_active: true,
    is_public: true,
    items_count: 3,
    custom_fields_schema: [{ name: "city", label: "City", type: "string", required: false }],
    created_at: CREATED,
  },
  { id: 8, title: "Old", description: "", is_active: false, is_public: false, items_count: 0, custom_fields_schema: [], created_at: CREATED },
]
const DETAIL = {
  id: 1,
  title: "Categories",
  description: "Product categories",
  parent_list: null,
  custom_fields_schema: [{ name: "flag", label: "Flag", type: "boolean", required: false }],
  root_items: [
    {
      id: 1,
      label: "Electronics",
      custom_id: "ELEC",
      is_active: true,
      custom_data: { flag: true },
      children: [{ id: 2, label: "Phones", custom_id: "", is_active: true, parent: 1, custom_data: {}, children: [] }],
    },
    { id: 5, label: "Home", custom_id: "HOME", is_active: false, custom_data: {}, children: [] },
  ],
}

beforeEach(() => {
  vi.clearAllMocks()
  s.canManageSettings = true
  api.ticketFormsList.mockResolvedValue({ results: FORMS })
  api.itemListsList.mockResolvedValue({ results: LISTS })
  api.itemListsRetrieve.mockResolvedValue(DETAIL)
  for (const fn of [api.ticketFormsCreate, api.ticketFormsUpdate, api.ticketFormsDestroy, api.ticketFormsSetDefaultCreate, api.itemListsCreate, api.itemListsUpdate, api.itemListsDestroy, api.listItemsCreate, api.listItemsUpdate, api.listItemsDestroy]) {
    fn.mockResolvedValue({})
  }
  vi.spyOn(window, "confirm").mockReturnValue(true)
})

describe("ticket forms LIST PAGE", () => {
  it("shows every form with its badges, lists, submissions and the count line", async () => {
    renderSt(<TicketFormsPage />)
    expect(await screen.findByText("Support request", { selector: "span" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Ticket Forms" })).toBeInTheDocument()
    expect(screen.getByText("Default")).toBeInTheDocument()
    expect(screen.getByText("Inactive")).toBeInTheDocument()
    expect(screen.getByText("Child of: Support request")).toBeInTheDocument()
    expect(screen.getByText("Has 1 child form")).toBeInTheDocument()
    expect(screen.getByText("Branches")).toBeInTheDocument()
    expect(screen.getByTestId("ticket-forms-count")).toHaveTextContent("2 forms · click a row to edit")
    // Set default + delete only on the non-default form, like before.
    expect(screen.getAllByRole("button", { name: "Set Default" })).toHaveLength(1)
    expect(screen.getAllByRole("button", { name: "Delete" })).toHaveLength(1)
    expect(screen.getAllByRole("button", { name: "Edit" })).toHaveLength(2)
  })

  it("creates with the same payload as before", async () => {
    renderSt(<TicketFormsPage />)
    fireEvent.click(await screen.findByTestId("ticket-forms-new"))
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "New one" } })
    fireEvent.click(screen.getByRole("button", { name: "Create" }))
    await waitFor(() => expect(api.ticketFormsCreate).toHaveBeenCalledTimes(1))
    expect(api.ticketFormsCreate).toHaveBeenCalledWith({
      title: "New one",
      description: "",
      parent_form_id: null,
      item_list_ids: [],
      custom_fields: [],
      is_active: true,
    })
  })

  it("a row click opens the edit dialog; set default, delete keep their calls and confirm", async () => {
    renderSt(<TicketFormsPage />)
    const rows = await screen.findAllByTestId("ticket-forms-table-row")
    fireEvent.click(rows[1])
    expect(await screen.findByText("Edit Ticket Form")).toBeInTheDocument()
    expect(screen.getByLabelText("Title")).toHaveValue("Return")
    expect(screen.getByText("Parent form (optional)")).toBeInTheDocument()
    expect(screen.getByDisplayValue("addr")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Update" }))
    await waitFor(() => expect(api.ticketFormsUpdate).toHaveBeenCalledTimes(1))
    expect(api.ticketFormsUpdate.mock.calls[0][0]).toBe(2)
    expect(api.ticketFormsUpdate.mock.calls[0][1]).toMatchObject({ id: 2, title: "Return", parent_form_id: 1, is_active: false })

    fireEvent.click(screen.getByRole("button", { name: "Set Default" }))
    await waitFor(() => expect(api.ticketFormsSetDefaultCreate).toHaveBeenCalledWith(2, FORMS[1]))
    fireEvent.click(screen.getByRole("button", { name: "Delete" }))
    expect(window.confirm).toHaveBeenCalled()
    await waitFor(() => expect(api.ticketFormsDestroy).toHaveBeenCalledWith(2))
  })

  it("is read-only without manage_settings (no New, no row actions, rows do not open)", async () => {
    s.canManageSettings = false
    renderSt(<TicketFormsPage />)
    const rows = await screen.findAllByTestId("ticket-forms-table-row")
    expect(screen.queryByTestId("ticket-forms-new")).toBeNull()
    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Set Default" })).toBeNull()
    fireEvent.click(rows[0])
    expect(screen.queryByRole("dialog")).toBeNull()
    expect(screen.getByTestId("ticket-forms-count")).toHaveTextContent(/^2 forms$/)
  })

  it("translates the former hard-coded dialog texts in Georgian", async () => {
    renderSt(<TicketFormsPage />, "ka")
    fireEvent.click(await screen.findByTestId("ticket-forms-new"))
    const dialog = screen.getByRole("dialog")
    expect(within(dialog).getByText("მშობელი ფორმა (არჩევითი)")).toBeInTheDocument()
    expect(within(dialog).getByText("დამატებითი ველები")).toBeInTheDocument()
    expect(within(dialog).queryByText(/Custom Fields|Parent Form|Add Field/)).toBeNull()
  })
})

describe("item lists LIST PAGE", () => {
  it("shows lists with badges, counts, custom fields and Manage items links", async () => {
    renderSt(<ItemListsPage />)
    expect(await screen.findByText("Pickup points")).toBeInTheDocument()
    expect(screen.getByText("Public")).toBeInTheDocument()
    expect(screen.getByText("Inactive")).toBeInTheDocument()
    expect(screen.getByText("City (string)")).toBeInTheDocument()
    const links = screen.getAllByRole("link", { name: "Manage Items" })
    expect(links.map((a) => a.getAttribute("href"))).toEqual(["/settings/item-lists/7", "/settings/item-lists/8"])
    expect(screen.getByTestId("item-lists-count")).toHaveTextContent("2 lists · click a row to manage its items")
  })

  it("a row click opens the list's items; edit and delete keep their requests", async () => {
    renderSt(<ItemListsPage />)
    const rows = await screen.findAllByTestId("item-lists-table-row")
    fireEvent.click(rows[0])
    expect(s.push).toHaveBeenCalledWith("/settings/item-lists/7")
    fireEvent.click(screen.getAllByRole("button", { name: "Edit" })[0])
    expect(await screen.findByText("Edit Item List")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Update" }))
    await waitFor(() => expect(api.itemListsUpdate).toHaveBeenCalledTimes(1))
    expect(api.itemListsUpdate.mock.calls[0][1]).toMatchObject({ id: 7, title: "Branches", is_public: true })
    fireEvent.click(screen.getAllByRole("button", { name: "Delete" })[1])
    await waitFor(() => expect(api.itemListsDestroy).toHaveBeenCalledWith(8))
  })

  it("is read-only without manage_settings but still links to the items", async () => {
    s.canManageSettings = false
    renderSt(<ItemListsPage />)
    await screen.findByText("Pickup points")
    expect(screen.queryByTestId("item-lists-new")).toBeNull()
    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull()
    expect(screen.getAllByRole("link", { name: "Manage Items" })).toHaveLength(2)
  })
})

describe("item list detail", () => {
  function renderDetail(locale: "en" | "ka" = "en") {
    return renderSt(
      <SettingsCrumbContext.Provider value={s.crumb}>
        <ItemListDetailPage />
      </SettingsCrumbContext.Provider>,
      locale
    )
  }

  it("shows root items with their children, field values and statuses; sets the crumb", async () => {
    renderDetail()
    expect(await screen.findByRole("heading", { name: "Categories" })).toBeInTheDocument()
    const rows = screen.getAllByTestId("item-list-items-table-row")
    expect(rows.map((r) => r.textContent)).toEqual([
      expect.stringContaining("Electronics"),
      expect.stringContaining("Phones"),
      expect.stringContaining("Home"),
    ])
    expect(within(rows[0]).getByText("Yes")).toBeInTheDocument()
    expect(within(rows[2]).getByText("Inactive")).toBeInTheDocument()
    expect(s.crumb).toHaveBeenCalledWith("Categories")
    expect(screen.getByTestId("item-list-items-count")).toHaveTextContent("3 items · click a row to edit")
  })

  it("keeps back, add, edit and delete behaviour", async () => {
    renderDetail()
    await screen.findByRole("heading", { name: "Categories" })
    fireEvent.click(screen.getByRole("button", { name: "Item lists" }))
    expect(s.back).toHaveBeenCalled()
    fireEvent.click(screen.getAllByTestId("item-list-items-table-row")[1])
    expect(await screen.findByLabelText("Label *")).toHaveValue("Phones")
    fireEvent.click(screen.getByRole("button", { name: "Edit" }))
    await waitFor(() => expect(api.listItemsUpdate).toHaveBeenCalledTimes(1))
    expect(api.listItemsUpdate.mock.calls[0][0]).toBe(2)
    expect(api.listItemsUpdate.mock.calls[0][1]).toMatchObject({ label: "Phones", parent: 1, is_active: true })
    fireEvent.click(screen.getAllByRole("button", { name: "Delete" })[2])
    await waitFor(() => expect(api.listItemsDestroy).toHaveBeenCalledWith(5))
    fireEvent.click(screen.getByTestId("item-list-add-item"))
    fireEvent.change(await screen.findByLabelText("Label *"), { target: { value: "Toys" } })
    fireEvent.click(screen.getByRole("button", { name: "Create" }))
    await waitFor(() =>
      expect(api.listItemsCreate).toHaveBeenCalledWith({
        label: "Toys",
        custom_id: "",
        parent: null,
        parent_list_item: null,
        position: 0,
        is_active: true,
        custom_data: {},
        item_list: 1,
      })
    )
  })

  it("hides item writes without manage_settings", async () => {
    s.canManageSettings = false
    renderDetail()
    await screen.findByRole("heading", { name: "Categories" })
    expect(screen.queryByTestId("item-list-add-item")).toBeNull()
    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Delete" })).toBeNull()
    fireEvent.click(screen.getAllByTestId("item-list-items-table-row")[0])
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("says the list could not be loaded when loading fails", async () => {
    const { toast } = await import("sonner")
    api.itemListsRetrieve.mockRejectedValueOnce(new Error("boom"))
    renderDetail()
    expect(await screen.findByText("Item list not found")).toBeInTheDocument()
    expect(toast.error).toHaveBeenCalledWith("Failed to load the item list")
  })
})
