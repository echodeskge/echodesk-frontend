import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/api/axios", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast: toastMock }));
vi.mock("next-intl", async () => {
  const { translate } = await import("./test-utils");
  return { useTranslations: (ns: string) => translate(ns) };
});

import axios from "@/api/axios";
import { BoardSettingsDialog, type BoardSettingsGates } from "@/components/tickets-admin/board-settings-dialog";
import { invalidatedKeys, renderWithClient, routeAxios, type Routes } from "./test-utils";

const ax = axios as unknown as Parameters<typeof routeAxios>[0];
const T = "tickets.boardAdmin";

const ALL: BoardSettingsGates = { canEditBoard: true, canDeleteBoard: true, canSetDefaultBoard: true, canManageColumns: true };
const NONE: BoardSettingsGates = { canEditBoard: false, canDeleteBoard: false, canSetDefaultBoard: false, canManageColumns: false };

function board(overrides: Record<string, unknown> = {}) {
  return {
    id: 7,
    name: "Support",
    description: "Customer issues",
    color: "#3b82f6",
    is_default: false,
    order_users: [],
    board_users: [],
    board_groups: [],
    ...overrides,
  };
}

function setup(gates: BoardSettingsGates, routes: Routes = {}, data = board()) {
  routeAxios(ax, { "GET /api/boards/7/": data, ...routes });
  const props = { onClose: vi.fn(), onDeleted: vi.fn(), onOpenUsers: vi.fn(), onOpenColumns: vi.fn() };
  const r = renderWithClient(<BoardSettingsDialog open board={{ id: 7, name: "Support" }} gates={gates} {...props} />);
  return { ...r, ...props };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("BoardSettingsDialog — details", () => {
  it("edits name, description and colour through boardsPartialUpdate", async () => {
    const user = userEvent.setup();
    const patch = vi.fn((body: unknown) => board(body as Record<string, unknown>));
    const { invalidate } = setup(ALL, { "PATCH /api/boards/7/": patch });

    const name = await screen.findByLabelText(`${T}.create.name`);
    await waitFor(() => expect(name).toHaveValue("Support"));
    await user.clear(name);
    await user.type(name, "Help desk");
    await user.clear(screen.getByLabelText(`${T}.create.description`));
    await user.click(screen.getByRole("radio", { name: "#22c55e" }));
    await user.click(screen.getByRole("button", { name: `${T}.settings.save` }));

    await waitFor(() => expect(patch).toHaveBeenCalled());
    expect(patch.mock.calls[0][0]).toEqual({ name: "Help desk", description: "", color: "#22c55e" });
    expect(toastMock.success).toHaveBeenCalledWith(`${T}.settings.saved`);
    const keys = invalidatedKeys(invalidate);
    expect(keys).toContainEqual(["boards"]);
    expect(keys).toContainEqual(["kanbanBoard", 7]);
  });

  it("is read-only without edit rights and hides the Telegram tab", async () => {
    setup({ ...NONE, canDeleteBoard: true });
    const name = await screen.findByLabelText(`${T}.create.name`);
    expect(name).toBeDisabled();
    expect(screen.queryByRole("button", { name: `${T}.settings.save` })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: `${T}.telegram.tab` })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: `${T}.menu.manageUsers` })).not.toBeInTheDocument();
  });

  it("links to Manage users and Edit columns when permitted", async () => {
    const user = userEvent.setup();
    const { onOpenUsers, onOpenColumns } = setup(ALL);
    await user.click(await screen.findByRole("button", { name: `${T}.menu.manageUsers` }));
    await user.click(screen.getByRole("button", { name: `${T}.menu.editColumns` }));
    expect(onOpenUsers).toHaveBeenCalled();
    expect(onOpenColumns).toHaveBeenCalled();
  });
});

describe("BoardSettingsDialog — make default", () => {
  it("calls boards/{id}/set_default/ (WS11) for staff", async () => {
    const user = userEvent.setup();
    const post = vi.fn(() => ({ status: "default set" }));
    setup(ALL, { "POST /api/boards/7/set_default/": post });
    await user.click(await screen.findByRole("button", { name: `${T}.settings.makeDefault` }));
    await waitFor(() => expect(post).toHaveBeenCalled());
    expect(toastMock.success).toHaveBeenCalledWith(`${T}.settings.defaultSet:{"name":"Support"}`);
  });

  it("is hidden for non-staff", async () => {
    setup({ ...ALL, canSetDefaultBoard: false });
    await screen.findByLabelText(`${T}.create.name`);
    expect(screen.queryByRole("button", { name: `${T}.settings.makeDefault` })).not.toBeInTheDocument();
  });

  it("shows the badge instead of the button when the board is already default", async () => {
    setup(ALL, {}, board({ is_default: true }));
    await screen.findByLabelText(`${T}.create.name`);
    await waitFor(() => expect(screen.getAllByText(`${T}.settings.isDefaultBadge`).length).toBeGreaterThan(0));
    expect(screen.queryByRole("button", { name: `${T}.settings.makeDefault` })).not.toBeInTheDocument();
  });
});

describe("BoardSettingsDialog — delete", () => {
  it("warns in an AlertDialog that tickets are deleted, then calls boardsDestroy", async () => {
    const user = userEvent.setup();
    const del = vi.fn(() => null);
    const { onDeleted, onClose } = setup(ALL, { "DELETE /api/boards/7/": del });

    await user.click(await screen.findByRole("button", { name: `${T}.settings.delete` }));
    const alert = await screen.findByRole("alertdialog");
    expect(alert).toHaveTextContent(`${T}.settings.deleteConfirmTitle:{"name":"Support"}`);
    expect(alert).toHaveTextContent(`${T}.settings.deleteConfirmBody`);
    expect(del).not.toHaveBeenCalled();

    const confirm = screen.getAllByRole("button", { name: `${T}.settings.delete` }).find((b) => alert.contains(b))!;
    await user.click(confirm);
    await waitFor(() => expect(onDeleted).toHaveBeenCalledWith(7));
    expect(del).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
    expect(toastMock.success).toHaveBeenCalledWith(`${T}.settings.deleted`);
  });

  it("is hidden without delete_boards", async () => {
    setup({ ...ALL, canDeleteBoard: false });
    await screen.findByLabelText(`${T}.create.name`);
    expect(screen.queryByRole("button", { name: `${T}.settings.delete` })).not.toBeInTheDocument();
  });
});
