/** FE-09 status track bar: steps, current underline, optimistic move, closed-step gate. */
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock("@/api/axios", () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));
vi.mock("sonner", () => ({ toast: toastMock }));

import axios from "@/api/axios";
import { StatusTrackBar, closedColumnIds } from "@/app/(tenant)/tickets/[id]/_components/status-track-bar";
import { tk } from "@/app/(tenant)/tickets/_lib/query-keys";
import type { TicketDetail } from "@/app/(tenant)/tickets/_lib/types";
import { COLUMNS, PERMS_AGENT, PERMS_ALL, httpError, makeTicket, newClient, page, renderDetail, routeAxios } from "./helpers";

function steps() {
  return Array.from(document.querySelectorAll<HTMLButtonElement>('[data-slot="status-step"]'));
}

function setup({ perms = PERMS_ALL, move }: { perms?: typeof PERMS_ALL; move?: () => unknown } = {}) {
  routeAxios(axios, {
    get: { "/api/columns/": () => page(COLUMNS) },
    patch: { "/api/tickets/10/move_to_column/": move ?? ((_u, body) => makeTicket({ column: { ...COLUMNS[0], id: (body as { column_id: number }).column_id } as never })) },
  });
  const client = newClient();
  const ticket = makeTicket({ viewer_permissions: perms });
  client.setQueryData(tk.ticket(10), ticket);
  function Harness() {
    const t = client.getQueryData<TicketDetail>(tk.ticket(10)) ?? ticket;
    return <StatusTrackBar ticket={t} perms={perms} />;
  }
  const utils = renderDetail(<Harness />, { client });
  return { ...utils, client };
}

beforeEach(() => vi.clearAllMocks());

describe("StatusTrackBar", () => {
  it("one step per column, in order, with the current step underlined", async () => {
    setup();
    await waitFor(() => expect(steps()).toHaveLength(3));
    expect(steps().map((s) => s.textContent)).toEqual([expect.stringContaining("To do"), expect.stringContaining("In progress"), expect.stringContaining("Done")]);
    const current = steps()[1];
    expect(current).toHaveAttribute("aria-current", "step");
    expect(current.querySelector('[data-slot="status-step-underline"]')).toHaveStyle({ background: "#f59e0b" });
    expect(steps()[0]).toHaveAttribute("data-state", "done");
    expect(screen.getByRole("navigation", { name: "Status" })).toBeInTheDocument();
  });

  it("a click moves the ticket at once, then calls move_to_column", async () => {
    const { client } = setup();
    await waitFor(() => expect(steps()).toHaveLength(3));
    await userEvent.click(steps()[0]);
    expect(client.getQueryData<TicketDetail>(tk.ticket(10))?.column.id).toBe(11);
    await waitFor(() =>
      expect(vi.mocked(axios.patch)).toHaveBeenCalledWith("/api/tickets/10/move_to_column/", { column_id: 11 }, expect.anything()),
    );
  });

  it("on error: refetches the ticket and shows the translated toast", async () => {
    const { client } = setup({
      move: () => {
        throw httpError(500);
      },
    });
    const spy = vi.spyOn(client, "invalidateQueries");
    await waitFor(() => expect(steps()).toHaveLength(3));
    await userEvent.click(steps()[0]);
    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith("Couldn't move the ticket"));
    expect(spy).toHaveBeenCalledWith({ queryKey: tk.ticket(10) });
  });

  it("closed steps are disabled without can_move_to_closed; the others stay enabled", async () => {
    setup({ perms: PERMS_AGENT });
    await waitFor(() => expect(steps()).toHaveLength(3));
    expect(steps()[2]).toBeDisabled();
    expect(steps()[0]).toBeEnabled();
    expect(closedColumnIds(COLUMNS, PERMS_ALL)).toEqual([]);
    expect(closedColumnIds(COLUMNS, PERMS_AGENT)).toEqual([13]);
  });

  it("step titles are translated (ka)", async () => {
    routeAxios(axios, { get: { "/api/columns/": () => page(COLUMNS) } });
    const ticket = makeTicket();
    renderDetail(<StatusTrackBar ticket={ticket} perms={PERMS_ALL} />, { locale: "ka" });
    await waitFor(() => expect(steps()).toHaveLength(3));
    expect(steps()[0].title).not.toContain("Move to");
  });
});
