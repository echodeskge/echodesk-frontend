/**
 * EC-04 pages: shipping methods, homepage builder and the e-commerce settings
 * form keep their API calls and payloads after the redesign, and every new
 * control is named / translated. The API is mocked; no network.
 */
import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderEc } from "./ec00-helpers"

const api = vi.hoisted(() => ({
  ecommerceAdminShippingMethodsList: vi.fn(),
  ecommerceAdminShippingMethodsCreate: vi.fn(),
  ecommerceAdminShippingMethodsUpdate: vi.fn(),
  ecommerceAdminShippingMethodsDestroy: vi.fn(),
  ecommerceAdminHomepageSectionsList: vi.fn(),
  ecommerceAdminHomepageSectionsCreate: vi.fn(),
  ecommerceAdminHomepageSectionsUpdate: vi.fn(),
  ecommerceAdminHomepageSectionsPartialUpdate: vi.fn(),
  ecommerceAdminHomepageSectionsDestroy: vi.fn(),
  ecommerceAdminHomepageSectionsChoicesRetrieve: vi.fn(),
  ecommerceAdminHomepageSectionsReorderCreate: vi.fn(),
  itemListsList: vi.fn(),
  ecommerceAdminSettingsList: vi.fn(),
  ecommerceAdminSettingsDeployFrontendCreate: vi.fn(),
  ecommerceAdminSettingsPartialUpdate: vi.fn(),
  ecommerceAdminSettingsCreate: vi.fn(),
  ecommerceAdminSettingsDeleteDeploymentDestroy: vi.fn(),
  ecommerceQuickshipperTestConnection: vi.fn(),
}))
vi.mock("@/api/generated", () => api)
vi.mock("@/api/generated/api", () => api)
const axiosMock = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))
vi.mock("@/api/axios", () => ({ default: axiosMock }))
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast }))
// The settings page gates its Orders section on the store admin (EC-05 covers that section).
vi.mock("@/hooks/useMyAccess", () => ({ useMyAccess: () => ({ isStoreAdmin: false }) }))
vi.mock("@/components/MiniMapPicker", () => ({
  MiniMapPicker: ({ labels }: { labels?: { dropPin?: string } }) => <div data-testid="map">{labels?.dropPin}</div>,
}))

import ShippingMethodsPage from "@/app/(tenant)/ecommerce/shipping-methods/page"
import HomepageBuilderPage from "@/app/(tenant)/ecommerce/homepage-builder/page"
import EcommerceSettingsPage from "@/app/(tenant)/settings/ecommerce/page"

beforeEach(() => {
  vi.clearAllMocks()
})

const METHODS = [
  { id: 1, name: { en: "Courier (Tbilisi)", ka: "კურიერი (თბილისი)" }, description: { en: "Next day", ka: "" }, price: "7.00", free_shipping_threshold: "150.00", is_active: true, estimated_days: 1, position: 0 },
  { id: 2, name: { en: "Store pickup", ka: "" }, description: { en: "", ka: "" }, price: "0.00", free_shipping_threshold: null, is_active: false, estimated_days: 0, position: 1 },
]

