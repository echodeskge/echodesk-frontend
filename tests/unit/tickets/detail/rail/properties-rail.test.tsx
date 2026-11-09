/**
 * FE-12 properties rail: one case per row (plan §5.2 FE-12), the gates from
 * `viewer_permissions`, the order of the rows and the fixed rows.
 */
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import React from "react";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { useQuery } from "@tanstack/react-query";

const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() }));
const presence = vi.hoisted(() => ({ editing: vi.fn(), stopped: vi.fn() }));

vi.mock("next/navigation", async () => (await import("../helpers")).navigationMock);
vi.mock("@/api/axios", () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));
vi.mock("sonner", () => ({ toast: toastMock }));
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
    sendTicketEditing: presence.editing,
    sendTicketEditingStopped: presence.stopped,
  }),
  useBoardEvents: () => {},
}));

import axios from "@/api/axios";
import { PropertiesRail } from "@/app/(tenant)/tickets/[id]/_components/rail/properties-rail";
import { assigneeState } from "@/app/(tenant)/tickets/[id]/_components/rail/assignees-row";
import { tk } from "@/app/(tenant)/tickets/_lib/query-keys";
import type { TicketDetail, ViewerPermissions } from "@/app/(tenant)/tickets/_lib/types";
import { BOARDS, COLUMNS, PERMS_AGENT, PERMS_ALL, httpError, makeTicket, newClient, page, routeAxios, type Route } from "../helpers";
import { DEPARTMENTS, GROUPS, OPEN_BOARD_ACCESS, TAGS, USERS, findOption, option, optionLabels, options, renderRail, rowOf, trigger } from "./rail-helpers";

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

type Routes = Parameters<typeof routeAxios>[1];

function setup({
  ticket = makeTicket(),
  perms = PERMS_ALL as ViewerPermissions,
  routes = {},
  locale = "en" as "en" | "ka",
}: { ticket?: TicketDetail; perms?: ViewerPermissions; routes?: Routes; locale?: "en" | "ka" } = {}) {
  const patchTicket: Route = (_u, body) => {
    const b = body as Record<string, unknown>;
    return {
      ...ticket,
      ...b,
      ...(b.assigned_to_id === 0 ? { assigned_to: null } : {}),
      ...("customer_id" in b
        ? { customer: b.customer_id ? { id: b.customer_id, name: "Tamar Gelashvili", email: "tamar@example.ge", phone: "" } : null }
        : {}),
    };
  };
  routeAxios(axios, {
    get: {
      "/api/columns/": () => page(COLUMNS),
      "/api/users/": () => page(USERS),
      "/api/boards/1/": () => OPEN_BOARD_ACCESS,
      "/api/boards/": () => page(BOARDS),
      "/api/tags/": () => page(TAGS),
      "/api/tenant-groups/": () => page(GROUPS),
      "/api/departments/": () => page(DEPARTMENTS),
      "/api/social/clients/": () => page([{ id: 9, name: "Tamar Gelashvili", email: "tamar@example.ge", phone: "+995599123456" }]),
      ...routes.get,
    },
    patch: { "/api/tickets/10/": patchTicket, ...routes.patch },
    post: { ...routes.post },
    delete: { ...routes.delete },
  });
  const client = newClient();
  const withPerms = { ...ticket, viewer_permissions: perms };
  client.setQueryData(tk.ticket(10), withPerms);
  function Harness() {
    const { data } = useQuery({ queryKey: tk.ticket(10), queryFn: () => withPerms, staleTime: Infinity });
    return <PropertiesRail ticket={data ?? withPerms} perms={perms} />;
  }
  const utils = renderRail(<Harness />, { client, locale });
  return { ...utils, client };
}

const patchCalls = () => vi.mocked(axios.patch).mock.calls.filter(([url]) => url === "/api/tickets/10/");

beforeEach(() => vi.clearAllMocks());

