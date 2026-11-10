/**
 * ST-01: General and Appearance in the design FORM PAGE. Same handlers and
 * payloads as before; the explicit saves moved into the sticky save bar.
 */
import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { screen, fireEvent, act, within } from "@testing-library/react"
import { renderSt } from "./st-helpers"

const h = vi.hoisted(() => ({
  settings: { min_users_per_ticket: 2, only_superadmin_can_delete_tickets: false, logo: null as string | null } as Record<string, unknown> | undefined,
  update: vi.fn(async (_d: unknown) => ({})),
  upload: vi.fn(async (_d: unknown) => ({ logo_url: "/logo.png" })),
  remove: vi.fn(async () => ({})),
  staff: true,
  superuser: true,
  appearance: { primary_color: "240 5.9% 10%", border_radius: "0.5rem", sidebar_order: [] as string[] } as Record<string, unknown>,
  updateAppearance: vi.fn(async (_d: unknown) => ({})),
  resetAppearance: vi.fn(async () => ({})),
  setMode: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

vi.mock("sonner", () => ({ toast: h.toast }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }))
vi.mock("@/lib/preferredLanguage", () => ({ syncPreferredLanguage: vi.fn() }))
vi.mock("@/hooks/useMyAccess", () => ({ useMyAccess: () => ({ isStaffOrSuperuser: h.staff }) }))
vi.mock("@/hooks/useUserProfile", () => ({ useUserProfile: () => ({ data: { is_superuser: h.superuser } }) }))
vi.mock("@/contexts/ThemeContext", () => ({
  useTheme: () => ({ mode: "light", setMode: h.setMode, resolvedMode: "light", setAppearance: vi.fn() }),
}))
vi.mock("@/hooks/api", () => ({
  useTenantSettings: () => ({ data: h.settings, isLoading: false }),
  useUpdateTenantSettings: () => ({ mutateAsync: h.update, isPending: false }),
  useUploadTenantLogo: () => ({ mutateAsync: h.upload, isPending: false }),
  useRemoveTenantLogo: () => ({ mutateAsync: h.remove, isPending: false }),
  useDashboardAppearance: () => ({ data: h.appearance, isLoading: false }),
  useUpdateDashboardAppearance: () => ({ mutateAsync: h.updateAppearance, isPending: false }),
  useResetDashboardAppearance: () => ({ mutateAsync: h.resetAppearance, isPending: false }),
}))

import GeneralSettingsPage from "@/app/(tenant)/settings/general/page"
import AppearanceSettingsPage from "@/app/(tenant)/settings/appearance/page"

beforeEach(() => {
  vi.clearAllMocks()
  h.settings = { min_users_per_ticket: 2, only_superadmin_can_delete_tickets: false, logo: null }
  h.staff = true
  h.superuser = true
  h.appearance = { primary_color: "240 5.9% 10%", border_radius: "0.5rem", sidebar_order: [] }
})

describe("general settings", () => {
  it("renders the form page with branding, language and ticket sections", () => {
    renderSt(<GeneralSettingsPage />)
    expect(screen.getByRole("heading", { name: "General Settings" })).toBeInTheDocument()
    expect(screen.getByTestId("general-branding")).toHaveTextContent("Company Logo")
    expect(screen.getByTestId("general-language")).toHaveTextContent("Display language")
    expect(screen.getByTestId("general-tickets")).toHaveTextContent("Minimum Users Per Ticket")
    expect(screen.getByTestId("general-logo-upload")).toHaveTextContent("Upload Logo")
    expect(screen.queryByTestId("general-logo-remove")).not.toBeInTheDocument()
    // Nothing changed yet: no save bar.
    expect(screen.queryByTestId("settings-savebar")).not.toBeInTheDocument()
  })

  it("shows the save bar once a ticket setting changes and saves the same payload", async () => {
    renderSt(<GeneralSettingsPage />)
    fireEvent.change(screen.getByLabelText("Minimum Users Per Ticket"), { target: { value: "4" } })
    fireEvent.click(screen.getByRole("switch", { name: "Only Superadmins Can Delete Tickets" }))
    expect(screen.getByTestId("settings-savebar")).toHaveTextContent("You have unsaved changes")
    await act(async () => {
      fireEvent.click(screen.getByTestId("settings-savebar-save"))
    })
    expect(h.update).toHaveBeenCalledWith({ min_users_per_ticket: 4, only_superadmin_can_delete_tickets: true })
    expect(h.toast.success).toHaveBeenCalledWith("Ticket settings saved successfully")
  })

  it("Discard restores the loaded values", () => {
    renderSt(<GeneralSettingsPage />)
    const input = screen.getByLabelText("Minimum Users Per Ticket") as HTMLInputElement
    fireEvent.change(input, { target: { value: "9" } })
    fireEvent.click(screen.getByTestId("settings-savebar-discard"))
    expect(input.value).toBe("2")
    expect(screen.queryByTestId("settings-savebar")).not.toBeInTheDocument()
    expect(h.update).not.toHaveBeenCalled()
  })

  it("keeps the superadmin-delete toggle disabled for non-staff", () => {
    h.staff = false
    renderSt(<GeneralSettingsPage />)
    expect(screen.getByRole("switch", { name: "Only Superadmins Can Delete Tickets" })).toBeDisabled()
  })

  it("rejects non-images with a translated toast (Georgian)", () => {
    renderSt(<GeneralSettingsPage />, "ka")
    const file = new File(["x"], "a.txt", { type: "text/plain" })
    fireEvent.change(screen.getByTestId("general-logo-input"), { target: { files: [file] } })
    expect(h.toast.error).toHaveBeenCalledWith("აირჩიეთ სურათის ფაილი")
    expect(h.upload).not.toHaveBeenCalled()
  })

  it("removes the logo with the same handler when one is set", async () => {
    h.settings = { ...h.settings, logo: "/old.png" }
    renderSt(<GeneralSettingsPage />)
    await act(async () => {
      fireEvent.click(screen.getByTestId("general-logo-remove"))
    })
    expect(h.remove).toHaveBeenCalledTimes(1)
    expect(h.toast.success).toHaveBeenCalledWith("Logo removed successfully")
  })
})

describe("appearance settings", () => {
  it("changes the display mode instantly through the choice segment", () => {
    renderSt(<AppearanceSettingsPage />)
    fireEvent.click(within(screen.getByTestId("appearance-mode-choice")).getByRole("radio", { name: "Dark" }))
    expect(h.setMode).toHaveBeenCalledWith("dark")
    expect(screen.queryByTestId("settings-savebar")).not.toBeInTheDocument()
  })

  it("picks a preset swatch, then saves the same payload from the save bar", async () => {
    renderSt(<AppearanceSettingsPage />)
    const presets = screen.getByTestId("appearance-presets")
    expect(within(presets).getByRole("radio", { name: "Zinc" })).toHaveAttribute("aria-checked", "true")
    fireEvent.click(within(presets).getByRole("radio", { name: "Blue" }))
    fireEvent.click(within(screen.getByTestId("appearance-radius")).getByRole("radio", { name: "Pill" }))
    await act(async () => {
      fireEvent.click(screen.getByTestId("settings-savebar-save"))
    })
    expect(h.updateAppearance).toHaveBeenCalledWith(
      expect.objectContaining({ primary_color: "221.2 83.2% 53.3%", border_radius: "1rem", sidebar_order: [] })
    )
  })

  it("Discard puts the loaded colours back", () => {
    renderSt(<AppearanceSettingsPage />)
    fireEvent.click(within(screen.getByTestId("appearance-presets")).getByRole("radio", { name: "Red" }))
    fireEvent.click(screen.getByTestId("settings-savebar-discard"))
    expect(within(screen.getByTestId("appearance-presets")).getByRole("radio", { name: "Zinc" })).toHaveAttribute("aria-checked", "true")
    expect(screen.queryByTestId("settings-savebar")).not.toBeInTheDocument()
  })

  it("resets from the danger zone with the same handler (no confirmation, as before)", async () => {
    renderSt(<AppearanceSettingsPage />)
    await act(async () => {
      fireEvent.click(within(screen.getByTestId("appearance-reset")).getByRole("button", { name: "Reset to Defaults" }))
    })
    expect(h.resetAppearance).toHaveBeenCalledTimes(1)
  })

  it("non-superusers only get mode and preview (no theme, order, reset or save)", () => {
    h.superuser = false
    renderSt(<AppearanceSettingsPage />)
    expect(screen.getByTestId("appearance-mode")).toBeInTheDocument()
    expect(screen.getByTestId("appearance-preview")).toBeInTheDocument()
    expect(screen.queryByTestId("appearance-theme")).not.toBeInTheDocument()
    expect(screen.queryByTestId("appearance-sidebar-order")).not.toBeInTheDocument()
    expect(screen.queryByTestId("appearance-reset")).not.toBeInTheDocument()
  })

  it("translates the radius options and preview in Georgian", () => {
    renderSt(<AppearanceSettingsPage />, "ka")
    expect(within(screen.getByTestId("appearance-radius")).getByRole("radio", { name: "კაფსულა" })).toBeInTheDocument()
    expect(screen.getByText("ძირითადი ღილაკი")).toBeInTheDocument()
  })
})
