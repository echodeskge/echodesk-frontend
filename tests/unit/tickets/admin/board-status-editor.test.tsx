import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
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
import { BoardStatusEditor } from "@/components/tickets-admin/board-status-editor";
import { HttpError, invalidatedKeys, renderWithClient, routeAxios, type Routes } from "./test-utils";

const ax = axios as unknown as Parameters<typeof routeAxios>[0];
const C = "tickets.boardAdmin.columns";
const E = "tickets.boardStatusEditor";

const col = (id: number, name: string, extra: Record<string, unknown> = {}) => ({
  id,
  name,
  description: "",
  color: "#6b7280",
  position: id - 1,
  is_default: false,
  is_closed_status: false,
  track_time: false,
  board: 4,
  tickets_count: 0,
  ...extra,
});

const COLUMNS = [
  col(2, "Doing", { position: 1, track_time: true, tickets_count: 3, color: "#f97316" }),
  col(1, "Todo", { position: 0, is_default: true, tickets_count: 1 }),
  col(3, "Done", { position: 2, is_closed_status: true }),
];

function setup(routes: Routes = {}) {
  routeAxios(ax, { "GET /api/columns/": { count: 3, next: null, results: COLUMNS }, ...routes });
  return renderWithClient(<BoardStatusEditor open board={{ id: 4, name: "Support" }} onClose={vi.fn()} />);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("BoardStatusEditor", () => {
  it("lists the columns in position order with badges and ticket counts", async () => {
    setup();
    const list = await screen.findByRole("list", { name: `${C}.title` });
    const rows = within(list).getAllByRole("listitem");
    expect(rows.map((r) => r.textContent?.match(/Todo|Doing|Done/)?.[0])).toEqual(["Todo", "Doing", "Done"]);
    expect(within(rows[0]).getByText(`${E}.defaultBadge`)).toBeInTheDocument();
    expect(within(rows[1]).getByText(`${E}.trackTimeBadge`)).toBeInTheDocument();
    expect(within(rows[1]).getByText(`${C}.ticketsCount:{"count":3}`)).toBeInTheDocument();
    expect(within(rows[2]).getByText(`${E}.closedBadge`)).toBeInTheDocument();
    expect((ax.get as ReturnType<typeof vi.fn>).mock.calls[0][1]).toMatchObject({ params: { board: 4, page_size: 100 } });
  });

  it("creates a column with every field and the board id", async () => {
    const user = userEvent.setup();
    const post = vi.fn((b: unknown) => ({ id: 9, ...(b as object) }));
    const { invalidate } = setup({ "POST /api/columns/": post });
    await screen.findByRole("list", { name: `${C}.title` });
    await user.click(screen.getByRole("button", { name: `${C}.add` }));

    await user.type(screen.getByLabelText(`${E}.nameLabel`), "Review");
    await user.type(screen.getByLabelText(`${E}.descriptionLabel`), "QA");
    await user.click(screen.getByRole("radio", { name: "#8b5cf6" }));
    await user.click(screen.getByLabelText(`${E}.closedStatusCheckbox`));
    await user.click(screen.getByLabelText(`${E}.trackTimeCheckbox`));
    await user.click(screen.getByRole("button", { name: `${E}.create` }));

    await waitFor(() => expect(post).toHaveBeenCalled());
    expect(post.mock.calls[0][0]).toEqual({
      name: "Review",
      description: "QA",
      color: "#8b5cf6",
      position: 3,
      is_default: false,
      is_closed_status: true,
      track_time: true,
      board: 4,
    });
    expect(toastMock.success).toHaveBeenCalledWith("tickets.toasts.columnCreated");
    const keys = invalidatedKeys(invalidate);
    expect(keys).toContainEqual(["kanbanBoard", 4]);
    expect(keys).toContainEqual(["ticketColumns", 4]);
    // Back on the list
    expect(await screen.findByRole("list", { name: `${C}.title` })).toBeInTheDocument();
  });

  it("edits a column with PUT and keeps every existing flag, including track_time", async () => {
    const user = userEvent.setup();
    const put = vi.fn((b: unknown) => b);
    setup({ "PUT /api/columns/2/": put });
    await user.click(await screen.findByRole("button", { name: `${C}.edit:{"name":"Doing"}` }));

    const name = screen.getByLabelText(`${E}.nameLabel`);
    expect(name).toHaveValue("Doing");
    expect(screen.getByLabelText(`${E}.trackTimeCheckbox`)).toBeChecked();
    await user.clear(name);
    await user.type(name, "In progress");
    const position = screen.getByLabelText(`${E}.positionLabel`);
    await user.clear(position);
    await user.type(position, "2");
    await user.click(screen.getByRole("button", { name: `${E}.update` }));

    await waitFor(() => expect(put).toHaveBeenCalled());
    expect(put.mock.calls[0][0]).toEqual({
      name: "In progress",
      description: "",
      color: "#f97316",
      position: 2,
      is_default: false,
      is_closed_status: false,
      track_time: true,
    });
    expect(toastMock.success).toHaveBeenCalledWith("tickets.toasts.columnUpdated");
  });

  it("deletes through an AlertDialog, not window.confirm", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm");
    const del = vi.fn(() => null);
    setup({ "DELETE /api/columns/3/": del });
    await user.click(await screen.findByRole("button", { name: `${C}.delete:{"name":"Done"}` }));

    const alert = await screen.findByRole("alertdialog");
    expect(alert).toHaveTextContent(`${C}.deleteConfirm:{"name":"Done"}`);
    await user.click(within(alert).getByRole("button", { name: "common.delete" }));
    await waitFor(() => expect(del).toHaveBeenCalled());
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(toastMock.success).toHaveBeenCalledWith("tickets.toasts.columnDeleted");
  });

  it("shows the 'column has tickets' message when the server refuses (400)", async () => {
    const user = userEvent.setup();
    setup({ "DELETE /api/columns/2/": () => new HttpError(400, { error: "Cannot delete column with tickets." }) });
    await user.click(await screen.findByRole("button", { name: `${C}.delete:{"name":"Doing"}` }));
    const alert = await screen.findByRole("alertdialog");
    await user.click(within(alert).getByRole("button", { name: "common.delete" }));
    await waitFor(() => expect(within(alert).getByRole("alert")).toHaveTextContent(`${C}.hasTickets`));
    expect(toastMock.error).toHaveBeenCalledWith(`${C}.hasTickets`);
  });
});
