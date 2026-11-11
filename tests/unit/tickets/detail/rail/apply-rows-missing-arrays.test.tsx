/**
 * Sentry 1Q: "ticket.assigned_groups is not iterable" in GroupsRow. The
 * detail payload is typed with the arrays always present, but a partial
 * ticket (older serializer, optimistic/realtime patch) can arrive without
 * them. Both Apply rows must render as "none" instead of throwing.
 */
import { describe, it, expect, vi, beforeAll } from "vitest";
import React from "react";
import { screen } from "@testing-library/react";

vi.mock("next/navigation", async () => (await import("../helpers")).navigationMock);
vi.mock("@/api/axios", () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() } }));
vi.mock("@/services/auth", () => ({ authService: { isAuthenticated: () => true } }));
vi.mock("@/app/(tenant)/tickets/_contexts/tickets-realtime-context", () => ({
  useTicketsRealtime: () => ({
    wsReady: true,
    beingEdited: new Map(),
    beingMoved: new Map(),
    activeUsers: [],
    setBoardId: () => {},
    subscribe: () => () => {},
    sendTicketMoving: () => {},
    sendTicketEditing: () => {},
    sendTicketEditingStopped: () => {},
  }),
  useBoardEvents: () => {},
}));

import axios from "@/api/axios";
import { GroupsRow, LabelsRow } from "@/app/(tenant)/tickets/[id]/_components/rail/apply-rows";
import type { TicketDetail, ViewerPermissions } from "@/app/(tenant)/tickets/_lib/types";
import { PERMS_ALL, makeTicket, page, routeAxios } from "../helpers";
import { GROUPS, TAGS, renderRail } from "./rail-helpers";

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

function partialTicket(): TicketDetail {
  const ticket = makeTicket() as Partial<TicketDetail>;
  delete ticket.assigned_groups;
  delete ticket.tags;
  return ticket as TicketDetail;
}

function setup(ui: React.ReactElement) {
  routeAxios(axios, {
    get: {
      "/api/tags/": () => page(TAGS),
      "/api/tenant-groups/": () => page(GROUPS),
      "/api/users/": () => page([]),
      "/api/departments/": () => page([]),
      "/api/columns/": () => page([]),
    },
  });
  return renderRail(ui);
}

describe("Apply rows with the arrays missing from the ticket", () => {
  it("GroupsRow renders without assigned_groups", () => {
    setup(<GroupsRow ticket={partialTicket()} perms={PERMS_ALL as ViewerPermissions} />);
    // Renders the empty placeholder instead of throwing on the missing array.
    expect(screen.getByText("None")).toBeInTheDocument();
    expect(screen.getByText("Groups")).toBeInTheDocument();
  });

  it("LabelsRow renders without tags", () => {
    setup(<LabelsRow ticket={partialTicket()} perms={PERMS_ALL as ViewerPermissions} />);
    expect(screen.getByText("None")).toBeInTheDocument();
    expect(screen.getByText("Labels")).toBeInTheDocument();
  });
});
