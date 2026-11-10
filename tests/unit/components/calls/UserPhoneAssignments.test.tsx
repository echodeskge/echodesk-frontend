/**
 * UserPhoneAssignments on the settings kit: same requests as before (list,
 * users, POST / PATCH / DELETE), the extension password never prefilled
 * (`has_extension_password` only), inline error notes instead of alert(),
 * kit controls (native select, SecretInput, switches), ka strings.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import React from "react";
import { cl03Messages, lookup } from "../../calls/cl03-i18n";

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }));
vi.mock("@/api/axios", () => ({ default: api }));

import { UserPhoneAssignments } from "@/components/calls/UserPhoneAssignments";

const assignments = [
  {
    id: 11,
    user: 3,
    user_name: "Levan Maisuradze",
    user_email: "agent@demo.ge",
    sip_configuration: 1,
    extension: "101",
    extension_password: "",
    has_extension_password: true,
    phone_number: "+995322000111",
    display_name: "Support",
    is_primary: true,
    is_active: true,
  },
  {
    id: 12,
    user: 4,
    user_name: "Nino Beridze",
    user_email: "nino@demo.ge",
    sip_configuration: 1,
    extension: "102",
    extension_password: "",
    has_extension_password: false,
    phone_number: "+995322000112",
    display_name: "",
    is_primary: false,
    is_active: false,
  },
];

const users = [
  { id: 3, first_name: "Levan", last_name: "Maisuradze", email: "agent@demo.ge" },
  { id: 4, first_name: "Nino", last_name: "Beridze", email: "nino@demo.ge" },
];

function renderList(locale: "en" | "ka" = "en") {
  return render(
    <NextIntlClientProvider locale={locale} messages={cl03Messages[locale]}>
      <UserPhoneAssignments sipConfigId={1} sipConfigName="Demo PBX" />
    </NextIntlClientProvider>
  );
}

beforeEach(() => {
  for (const f of Object.values(api)) f.mockReset();
  api.get.mockImplementation((url: string) => {
    if (url.startsWith("/api/phone-assignments/")) return Promise.resolve({ data: { results: assignments } });
    if (url.startsWith("/api/users/")) return Promise.resolve({ data: { results: users } });
    return Promise.resolve({ data: { results: [] } });
  });
  api.post.mockResolvedValue({ data: {} });
  api.patch.mockResolvedValue({ data: {} });
  api.delete.mockResolvedValue({ data: {} });
});

describe("UserPhoneAssignments", () => {
  it("lists the extensions of the configuration with the pills and the kit action button", async () => {
    renderList();
    expect(api.get).toHaveBeenCalledWith("/api/phone-assignments/?sip_configuration=1");
    expect(api.get).toHaveBeenCalledWith("/api/users/?page_size=200");
    const rows = await screen.findAllByTestId("phone-assignment-row");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("Levan Maisuradze");
    expect(rows[0]).toHaveTextContent("Ext. 101 · +995322000111");
    expect(rows[0]).toHaveTextContent("Primary");
    expect(rows[1]).toHaveTextContent("Inactive");
    expect(screen.getByTestId("assign-user")).toHaveTextContent("Assign User");
    expect(screen.getByTestId("phone-assignments-1")).toHaveTextContent("Demo PBX");
  });

  it("assigns a user: kit controls, POST with the typed password", async () => {
    renderList();
    await screen.findAllByTestId("phone-assignment-row");
    fireEvent.click(screen.getByTestId("assign-user"));
    const dialog = await screen.findByTestId("assignment-dialog");
    expect(within(dialog).getByTestId("assignment-submit")).toBeDisabled();
    expect(dialog.querySelectorAll('[role="switch"]')).toHaveLength(2);

    const userSelect = screen.getByLabelText(/^User/) as HTMLSelectElement;
    expect(userSelect.tagName).toBe("SELECT");
    expect(within(userSelect).getByRole("option", { name: "Nino Beridze (nino@demo.ge)" })).toBeInTheDocument();
    fireEvent.change(userSelect, { target: { value: "4" } });
    fireEvent.change(screen.getByLabelText(/^Extension$/), { target: { value: "103" } });
    fireEvent.change(screen.getByLabelText(/Phone Number/), { target: { value: "+995322000113" } });
    expect(within(dialog).getByTestId("assignment-submit")).toBeDisabled(); // password required for a new extension
    fireEvent.change(screen.getByLabelText(/Extension Password/), { target: { value: "ext-secret" } });
    fireEvent.change(screen.getByLabelText(/Display Name/), { target: { value: "Sales" } });
    fireEvent.click(screen.getByRole("switch", { name: /Primary Number/ }));
    fireEvent.click(within(dialog).getByTestId("assignment-submit"));

    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
    expect(api.post).toHaveBeenCalledWith("/api/phone-assignments/", {
      user: 4,
      sip_configuration: 1,
      extension: "103",
      phone_number: "+995322000113",
      display_name: "Sales",
      is_primary: false,
      is_active: true,
      extension_password: "ext-secret",
    });
    await waitFor(() => expect(screen.queryByTestId("assignment-dialog")).toBeNull());
    expect(api.get.mock.calls.filter(([u]) => String(u).startsWith("/api/phone-assignments/"))).toHaveLength(2);
  });

  it("editing never prefills the password; blank keeps it (PATCH without the field)", async () => {
    renderList();
    const rows = await screen.findAllByTestId("phone-assignment-row");
    fireEvent.click(within(rows[0]).getByTestId("assignment-edit"));
    const dialog = await screen.findByTestId("assignment-dialog");
    const password = screen.getByLabelText(/Extension Password/) as HTMLInputElement;
    expect(password).toHaveValue("");
    expect(password).toHaveAttribute("type", "password");
    expect(password).toHaveAttribute("placeholder", "••••••••");
    expect(dialog).toHaveTextContent(lookup(cl03Messages.en, "calls.settings.secretSetHint") as string);
    expect(screen.getByLabelText(/^User/)).toHaveValue("3");
    expect(screen.getByLabelText(/^Extension$/)).toHaveValue("101");
    expect(screen.getByRole("switch", { name: /Primary Number/ })).toBeChecked();
    expect(within(dialog).getByTestId("assignment-submit")).toBeEnabled();

    fireEvent.change(screen.getByLabelText(/Display Name/), { target: { value: "Support desk" } });
    fireEvent.click(within(dialog).getByTestId("assignment-submit"));
    await waitFor(() => expect(api.patch).toHaveBeenCalledTimes(1));
    const [url, payload] = api.patch.mock.calls[0];
    expect(url).toBe("/api/phone-assignments/11/");
    expect(payload).toMatchObject({ user: 3, extension: "101", display_name: "Support desk" });
    expect(payload).not.toHaveProperty("extension_password");
  });

  it("editing an extension without a stored password says so", async () => {
    renderList();
    const rows = await screen.findAllByTestId("phone-assignment-row");
    fireEvent.click(within(rows[1]).getByTestId("assignment-edit"));
    const dialog = await screen.findByTestId("assignment-dialog");
    expect(dialog).toHaveTextContent(lookup(cl03Messages.en, "calls.settings.secretUnsetHint") as string);
    expect(screen.getByLabelText(/Extension Password/)).not.toHaveAttribute("placeholder");
  });

  it("a failed save shows an inline note (no alert) and keeps the dialog open", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    api.post.mockRejectedValue({ response: { data: { detail: "Extension already in use" } } });
    renderList();
    await screen.findAllByTestId("phone-assignment-row");
    fireEvent.click(screen.getByTestId("assign-user"));
    await screen.findByTestId("assignment-dialog");
    fireEvent.change(screen.getByLabelText(/^User/), { target: { value: "4" } });
    fireEvent.change(screen.getByLabelText(/^Extension$/), { target: { value: "101" } });
    fireEvent.change(screen.getByLabelText(/Phone Number/), { target: { value: "+995322000113" } });
    fireEvent.change(screen.getByLabelText(/Extension Password/), { target: { value: "pw" } });
    fireEvent.click(screen.getByTestId("assignment-submit"));
    expect(await screen.findByTestId("assignment-error")).toHaveTextContent("Extension already in use");
    expect(screen.getByTestId("assignment-dialog")).toBeInTheDocument();
    expect(alertSpy).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it("delete keeps the translated native confirmation and sends DELETE", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    renderList();
    const rows = await screen.findAllByTestId("phone-assignment-row");
    fireEvent.click(within(rows[1]).getByTestId("assignment-delete"));
    expect(confirmSpy).toHaveBeenCalledWith(lookup(cl03Messages.en, "calls.settings.confirmDeleteAssignment"));
    await waitFor(() => expect(api.delete).toHaveBeenCalledWith("/api/phone-assignments/12/"));
    confirmSpy.mockRestore();
  });

  it("is translated in Georgian", async () => {
    renderList("ka");
    await screen.findAllByTestId("phone-assignment-row");
    expect(screen.getByTestId("assign-user")).toHaveTextContent(lookup(cl03Messages.ka, "calls.settings.assignUser") as string);
    fireEvent.click(screen.getByTestId("assign-user"));
    const dialog = await screen.findByTestId("assignment-dialog");
    expect(dialog).toHaveTextContent(lookup(cl03Messages.ka, "calls.settings.userHint") as string);
    expect(dialog).toHaveTextContent(lookup(cl03Messages.ka, "calls.settings.extensionPasswordHint") as string);
  });
});