describe("PropertiesRail layout", () => {
  it("rows follow the §3 order, padding 8px 12px, then the fixed rows", () => {
    setup({ ticket: makeTicket({ customer: { id: 9, name: "Tamar", email: null, phone: "" } }) });
    const labels = Array.from(document.querySelectorAll('[data-slot="rail-rows"] > [data-slot="property-row"] > span:first-child')).map(
      (s) => s.textContent,
    );
    expect(labels).toEqual([
      "Status",
      "Priority",
      "Assignees",
      "Groups",
      "Labels",
      "Department",
      "Board",
      "Customer",
      "Due date",
      "Reporter",
      "Created",
    ]);
    expect(document.querySelector('[data-slot="rail-rows"]')!.className).toContain("px-3 py-2");
    // FE-13's TimeRow sits between Due date and Reporter.
    const rows = document.querySelector('[data-slot="rail-rows"]')!;
    const time = rows.querySelector('[data-slot="time-row"]')!;
    expect(time.previousElementSibling).toBe(rowOf("Due date"));
    expect(time.nextElementSibling).toBe(rowOf("Reporter"));
  });

  it("Reporter and Created are fixed rows; Created uses the ka date (no forced en-US, W85)", () => {
    setup({
      locale: "ka",
      ticket: makeTicket({ reporter: { id: 4, name: "Nino Beridze", initials: "NB", email: "n@x.ge" }, created_at: "2026-11-05T10:00:00Z" }),
    });
    expect(screen.getByTestId("rail-reporter")).toHaveTextContent("NBNino Beridze");
    expect(rowOf("ავტორი")!.className).toContain("py-[9px]");
    expect(screen.getByTestId("rail-created")).toHaveTextContent("5 ნოე");
  });

  it("Reporter falls back to created_by when the backend has no reporter", () => {
    setup({ ticket: makeTicket({ reporter: null, created_by: { id: 2, email: "g@x.ge", first_name: "Giorgi", last_name: "G." } }) });
    expect(screen.getByTestId("rail-reporter")).toHaveTextContent("Giorgi G.");
  });
});

describe("Status", () => {
  it("lists the board's columns (paged) and moves without a position (W77)", async () => {
    const { client } = setup({
      routes: { patch: { "/api/tickets/10/move_to_column/": (_u, b) => makeTicket({ column: { ...COLUMNS[0], id: (b as { column_id: number }).column_id } as never }) } },
    });
    await waitFor(() => expect(vi.mocked(axios.get)).toHaveBeenCalledWith("/api/columns/", expect.objectContaining({ params: expect.objectContaining({ board: 1, page_size: 100 }) })));
    fireEvent.click(trigger("Status")!);
    await waitFor(() => expect(optionLabels()).toEqual(["To do", "In progress", "Done"]));
    fireEvent.click(option("To do")!);
    expect(client.getQueryData<TicketDetail>(tk.ticket(10))?.column.id).toBe(11);
    await waitFor(() =>
      expect(vi.mocked(axios.patch)).toHaveBeenCalledWith("/api/tickets/10/move_to_column/", { column_id: 11 }, expect.anything()),
    );
    expect(presence.editing).toHaveBeenCalledWith(10, "status");
  });

  it("closed columns are disabled without can_move_to_closed", async () => {
    setup({ perms: { ...PERMS_AGENT, can_edit: true } });
    fireEvent.click(trigger("Status")!);
    await waitFor(() => expect(options()).toHaveLength(3));
    expect(option("Done")).toHaveAttribute("data-disabled", "true");
    expect(option("To do")).not.toHaveAttribute("data-disabled", "true");
  });
});

describe("Priority", () => {
  it("offers the 4 backend values with their colours and PATCHes priority (E17)", async () => {
    setup();
    fireEvent.click(trigger("Priority")!);
    await waitFor(() => expect(optionLabels()).toEqual(["Critical", "High", "Medium", "Low"]));
    expect(option("Medium")).toHaveStyle({ color: "#fd7e14" });
    expect(option("Critical")).toHaveStyle({ color: "#dc3545" });
    fireEvent.click(option("Low")!);
    await waitFor(() => expect(patchCalls()[0][1]).toEqual({ priority: "low" }));
  });

  it("is read-only without can_edit", () => {
    setup({ perms: { ...PERMS_AGENT, can_edit: false } });
    expect(trigger("Priority")).toBeDisabled();
  });
});

