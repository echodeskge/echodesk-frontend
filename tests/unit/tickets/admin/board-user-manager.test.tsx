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
import { BoardUserManager } from "@/components/tickets-admin/board-user-manager";
import { invalidatedKeys, renderWithClient, routeAxios } from "./test-utils";

const box = (name: string) => screen.getByRole("checkbox", { name: new RegExp(`^${name}`) });
const ax = axios as unknown as Parameters<typeof routeAxios>[0];
const T = "tickets.boardAdmin.users";

const u = (id: number, first: string, last = "") => ({ id, email: `${first.toLowerCase()}@x.ge`, first_name: first, last_name: last, is_active: true });

function routes(board: Record<string, unknown>, patch = vi.fn((b: unknown) => b)) {
  routeAxios(ax, {
    "GET /api/boards/9/": { id: 9, name: "Sales", order_users: [], board_users: [], board_groups: [], ...board },
    // Two pages of users: the list must follow `next` to the end (W26).
    "GET /api/users/#page=1": { count: 3, next: "http://x/api/users/?page=2&page_size=100", results: [u(1, "Ana"), u(2, "Beka")] },
    "GET /api/users/#page=2": { count: 3, next: null, results: [u(3, "Zura", "K")] },
    "GET /api/tenant-groups/": { count: 2, next: null, results: [{ id: 5, name: "Support team" }, { id: 6, name: "Sales team" }] },
    "PATCH /api/boards/9/": patch,
  });
  return patch;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("BoardUserManager", () => {
  it("pages through all users and saves order users, board users and groups in one PATCH", async () => {
    const user = userEvent.setup();
    const patch = routes({ board_users: [u(2, "Beka")] });
    const onClose = vi.fn();
    const { invalidate } = renderWithClient(<BoardUserManager open board={{ id: 9, name: "Sales" }} onClose={onClose} />);

    // Order users tab (default): every user from both pages is listed.
    expect(await screen.findByRole("checkbox", { name: new RegExp("^Zura K") })).toBeInTheDocument();
    expect(box("Ana")).not.toBeChecked();
    await user.click(box("Ana"));

    await user.click(screen.getByRole("tab", { name: `${T}.boardUsers` }));
    expect(box("Beka")).toBeChecked();
    await user.click(box("Zura K"));

    await user.click(screen.getByRole("tab", { name: `${T}.boardGroups` }));
    await user.click(box("Support team"));

    await user.click(screen.getByRole("button", { name: `${T}.save` }));
    await waitFor(() => expect(patch).toHaveBeenCalled());
    expect(patch.mock.calls[0][0]).toEqual({ order_user_ids: [1], board_user_ids: [2, 3], board_group_ids: [5] });
    expect(toastMock.success).toHaveBeenCalledWith(`${T}.saved`);
    expect(onClose).toHaveBeenCalled();
    expect(invalidatedKeys(invalidate)).toContainEqual(["boards"]);
  });

  it("explains that a board with nobody selected is open to everyone", async () => {
    routes({});
    renderWithClient(<BoardUserManager open board={{ id: 9 }} onClose={vi.fn()} />);
    expect(await screen.findByTestId("open-board-hint")).toHaveTextContent(`${T}.openBoardHint`);
  });

  it("filters the list by search and can unselect", async () => {
    const user = userEvent.setup();
    const patch = routes({ order_users: [u(1, "Ana")] });
    renderWithClient(<BoardUserManager open board={{ id: 9 }} onClose={vi.fn()} />);
    await screen.findByRole("checkbox", { name: new RegExp("^Zura K") });
    await user.type(screen.getByRole("textbox", { name: `${T}.search` }), "zur");
    expect(screen.queryByRole("checkbox", { name: new RegExp("^Beka") })).not.toBeInTheDocument();
    await user.clear(screen.getByRole("textbox", { name: `${T}.search` }));
    await user.click(box("Ana"));
    await user.click(screen.getByRole("button", { name: `${T}.save` }));
    await waitFor(() => expect(patch).toHaveBeenCalled());
    expect(patch.mock.calls[0][0]).toMatchObject({ order_user_ids: [] });
  });

  it("toasts a translated error when saving fails", async () => {
    const user = userEvent.setup();
    routes({}, vi.fn(() => {
      throw Object.assign(new Error("x"), { response: { status: 400 } });
    }));
    const onClose = vi.fn();
    renderWithClient(<BoardUserManager open board={{ id: 9 }} onClose={onClose} />);
    await screen.findByRole("checkbox", { name: new RegExp("^Ana") });
    await user.click(screen.getByRole("button", { name: `${T}.save` }));
    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith(`${T}.saveError`));
    expect(onClose).not.toHaveBeenCalled();
  });
});