describe("shipping methods page", () => {
  it("lists methods with lari prices, Free for 0 and the count in the header", async () => {
    api.ecommerceAdminShippingMethodsList.mockResolvedValue({ results: METHODS })
    renderEc(<ShippingMethodsPage />)
    const rows = await screen.findAllByTestId("ec-table-row")
    expect(rows).toHaveLength(2)
    expect(within(rows[0]).getByText("Courier (Tbilisi)")).toBeInTheDocument()
    expect(within(rows[0]).getAllByText("₾7.00").length).toBeGreaterThan(0)
    expect(within(rows[0]).getAllByText("₾150.00").length).toBeGreaterThan(0)
    expect(within(rows[1]).getAllByText("Free").length).toBeGreaterThan(0)
    expect(within(rows[1]).getByText("Inactive")).toBeInTheDocument()
    expect(screen.getByTestId("outlet-meta")).toHaveTextContent("2 shipping methods")
  })

  it("shows Georgian names in the Georgian UI", async () => {
    api.ecommerceAdminShippingMethodsList.mockResolvedValue({ results: METHODS })
    renderEc(<ShippingMethodsPage />, "ka")
    expect(await screen.findByText("კურიერი (თბილისი)")).toBeInTheDocument()
    expect(screen.getAllByText("უფასო").length).toBeGreaterThan(0)
  })

  it("edits a method with the same request body as before", async () => {
    api.ecommerceAdminShippingMethodsList.mockResolvedValue({ results: METHODS })
    api.ecommerceAdminShippingMethodsUpdate.mockResolvedValue({})
    renderEc(<ShippingMethodsPage />)
    fireEvent.click(await screen.findByRole("button", { name: "Edit Courier (Tbilisi)" }))
    const sheet = await screen.findByTestId("shipping-sheet")
    expect(within(sheet).getByLabelText("Name (English)")).toHaveValue("Courier (Tbilisi)")
    fireEvent.change(within(sheet).getByLabelText("Price"), { target: { value: "8.50" } })
    fireEvent.click(within(sheet).getByRole("button", { name: "Save" }))
    await waitFor(() => expect(api.ecommerceAdminShippingMethodsUpdate).toHaveBeenCalledTimes(1))
    expect(api.ecommerceAdminShippingMethodsUpdate).toHaveBeenCalledWith(1, {
      name: METHODS[0].name,
      description: METHODS[0].description,
      price: "8.50",
      free_shipping_threshold: "150.00",
      is_active: true,
      estimated_days: 1,
      position: 0,
    })
    expect(toast.success).toHaveBeenCalledWith("Shipping method updated successfully")
  })

  it("creates from the header button and deletes after confirmation", async () => {
    api.ecommerceAdminShippingMethodsList.mockResolvedValue({ results: METHODS })
    api.ecommerceAdminShippingMethodsCreate.mockResolvedValue({})
    api.ecommerceAdminShippingMethodsDestroy.mockResolvedValue({})
    renderEc(<ShippingMethodsPage />)
    await screen.findAllByTestId("ec-table-row")
    fireEvent.click(within(screen.getByTestId("outlet-primary")).getByRole("button", { name: /Add Method/ }))
    const sheet = await screen.findByTestId("shipping-sheet")
    fireEvent.change(within(sheet).getByLabelText("Name (English)"), { target: { value: "Express" } })
    fireEvent.click(within(sheet).getByRole("button", { name: "Save" }))
    await waitFor(() => expect(api.ecommerceAdminShippingMethodsCreate).toHaveBeenCalledTimes(1))
    expect(api.ecommerceAdminShippingMethodsCreate.mock.calls[0][0]).toMatchObject({ name: { en: "Express", ka: "" }, price: "0.00", is_active: true })

    // The sheet closes after the save resolves; until it is gone it hides
    // the page from the accessibility tree, so wait for the row button.
    fireEvent.click(await screen.findByRole("button", { name: "Delete Store pickup" }))
    fireEvent.click(await screen.findByRole("button", { name: "Delete" }))
    await waitFor(() => expect(api.ecommerceAdminShippingMethodsDestroy).toHaveBeenCalledWith(2))
  })

  it("shows the empty state with its action, and an error state with retry", async () => {
    api.ecommerceAdminShippingMethodsList.mockResolvedValueOnce({ results: [] })
    const { unmount } = renderEc(<ShippingMethodsPage />)
    expect(await screen.findByText("No shipping methods yet")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Add First Method/ })).toBeInTheDocument()
    unmount()

    api.ecommerceAdminShippingMethodsList.mockRejectedValueOnce(new Error("boom"))
    renderEc(<ShippingMethodsPage />)
    expect(await screen.findByTestId("ec-error")).toBeInTheDocument()
    expect(toast.error).toHaveBeenCalledWith("Failed to load shipping methods")
    api.ecommerceAdminShippingMethodsList.mockResolvedValueOnce({ results: METHODS })
    fireEvent.click(screen.getByRole("button", { name: "Try again" }))
    expect(await screen.findAllByTestId("ec-table-row")).toHaveLength(2)
  })
})