describe("Assignees", () => {
  const ticket = makeTicket({
    assigned_to: { id: 3, email: "agent@demo.ge", first_name: "Levan", last_name: "Maisuradze" },
    assigned_users: [{ id: 3, email: "agent@demo.ge", first_name: "Levan", last_name: "Maisuradze" }],
    assignments: [
      { id: 1, user: { id: 3, email: "agent@demo.ge", first_name: "Levan", last_name: "Maisuradze" }, role: "primary", assigned_at: "", assigned_by: null },
    ],
  });

  it("pills carry the role; users are filtered by board access and paged", async () => {
    setup({ ticket });
    const pill = trigger("Assignees")!.querySelector('[data-user-id="3"]')!;
    expect(pill).toHaveAttribute("data-role", "primary");
    expect(pill).toHaveAttribute("title", "Levan Maisuradze: Primary");
    // Short name in the 20px pill (design B: "Levan M."); full names in the options.
    expect(pill).toHaveTextContent("Levan M.");
    expect(pill.querySelector('[data-slot="assignee-role-badge"]')).toHaveAccessibleName("Primary");
    fireEvent.click(trigger("Assignees")!);
    await waitFor(() => expect(options().length).toBe(3));
    expect(vi.mocked(axios.get)).toHaveBeenCalledWith("/api/users/", expect.objectContaining({ params: expect.objectContaining({ page_size: 100 }) }));
  });

  it("adding a user sends assigned_user_ids (E5 diff on the server)", async () => {
    setup({ ticket });
    fireEvent.click(trigger("Assignees")!);
    await waitFor(() => expect(option("Nino Beridze")).not.toBeNull());
    fireEvent.click(option("Nino Beridze")!);
    await waitFor(() => expect(patchCalls()[0][1]).toEqual({ assigned_user_ids: [3, 4] }));
  });

  it("the role select sends assigned_user_ids plus assignment_roles", async () => {
    setup({ ticket });
    fireEvent.click(trigger("Assignees")!);
    const select = await screen.findByTestId("assignee-role-3");
    expect(within(select).getAllByRole("option").map((o) => o.textContent)).toEqual(["Primary", "Collaborator", "Reviewer", "Observer"]);
    fireEvent.change(select, { target: { value: "reviewer" } });
    await waitFor(() => expect(patchCalls()[0][1]).toEqual({ assigned_user_ids: [3], assignment_roles: { "3": "reviewer" } }));
  });

  it("removing a legacy-only assigned_to chip clears assigned_to (fixes W79)", async () => {
    const legacy = makeTicket({ assigned_to: { id: 5, email: "giorgi@demo.ge", first_name: "Giorgi", last_name: "Kapanadze" } });
    expect(assigneeState(legacy).legacy?.id).toBe(5);
    const { client } = setup({ ticket: legacy });
    expect(trigger("Assignees")!.querySelector('[data-user-id="5"]')).toHaveAttribute("data-role", "legacy");
    fireEvent.click(trigger("Assignees")!);
    await waitFor(() => expect(option("Giorgi Kapanadze")).not.toBeNull());
    fireEvent.click(option("Giorgi Kapanadze")!);
    // 0, not null: the serializer reads a null assigned_to_id as "unchanged".
    await waitFor(() => expect(patchCalls()[0][1]).toEqual({ assigned_to_id: 0 }));
    expect(client.getQueryData<TicketDetail>(tk.ticket(10))?.assigned_to).toBeNull();
  });

  it("removing the assigned_to user who also has a row clears assigned_to too (staff)", async () => {
    setup({ ticket });
    fireEvent.click(trigger("Assignees")!);
    await waitFor(() => expect(option("Levan Maisuradze")).not.toBeNull());
    fireEvent.click(option("Levan Maisuradze")!);
    await waitFor(() => expect(patchCalls()[0][1]).toEqual({ assigned_user_ids: [], assigned_to_id: 0 }));
  });

  it("non-staff editors keep assigned_to (server-side staff-only) and can't drop the legacy chip", async () => {
    const legacy = makeTicket({ assigned_to: { id: 5, email: "giorgi@demo.ge", first_name: "Giorgi", last_name: "Kapanadze" } });
    setup({ ticket: legacy, perms: { ...PERMS_AGENT, can_edit: true } });
    fireEvent.click(trigger("Assignees")!);
    await waitFor(() => expect(option("Giorgi Kapanadze")).not.toBeNull());
    expect(option("Giorgi Kapanadze")).toHaveAttribute("data-disabled", "true");
  });

  it("editing is gated by can_assign / can_edit", () => {
    setup({ ticket, perms: { ...PERMS_AGENT, can_edit: false, can_assign: false } });
    expect(trigger("Assignees")).toBeDisabled();
  });
});

