/** LabelManagementDialog (the W89 gap): create, edit, delete, preview, duplicate-name 400, controlled use. */
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";

const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() }));
vi.mock("@/api/axios", () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));
vi.mock("@/services/auth", () => ({ authService: { isAuthenticated: () => true } }));
vi.mock("sonner", () => ({ toast: toastMock }));

import axios from "@/api/axios";
import { LabelManagementDialog, isDuplicateNameError } from "@/components/LabelManagementDialog";
import { page } from "../helpers";
import { renderRail } from "./rail-helpers";

const TAGS = [
  { id: 1, name: "Bug", color: "#EF4444", description: "Broken things" },
  { id: 2, name: "VIP", color: "#3B82F6", description: "" },
];

function err(status: number, data: unknown) {
  return Object.assign(new Error(`HTTP ${status}`), { response: { status, data } });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(axios.get).mockResolvedValue({ data: page(TAGS) });
  vi.mocked(axios.post).mockResolvedValue({ data: { id: 3, name: "New", color: "#EF4444" } });
  vi.mocked(axios.put).mockResolvedValue({ data: { id: 1, name: "Bugs", color: "#EF4444" } });
  vi.mocked(axios.delete).mockResolvedValue({ data: null });
});

function open() {
  renderRail(<LabelManagementDialog />);
  fireEvent.click(screen.getByRole("button", { name: /Manage Labels/ }));
  return screen.findByRole("dialog");
}

describe("LabelManagementDialog", () => {
  it("lists the labels and previews the draft", async () => {
    const dialog = await open();
    await within(dialog).findByText("Broken things");
    expect(dialog).toHaveTextContent("Existing Labels (2)");
    fireEvent.change(within(dialog).getByLabelText(/Label Name/), { target: { value: "Urgent" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Select colour #22C55E" }));
    const preview = within(dialog).getAllByText("Urgent").find((el) => el.tagName !== "INPUT")!;
    expect(preview).toHaveStyle({ backgroundColor: "#22C55E" });
  });

  it("creates a label", async () => {
    const dialog = await open();
    fireEvent.change(within(dialog).getByLabelText(/Label Name/), { target: { value: "Urgent" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /Create Label/ }));
    await waitFor(() =>
      expect(vi.mocked(axios.post)).toHaveBeenCalledWith("/api/tags/", expect.objectContaining({ name: "Urgent", color: "#EF4444" })),
    );
  });

  it("shows the duplicate-name 400 inline (names are unique per tenant)", async () => {
    vi.mocked(axios.post).mockRejectedValueOnce(err(400, { name: ["tag with this name already exists."] }));
    const dialog = await open();
    fireEvent.change(within(dialog).getByLabelText(/Label Name/), { target: { value: "Bug" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /Create Label/ }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("A label with this name already exists");
    expect(within(dialog).getByLabelText(/Label Name/)).toHaveAttribute("aria-invalid", "true");
    expect(isDuplicateNameError(err(400, { non_field_errors: ["must be unique"] }))).toBe(true);
    expect(isDuplicateNameError(err(500, { name: ["x"] }))).toBe(false);
  });

  it("other save errors show the generic message", async () => {
    vi.mocked(axios.post).mockRejectedValueOnce(err(500, {}));
    const dialog = await open();
    fireEvent.change(within(dialog).getByLabelText(/Label Name/), { target: { value: "X" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /Create Label/ }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Couldn't save the label");
  });

  it("edits a label", async () => {
    const dialog = await open();
    await within(dialog).findByText("Broken things");
    fireEvent.click(within(dialog).getAllByRole("button", { name: "Edit label" })[0]);
    const name = within(dialog).getByLabelText(/Label Name/);
    expect(name).toHaveValue("Bug");
    fireEvent.change(name, { target: { value: "Bugs" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /Update Label/ }));
    await waitFor(() => expect(vi.mocked(axios.put)).toHaveBeenCalledWith("/api/tags/1/", expect.objectContaining({ name: "Bugs" })));
  });

  it("deletes through a translated confirm (no window.confirm)", async () => {
    const confirmSpy = vi.spyOn(window, "confirm");
    const dialog = await open();
    await within(dialog).findByText("Broken things");
    fireEvent.click(within(dialog).getAllByRole("button", { name: "Delete label" })[0]);
    const alert = await screen.findByTestId("label-delete-confirm");
    expect(alert).toHaveTextContent('"Bug" is removed from every ticket that uses it.');
    fireEvent.click(within(alert).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(vi.mocked(axios.delete)).toHaveBeenCalledWith("/api/tags/1/"));
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it("controlled: no trigger, opened by the caller (rail's Manage labels…)", async () => {
    const onOpenChange = vi.fn();
    renderRail(<LabelManagementDialog open onOpenChange={onOpenChange} hideTrigger />, { locale: "ka" });
    expect(screen.queryByRole("button", { name: /ლეიბლების მართვა/ })).not.toBeInTheDocument();
    const dialog = await screen.findByRole("dialog");
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