const SECTIONS = [
  { id: 11, title: { en: "Autumn collection", ka: "შემოდგომა" }, section_type: "hero_banner", display_mode: "slider", position: 0, is_active: true, item_list: null },
  { id: 12, title: { en: "Featured", ka: "" }, section_type: "featured_products", display_mode: "grid", position: 1, is_active: true, item_list: 4, item_list_title: "Best sellers" },
  { id: 13, title: { en: "Why us", ka: "" }, section_type: "statistics", display_mode: "grid", position: 2, is_active: false, item_list: null },
]
const CHOICES = {
  section_types: [
    { value: "hero_banner", label: "Hero Banner/Slider" },
    { value: "featured_products", label: "Featured Products" },
    { value: "statistics", label: "Statistics/Achievements" },
  ],
  display_modes: [
    { value: "slider", label: "Slider/Carousel" },
    { value: "grid", label: "Grid Layout" },
  ],
}
const VARIANTS = [{ key: "classic", name: "Classic", description: "Hero banner + Featured products + Category grid", section_count: 3, section_types: ["hero_banner", "featured_products", "category_grid"] }]

function renderBuilder(locale: "en" | "ka" = "en") {
  api.ecommerceAdminHomepageSectionsList.mockResolvedValue({ results: SECTIONS })
  api.ecommerceAdminHomepageSectionsChoicesRetrieve.mockResolvedValue(CHOICES)
  api.itemListsList.mockResolvedValue({ results: [{ id: 4, title: "Best sellers" }] })
  axiosMock.get.mockResolvedValue({ data: VARIANTS })
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return renderEc(
    <QueryClientProvider client={qc}>
      <HomepageBuilderPage />
    </QueryClientProvider>,
    locale
  )
}