describe("Groups", () => {
  it("hidden unless can_change_groups (staff, WS10)", () => {
    setup({ perms: { ...PERMS_ALL, can_change_groups: false } });
    expect(rowOf("Groups")).toBeNull();
  });

  it("multi-select with Apply → assigned_group_ids", async () => {
    setup();
    fireEvent.click(trigger("Groups")!);
    await waitFor(() => expect(option("Support team")).not.toBeNull());
    fireEvent.click(option("Support team")!);
    fireEvent.click(option("Sales team")!);
    expect(patchCalls()).toHaveLength(0);
    fireEvent.click(screen.getByTestId("groups-picker-apply"));
    await waitFor(() => expect(patchCalls()[0][1]).toEqual({ assigned_group_ids: [6, 7] }));
  });
});

describe("Labels", () => {
  it("keeps the Apply step: toggles edit a draft, Apply sends tag_ids, closing drops it", async () => {
    setup({ ticket: makeTicket({ tags: [{ id: 1, name: "Bug", color: "#ef4444" }] }) });
    fireEvent.click(trigger("Labels")!);
    await waitFor(() => expect(option("VIP")).not.toBeNull());
    fireEvent.click(option("VIP")!);
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    await waitFor(() => expect(options()).toHaveLength(0));
    expect(patchCalls()).toHaveLength(0);
    expect(trigger("Labels")!.textContent).toBe("Bug");

    fireEvent.click(trigger("Labels")!);
    await waitFor(() => expect(option("VIP")).not.toBeNull());
    fireEvent.click(option("VIP")!);
    fireEvent.click(screen.getByTestId("labels-picker-apply"));
    await waitFor(() => expect(patchCalls()[0][1]).toEqual({ tag_ids: [1, 2] }));
  });

  it('"Manage labels…" opens LabelManagementDialog', async () => {
    setup();
    fireEvent.click(trigger("Labels")!);
    fireEvent.click(await screen.findByTestId("manage-labels"));
    expect(await screen.findByRole("dialog", { name: "Manage Labels" })).toBeInTheDocument();
  });
});

describe("Department", () => {
  it('lists departments with a translated "None" that clears it (W80)', async () => {
    setup({ locale: "ka", ticket: makeTicket({ assigned_department: { id: 20, name: "Billing", description: "" } }) });
    fireEvent.click(trigger("განყოფილება")!);
    await waitFor(() => expect(optionLabels()).toEqual(["არცერთი", "Billing", "Logistics"]));
    fireEvent.click(option("არცერთი")!);
    await waitFor(() => expect(patchCalls()[0][1]).toEqual({ assigned_department_id: 0 }));
  });
});

describe("Board", () => {
  it("hidden when !can_transfer (DC19)", () => {
    setup({ perms: { ...PERMS_ALL, can_transfer: false } });
    expect(rowOf("Board")).toBeNull();
  });

  it("picking another board confirms, then moves to its first column", async () => {
    setup({
      routes: { patch: { "/api/tickets/10/move_to_column/": (_u, b) => makeTicket({ column: { id: (b as { column_id: number }).column_id } as never }) } },
    });
    fireEvent.click(trigger("Board")!);
    await waitFor(() => expect(option("Sales")).not.toBeNull());
    routeAxios(axios, {
      get: { "/api/columns/": () => page([{ id: 31, name: "New", color: "#000", position: 0, board: 2 }]), "/api/boards/": () => page(BOARDS) },
      patch: { "/api/tickets/10/move_to_column/": () => makeTicket() },
    });
    fireEvent.click(option("Sales")!);
    const dialog = await screen.findByTestId("transfer-dialog");
    expect(dialog).toHaveTextContent("Sales");
    fireEvent.click(within(dialog).getByRole("button", { name: /transfer/i }));
    await waitFor(() =>
      expect(vi.mocked(axios.patch)).toHaveBeenCalledWith("/api/tickets/10/move_to_column/", { column_id: 31 }, expect.anything()),
    );
  });
});

