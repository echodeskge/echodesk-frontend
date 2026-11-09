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
import { BoardCreateSheet } from "@/components/tickets-admin/board-create-sheet";
import { COLOR_SWATCHES } from "@/components/tickets-admin/colors";
import { HttpError, invalidatedKeys, renderWithClient, routeAxios } from "./test-utils";

const ax = axios as unknown as Parameters<typeof routeAxios>[0];
const T = "tickets.boardAdmin";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("BoardCreateSheet", () => {
  it("offers 17 colour swatches plus a hex field", () => {
    renderWithClient(<BoardCreateSheet open onClose={vi.fn()} />);
    expect(COLOR_SWATCHES).toHaveLength(17);
    const group = screen.getByRole("radiogroup", { name: `${T}.create.color` });
    expect(within(group).getAllByRole("radio")).toHaveLength(17);
    expect(within(group).getByRole("radio", { name: "#3b82f6" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByLabelText(`${T}.color.hex`)).toHaveValue("#3b82f6");
  });

  it("creates the board with name, description, colour and is_default, toasts and invalidates ['boards']", async () => {
    const user = userEvent.setup();
    const created = { id: 41, name: "Support", color: "#ef4444" };
    const post = vi.fn(() => created);
    routeAxios(ax, { "POST /api/boards/": post });
    const onClose = vi.fn();
    const onCreated = vi.fn();
    const { invalidate } = renderWithClient(<BoardCreateSheet open onClose={onClose} onCreated={onCreated} />);

    await user.type(screen.getByLabelText(`${T}.create.name`), "  Support ");
    await user.type(screen.getByLabelText(`${T}.create.description`), "Customer issues");
    await user.click(screen.getByRole("radio", { name: "#ef4444" }));
    await user.click(screen.getByRole("switch"));
    await user.click(screen.getByRole("button", { name: `${T}.create.submit` }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(post).toHaveBeenCalledWith(
      { name: "Support", description: "Customer issues", is_default: true, color: "#ef4444" },
      undefined,
    );
    expect(toastMock.success).toHaveBeenCalledWith(`${T}.create.success`);
    expect(invalidatedKeys(invalidate)).toContainEqual(["boards"]);
    expect(onCreated).toHaveBeenCalledWith(created);
  });

  it("accepts a typed hex colour and blocks submit while it is invalid", async () => {
    const user = userEvent.setup();
    const post = vi.fn(() => ({ id: 1, name: "Ops" }));
    routeAxios(ax, { "POST /api/boards/": post });
    renderWithClient(<BoardCreateSheet open onClose={vi.fn()} />);

    await user.type(screen.getByLabelText(`${T}.create.name`), "Ops");
    const hex = screen.getByLabelText(`${T}.color.hex`);
    await user.clear(hex);
    await user.type(hex, "12ab");
    expect(screen.getByText(`${T}.color.invalid`)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: `${T}.create.submit` })).toBeDisabled();

    await user.type(hex, "EF");
    expect(screen.queryByText(`${T}.color.invalid`)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: `${T}.create.submit` }));
    await waitFor(() => expect(post).toHaveBeenCalled());
    expect((post.mock.calls[0] as unknown[])[0]).toMatchObject({ name: "Ops", color: "#12abef", is_default: false });
  });

  it("shows a translated error and keeps the sheet open when the API fails", async () => {
    const user = userEvent.setup();
    routeAxios(ax, { "POST /api/boards/": () => new HttpError(500) });
    const onClose = vi.fn();
    renderWithClient(<BoardCreateSheet open onClose={onClose} />);

    await user.type(screen.getByLabelText(`${T}.create.name`), "X");
    await user.click(screen.getByRole("button", { name: `${T}.create.submit` }));

    expect(await screen.findByRole("alert")).toHaveTextContent(`${T}.create.error`);
    expect(toastMock.error).toHaveBeenCalledWith(`${T}.create.error`);
    expect(onClose).not.toHaveBeenCalled();
  });
});