describe("homepage builder page", () => {
  it("names every row control and shows translated pills and meta", async () => {
    renderBuilder()
    const rows = await screen.findAllByTestId("hb-section-row")
    expect(rows).toHaveLength(3)
    const first = rows[0]
    expect(within(first).getByRole("button", { name: "Move Autumn collection up" })).toBeDisabled()
    expect(within(first).getByRole("button", { name: "Move Autumn collection down" })).toBeEnabled()
    expect(within(first).getByRole("button", { name: "Edit Autumn collection" })).toBeInTheDocument()
    expect(within(first).getByRole("button", { name: "Delete Autumn collection" })).toBeInTheDocument()
    expect(within(first).getByRole("switch", { name: "Show Autumn collection on the homepage" })).toBeChecked()
    expect(within(first).getByText("Hero banner / slider")).toBeInTheDocument()
    expect(within(rows[1]).getByText("Position: 1 · Linked to Best sellers")).toBeInTheDocument()
    expect(rows[2]).not.toHaveAttribute("data-active")
    expect(await screen.findByTestId("hb-template")).toHaveTextContent("Classic")
  })

  it("reorders, toggles and deletes with the same calls", async () => {
    api.ecommerceAdminHomepageSectionsReorderCreate.mockResolvedValue({})
    api.ecommerceAdminHomepageSectionsPartialUpdate.mockResolvedValue({})
    api.ecommerceAdminHomepageSectionsDestroy.mockResolvedValue({})
    renderBuilder()
    await screen.findAllByTestId("hb-section-row")
    fireEvent.click(screen.getByRole("button", { name: "Move Autumn collection down" }))
    await waitFor(() => expect(api.ecommerceAdminHomepageSectionsReorderCreate).toHaveBeenCalledWith({ section_ids: [12, 11, 13] }))
    fireEvent.click(screen.getByRole("switch", { name: "Show Featured on the homepage" }))
    await waitFor(() => expect(api.ecommerceAdminHomepageSectionsPartialUpdate).toHaveBeenCalledWith(12, { is_active: false }))
    fireEvent.click(screen.getByRole("button", { name: "Delete Why us" }))
    fireEvent.click(await screen.findByRole("button", { name: "Delete" }))
    await waitFor(() => expect(api.ecommerceAdminHomepageSectionsDestroy).toHaveBeenCalledWith(13))
  })

  it("requires the English title before creating a section", async () => {
    api.ecommerceAdminHomepageSectionsCreate.mockResolvedValue({})
    renderBuilder()
    await screen.findAllByTestId("hb-section-row")
    fireEvent.click(within(screen.getByTestId("outlet-primary")).getByRole("button", { name: /Add Section/ }))
    const sheet = await screen.findByTestId("hb-section-sheet")
    fireEvent.click(within(sheet).getByRole("button", { name: "Create" }))
    expect(await within(sheet).findByText("Enter the English title")).toBeInTheDocument()
    expect(api.ecommerceAdminHomepageSectionsCreate).not.toHaveBeenCalled()
    fireEvent.change(within(sheet).getByLabelText(/Title \(English\)/), { target: { value: "New arrivals" } })
    fireEvent.click(within(sheet).getByRole("button", { name: "Create" }))
    await waitFor(() => expect(api.ecommerceAdminHomepageSectionsCreate).toHaveBeenCalledTimes(1))
    expect(api.ecommerceAdminHomepageSectionsCreate.mock.calls[0][0]).toEqual({
      title: { en: "New arrivals", ka: "" },
      subtitle: { en: "", ka: "" },
      section_type: "hero_banner",
      display_mode: "slider",
      item_list: undefined,
      attribute_key: undefined,
      attribute_value: undefined,
      background_color: undefined,
      background_image_url: undefined,
      text_color: undefined,
      settings: {},
    })
  })

  it("applies a template after confirmation", async () => {
    axiosMock.post.mockResolvedValue({ data: {} })
    renderBuilder()
    fireEvent.click(await screen.findByTestId("hb-template"))
    fireEvent.click(await screen.findByRole("button", { name: "Replace & Generate" }))
    await waitFor(() =>
      expect(axiosMock.post).toHaveBeenCalledWith("/api/ecommerce/admin/homepage-sections/generate-from-variant/", { variant: "classic" })
    )
  })

  it("renders section and template labels in Georgian", async () => {
    renderBuilder("ka")
    const rows = await screen.findAllByTestId("hb-section-row")
    expect(within(rows[0]).getByText("შემოდგომა")).toBeInTheDocument()
    expect(within(rows[0]).getByText("მთავარი ბანერი / სლაიდერი")).toBeInTheDocument()
    expect(within(rows[0]).getByText(/ელემენტების სია არ არის დაკავშირებული/)).toBeInTheDocument()
    expect(await screen.findByTestId("hb-template")).toHaveTextContent("კლასიკური")
  })
})

const SETTINGS = {
  id: 5,
  store_name: "Demo store",
  store_email: "shop@demo.ge",
  store_phone: "+995 555 000 000",
  active_payment_providers: ["bog", "cash"],
  enable_card_payment: true,
  enable_cash_on_delivery: true,
  bog_client_id: "bog-123",
  quickshipper_enabled: false,
  ecommerce_frontend_url: "https://demo.ecommerce.echodesk.ge",
  deployment_status: "deployed",
  vercel_project_id: "prj_1",
}