describe("Customer", () => {
  it("hidden when !can_view_customer (R13)", () => {
    setup({ perms: { ...PERMS_ALL, can_view_customer: false } });
    expect(rowOf("Customer")).toBeNull();
  });

  it("searches clients and sets customer_id", async () => {
    setup();
    fireEvent.click(screen.getByTestId("customer-picker"));
    const input = await screen.findByPlaceholderText("Search clients");
    fireEvent.change(input, { target: { value: "tam" } });
    await waitFor(() =>
      expect(vi.mocked(axios.get)).toHaveBeenCalledWith("/api/social/clients/", { params: expect.objectContaining({ search: "tam", page_size: 20 }) }),
    );
    fireEvent.click(await waitFor(() => findOption("Tamar Gelashvili")));
    await waitFor(() => expect(patchCalls()[0][1]).toEqual({ customer_id: 9 }));
    expect(screen.getByTestId("customer-picker")).toHaveTextContent("Tamar Gelashvili");
  });

  it('"None" clears customer_id', async () => {
    setup({ ticket: makeTicket({ customer: { id: 9, name: "Tamar Gelashvili", email: null, phone: "" } }) });
    fireEvent.click(screen.getByTestId("customer-picker"));
    fireEvent.click(await waitFor(() => findOption("None")));
    await waitFor(() => expect(patchCalls()[0][1]).toEqual({ customer_id: null }));
  });

  it("read-only without can_edit", () => {
    setup({ perms: { ...PERMS_AGENT, can_edit: false, can_view_customer: true } });
    expect(screen.getByTestId("customer-picker")).toBeDisabled();
  });
});

describe("Due date (DC35)", () => {
  it("shows the value through format.ts in the app locale", () => {
    setup({ locale: "ka", ticket: makeTicket({ due_date: "2026-11-12" }) });
    expect(document.querySelector('[data-slot="due-date-trigger"]')).toHaveTextContent("12 ნოე");
  });

  it("clicking opens the native picker (showPicker, falling back to focus)", () => {
    setup({ ticket: makeTicket({ due_date: "2026-11-12" }) });
    const input = screen.getByTestId("due-date-input") as HTMLInputElement & { showPicker?: () => void };
    input.showPicker = vi.fn();
    fireEvent.click(document.querySelector('[data-slot="due-date-trigger"]')!);
    expect(input.showPicker).toHaveBeenCalled();

    delete input.showPicker;
    const focus = vi.spyOn(input, "focus");
    fireEvent.click(document.querySelector('[data-slot="due-date-trigger"]')!);
    expect(focus).toHaveBeenCalled();
  });

  it("writes due_date and clears it", async () => {
    setup({ ticket: makeTicket({ due_date: "2026-11-12" }) });
    fireEvent.change(screen.getByTestId("due-date-input"), { target: { value: "2026-11-20" } });
    await waitFor(() => expect(patchCalls()[0][1]).toEqual({ due_date: "2026-11-20" }));
    fireEvent.click(screen.getByTestId("due-date-clear"));
    await waitFor(() => expect(patchCalls()[1][1]).toEqual({ due_date: null }));
  });

  it("overdue shows the overdue chip (icon plus text, never colour alone)", () => {
    setup({ ticket: makeTicket({ due_date: "2026-11-01", is_overdue_task: true }) });
    const t = document.querySelector('[data-slot="due-date-trigger"]')!;
    expect(t).toHaveAttribute("data-overdue", "true");
    expect(t).toHaveTextContent("Overdue · Nov 1");
    expect(t.className).toContain("text-destructive");
  });

  it("not set: placeholder and no clear button; read-only without can_edit", () => {
    setup({ perms: { ...PERMS_AGENT, can_edit: false } });
    expect(document.querySelector('[data-slot="due-date-trigger"]')).toHaveTextContent("Not set");
    expect(screen.queryByTestId("due-date-clear")).toBeNull();
    expect(document.querySelector('[data-slot="due-date-trigger"]')).toBeDisabled();
  });
});

describe("Errors", () => {
  it("a failed PATCH refetches the ticket and shows the translated toast", async () => {
    const { client } = setup({
      routes: {
        patch: {
          "/api/tickets/10/": () => {
            throw httpError(500);
          },
        },
      },
    });
    const spy = vi.spyOn(client, "invalidateQueries");
    fireEvent.click(trigger("Priority")!);
    await waitFor(() => expect(option("Low")).not.toBeNull());
    fireEvent.click(option("Low")!);
    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith("Couldn't save the change"));
    expect(spy).toHaveBeenCalledWith({ queryKey: tk.ticket(10) });
  });
});
