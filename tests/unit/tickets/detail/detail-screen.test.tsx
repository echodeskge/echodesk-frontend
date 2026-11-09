/**
 * FE-09 detail screen: states, panes, realtime wiring, and the page's flag
 * switch between the new screen and the old `ticket-detail/*` one.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { screen, waitFor, render } from "@testing-library/react";

vi.mock("next/navigation", async () => (await import("./helpers")).navigationMock);
vi.mock("@/api/axios", () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));
vi.mock("@/services/auth", () => ({ authService: { isAuthenticated: () => true } }));
vi.mock("@/hooks/useUserProfile", () => ({ useUserProfile: () => ({ data: { id: 1, is_staff: true } }) }));
vi.mock("@/app/(tenant)/tickets/_contexts/tickets-realtime-context", async () => (await import("./helpers")).realtimeMock);
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock("@/components/ticket-detail/TicketDetailPage", () => ({
  TicketDetailPage: () => <div data-testid="legacy-detail" />,
}));

import axios from "@/api/axios";
import TicketPage from "@/app/(tenant)/tickets/[id]/page";
import { DetailScreen, detailState, parseTicketId } from "@/app/(tenant)/tickets/[id]/_components/detail-screen";
import { flags } from "@/app/(tenant)/tickets/_lib/flags";
import {
  BOARDS,
  COLUMNS,
  httpError,
  makeTicket,
  page,
  renderDetail,
  resetNav,
  resetRealtime,
  routeAxios,
  rt,
  type Route,
} from "./helpers";

function routes(ticket: Route = () => makeTicket()) {
  routeAxios(axios, {
    get: {
      "/api/tickets/10/navigation/": () => ({ index: 2, total: 5, prev_id: 9, next_id: 11 }),
      "/api/tickets/10/": ticket,
      "/api/columns/": () => page(COLUMNS),
      "/api/boards/": () => page(BOARDS),
    },
  });
}

beforeEach(() => {
  resetNav("board=1&priority=high");
  resetRealtime();
  flags.detailRedesignEnabled = false;
});

afterEach(() => {
  flags.detailRedesignEnabled = false;
});

describe("parseTicketId / detailState", () => {
  it("parses positive integer ids only", () => {
    expect(parseTicketId("12")).toBe(12);
    expect(parseTicketId(["7"])).toBe(7);
    expect(parseTicketId("0")).toBeNull();
    expect(parseTicketId("abc")).toBeNull();
    expect(parseTicketId(undefined)).toBeNull();
  });

  it("maps errors to states", () => {
    expect(detailState({ isError: false }, true)).toBe("loading");
    expect(detailState({ isError: true, error: httpError(404) }, true)).toBe("not-found");
    expect(detailState({ isError: true, error: httpError(403) }, true)).toBe("forbidden");
    expect(detailState({ isError: true, error: httpError(500) }, true)).toBe("error");
    expect(detailState({ isError: false, data: {} }, true)).toBe("ready");
    expect(detailState({ isError: false }, false)).toBe("not-found");
  });
});

describe("DetailScreen", () => {
  it("shows the loading skeleton", () => {
    routes(() => new Promise(() => {}));
    const { container } = renderDetail(<DetailScreen ticketId={10} />);
    expect(screen.getByTestId("ticket-detail")).toHaveAttribute("data-state", "loading");
    expect(container.querySelector('[data-slot="detail-skeleton"]')).not.toBeNull();
  });

  it("404: translated 'not found' with a way back to the board and its filters", async () => {
    routes(() => {
      throw httpError(404);
    });
    renderDetail(<DetailScreen ticketId={10} />);
    expect(await screen.findByText("This ticket doesn't exist or you can't see it")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to tickets" })).toHaveAttribute("href", "/tickets?board=1&priority=high");
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
  });

  it("403: translated 'forbidden' (ka)", async () => {
    routes(() => {
      throw httpError(403);
    });
    renderDetail(<DetailScreen ticketId={10} />, { locale: "ka" });
    expect(await screen.findByText("ამ ბილეთზე წვდომა არ გაქვთ")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "ბილეთებზე დაბრუნება" })).toBeInTheDocument();
  });

  it("other errors offer Retry", { timeout: 10_000 }, async () => {
    routes(() => {
      throw httpError(500);
    });
    renderDetail(<DetailScreen ticketId={10} />);
    // useTicket retries non-auth errors twice (1s + 2s back-off) before giving up.
    expect(await screen.findByText("Couldn't load the ticket", undefined, { timeout: 6000 })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("an invalid id is 'not found' without a request", () => {
    routes();
    renderDetail(<DetailScreen ticketId={0} />);
    expect(screen.getByText("This ticket doesn't exist or you can't see it")).toBeInTheDocument();
    expect(vi.mocked(axios.get).mock.calls.some(([u]) => String(u).startsWith("/api/tickets/"))).toBe(false);
  });

  it("renders two panes: a 780px main column and a 300px rail that stack below lg", async () => {
    routes();
    const { container } = renderDetail(<DetailScreen ticketId={10} />);
    await waitFor(() => expect(screen.getByTestId("ticket-detail")).toHaveAttribute("data-state", "ready"));

    const panes = container.querySelector('[data-slot="detail-panes"]')!;
    expect(panes.className).toMatch(/(^|\s)flex-col(\s|$)/);
    expect(panes.className).toContain("lg:flex-row");

    const column = container.querySelector('[data-slot="detail-column"]')!;
    expect(column.className).toContain("max-w-[780px]");
    expect(column.className).toContain("gap-[22px]");
    expect(column.querySelector('[data-slot="detail-main"]')).not.toBeNull();
    expect(column.querySelector('[data-slot="activity-feed"]')).not.toBeNull();

    const rail = container.querySelector('aside[data-slot="detail-rail"]')!;
    expect(rail.className).toContain("lg:w-[300px]");
    expect(rail.className).toContain("w-full");
    expect(rail.querySelector('[data-slot="properties-rail"]')).not.toBeNull();

    expect(container.querySelector('[data-slot="detail-composer"] [data-slot="composer"]')).not.toBeNull();
    expect(container.querySelector(".min-h-screen")).toBeNull();
  });

  it("connects the socket to the ticket's board and exposes data-ws-ready", async () => {
    routes();
    rt.wsReady = true;
    renderDetail(<DetailScreen ticketId={10} />);
    await waitFor(() => expect(rt.setBoardId).toHaveBeenCalledWith(1));
    expect(screen.getByTestId("ticket-detail")).toHaveAttribute("data-ws-ready", "true");
  });

  it("renders the status track with one step per column", async () => {
    routes();
    const { container } = renderDetail(<DetailScreen ticketId={10} />);
    await waitFor(() => expect(container.querySelectorAll('[data-slot="status-step"]')).toHaveLength(3));
  });

  it("fills the header slots (breadcrumb, icons)", async () => {
    routes();
    renderDetail(<DetailScreen ticketId={10} />);
    expect(await screen.findByTestId("detail-id")).toHaveTextContent("#10");
    expect(await screen.findByTestId("detail-position")).toHaveTextContent("2 of 5");
  });
});

describe("/tickets/[id] page flag", () => {
  it("renders the old detail while flags.detailRedesignEnabled is false", () => {
    routes();
    flags.detailRedesignEnabled = false;
    render(<TicketPage />);
    expect(screen.getByTestId("legacy-detail")).toBeInTheDocument();
    expect(screen.queryByTestId("ticket-detail")).toBeNull();
  });

  it("renders the new detail when the flag is on", async () => {
    routes();
    flags.detailRedesignEnabled = true;
    renderDetail(<TicketPage />);
    expect(screen.queryByTestId("legacy-detail")).toBeNull();
    await waitFor(() => expect(screen.getByTestId("ticket-detail")).toHaveAttribute("data-state", "ready"));
  });

  it("ships with the flag off (FE-INT turns it on in the W3 merge)", async () => {
    const mod = await vi.importActual<typeof import("@/app/(tenant)/tickets/_lib/flags")>("@/app/(tenant)/tickets/_lib/flags");
    // beforeEach resets it; the module default is false as well.
    expect(mod.flags.detailRedesignEnabled).toBe(false);
  });
});