describe("e-commerce settings page", () => {
  beforeEach(() => {
    api.ecommerceAdminSettingsList.mockResolvedValue({ results: [SETTINGS] })
    axiosMock.get.mockResolvedValue({ data: { success: true, domains: [{ name: "shop.demo.ge", verified: false, verification: [] }] } })
  })

  it("loads the form, shows the providers and saves with the same PATCH", async () => {
    api.ecommerceAdminSettingsPartialUpdate.mockResolvedValue({})
    renderEc(<EcommerceSettingsPage />)
    expect(await screen.findByLabelText("Store Name")).toHaveValue("Demo store")
    expect(screen.getByTestId("ec-settings-savebar")).toHaveTextContent("All changes saved")
    // BOG on: its panel is open; TBC off: no fields
    expect(screen.getByLabelText(/BOG Client ID/)).toHaveValue("bog-123")
    expect(screen.queryByLabelText("TBC Client ID")).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("switch", { name: "TBC Bank" }))
    expect(screen.getByLabelText("TBC Client ID")).toBeInTheDocument()
    expect(screen.getByTestId("ec-settings-savebar")).toHaveTextContent("You have unsaved changes")
    fireEvent.click(screen.getByTestId("ec-settings-save"))
    await waitFor(() => expect(api.ecommerceAdminSettingsPartialUpdate).toHaveBeenCalledTimes(1))
    const [id, payload] = api.ecommerceAdminSettingsPartialUpdate.mock.calls[0]
    expect(id).toBe("5")
    expect(payload).toMatchObject({
      active_payment_providers: ["bog", "cash", "tbc"],
      enable_card_payment: true,
      enable_cash_on_delivery: true,
      store_name: "Demo store",
      bog_client_id: "bog-123",
    })
    expect(payload).not.toHaveProperty("bog_client_secret")
    expect(toast.success).toHaveBeenCalledWith("Settings saved successfully!")
  })

  it("blocks saving without any payment method", async () => {
    renderEc(<EcommerceSettingsPage />)
    await screen.findByLabelText("Store Name")
    fireEvent.click(screen.getByRole("switch", { name: "Bank of Georgia (BOG)" }))
    fireEvent.click(screen.getByRole("switch", { name: "Cash on Delivery" }))
    expect(screen.getByTestId("ec-settings-save")).toBeDisabled()
    expect(screen.getByTestId("ec-settings-savebar")).toHaveTextContent("At least one payment method must be enabled")
  })

  it("shows the deployment as a status pill and translated domain dialogs", async () => {
    axiosMock.post.mockResolvedValue({ data: { success: true } })
    renderEc(<EcommerceSettingsPage />)
    expect(await screen.findByTestId("ec-deploy-status")).toHaveTextContent("Deployed")
    const row = await screen.findByTestId("ec-domain-row")
    fireEvent.click(within(row).getByRole("button", { name: "Remove shop.demo.ge" }))
    expect(await screen.findByText("Are you sure you want to remove shop.demo.ge?")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Remove" }))
    await waitFor(() =>
      expect(axiosMock.post).toHaveBeenCalledWith("/api/ecommerce/admin/settings/remove-domain/", { domain: "shop.demo.ge" })
    )
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Domain shop.demo.ge removed successfully"))
  })

  it("renders the Quickshipper block and storefront choices in Georgian", async () => {
    api.ecommerceAdminSettingsList.mockResolvedValue({ results: [{ ...SETTINGS, quickshipper_enabled: true, storefront_template: "voltage" }] })
    renderEc(<EcommerceSettingsPage />, "ka")
    expect(await screen.findByText("მიწოდება — Quickshipper")).toBeInTheDocument()
    expect(screen.getByTestId("map")).toHaveTextContent("დააწკაპუნეთ რუკაზე წერტილის მოსანიშნად")
    expect(screen.getByRole("radio", { name: /ვოლტაჟი/ })).toHaveAttribute("aria-checked", "true")
    expect(screen.getByRole("radio", { name: "კობალტი" })).toBeInTheDocument()
    expect(screen.getByTestId("ec-deploy-status")).toHaveTextContent("განთავსებულია")
  })

  it("shows a retry banner when the settings cannot be loaded", async () => {
    api.ecommerceAdminSettingsList.mockRejectedValueOnce(new Error("offline"))
    renderEc(<EcommerceSettingsPage />)
    expect(await screen.findByText(/Couldn't load the saved settings/)).toBeInTheDocument()
    expect(toast.error).toHaveBeenCalledWith("Failed to load ecommerce settings")
    fireEvent.click(screen.getByRole("button", { name: "Try again" }))
    expect(await screen.findByLabelText("Store Name")).toHaveValue("Demo store")
  })
})
