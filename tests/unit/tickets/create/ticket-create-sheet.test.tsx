/**
 * TicketCreateSheet (plan FE-14, W127): board and column resolution, the four
 * priorities, the create body (assignees with roles, labels, groups, due date,
 * customer behind the social feature), attachments after create with
 * per-file failures, the default form, invalidations and the "Open ticket"
 * toast, and translations in en and ka.
 */
import React from "react";
import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import en from "@/i18n/messages/en.json";
import ka from "@/i18n/messages/ka.json";
import pending from "@/i18n/pending/fe-14.json";

// ---------------------------------------------------------------------------
// mocks
// ---------------------------------------------------------------------------

const h = vi.hoisted(() => ({
  profile: { id: 1, is_staff: true, feature_keys: ["social_integrations"] } as Record<string, unknown>,
  push: vi.fn(),
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
  get: vi.fn(),
  post: vi.fn(),
  generated: {
    ticketFormsRetrieve: vi.fn(),
    itemListsRetrieve: vi.fn(),
    formSubmissionsCreate: vi.fn(),
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: h.push, replace: vi.fn() }),
  usePathname: () => "/email",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("sonner", () => ({ toast: h.toast }));
vi.mock("@/api/axios", () => ({ default: { get: h.get, post: h.post } }));
vi.mock("@/api/generated/api", () => h.generated);
vi.mock("@/hooks/useUserProfile", () => ({ useUserProfile: () => ({ data: h.profile }) }));
vi.mock("@/services/auth", () => ({ authService: { isAuthenticated: () => true } }));

vi.mock("@/components/RichTextEditor", () => ({
  RichTextEditor: ({ content, onChange, placeholder }: { content: string; onChange: (v: string) => void; placeholder?: string }) => (
    <textarea data-testid="rte" aria-label="description" placeholder={placeholder} value={content} onChange={(e) => onChange(e.target.value)} />
  ),
}));
vi.mock("@/components/FileDropzone", () => ({
  FileDropzone: ({ onFilesSelected, files }: { onFilesSelected: (f: File[]) => void; files?: { file: File }[] }) => (
    <div>
      <input
        data-testid="dropzone"
        type="file"
        multiple
        onChange={(e) => onFilesSelected(Array.from(e.target.files ?? []))}
      />
      <span data-testid="file-count">{files?.length ?? 0}</span>
    </div>
  ),
}));
vi.mock("@/components/LabelManagementDialog", () => ({
  LabelManagementDialog: () => <button type="button">manage-labels</button>,
}));
vi.mock("@/components/SignatureCanvas", () => ({ SignatureCanvas: () => <div data-testid="signature" /> }));
vi.mock("@/components/ui/date-picker", () => ({
  DatePicker: ({ id, value, onChange, placeholder }: { id?: string; value: string; onChange: (v: string) => void; placeholder?: string }) => (
    <input data-testid={id ?? "date"} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));
vi.mock("@/components/MultiUserAssignment", () => ({
  default: ({
    users = [],
    selectedAssignments = [],
    onChange,
  }: {
    users?: { id: number; email: string }[];
    selectedAssignments?: { userId: number; role: string }[];
    onChange: (a: { userId: number; role: string }[]) => void;
  }) => (
    <div data-testid="mua">
      {users.map((u) => (
        <button
          key={u.id}
          type="button"
          data-testid={`assign-${u.id}`}
          onClick={() => onChange([...selectedAssignments, { userId: u.id, role: u.id === 3 ? "primary" : "reviewer" }])}
        >
          {u.email}
        </button>
      ))}
      <span data-testid="assigned">{selectedAssignments.map((a) => `${a.userId}:${a.role}`).join(",")}</span>
    </div>
  ),
}));

import { TicketCreateProvider, useTicketCreate } from "@/contexts/TicketCreateContext";
import { BoardProvider } from "@/contexts/BoardContext";
import {
  TicketCreateSheet,
  buildCreateBody,
  resolveBoardId,
  resolveColumnId,
} from "@/components/TicketCreateSheet";
import { _resetMutations } from "@/app/(tenant)/tickets/_lib/mutation-id";

// ---------------------------------------------------------------------------
// fixtures
// ---------------------------------------------------------------------------

type Json = Record<string, unknown>;
function deepMerge(base: Json, extra: Json): Json {
  const out: Json = { ...base };
  for (const [k, v] of Object.entries(extra)) {
    const cur = out[k];
    out[k] = v && typeof v === "object" && cur && typeof cur === "object" ? deepMerge(cur as Json, v as Json) : v;
  }
  return out;
}
const messages = {
  en: deepMerge(en as Json, (pending as { en: Json }).en),
  ka: deepMerge(ka as Json, (pending as { ka: Json }).ka),
};

const BOARDS = [
  { id: 1, name: "Support", color: "#3b82f6", position: 0, is_default: true, open_count: 3, columns_count: 4 },
  { id: 2, name: "Sales", color: "#22c55e", position: 1, is_default: false, open_count: 1, columns_count: 1 },
];
const COLUMNS_B1_P1 = [
  { id: 10, name: "To Do", color: "#64748b", position: 0, is_default: false, is_closed_status: false, board: 1 },
  { id: 11, name: "In Progress", color: "#f59e0b", position: 1, is_default: true, is_closed_status: false, board: 1 },
];
const COLUMNS_B1_P2 = [
  { id: 12, name: "Waiting", color: "#a855f7", position: 2, is_default: false, is_closed_status: false, board: 1 },
  { id: 13, name: "Done", color: "#22c55e", position: 3, is_default: false, is_closed_status: true, board: 1 },
];
const COLUMNS_B2 = [{ id: 20, name: "Lead", color: "#0ea5e9", position: 0, is_default: false, is_closed_status: false, board: 2 }];
const USERS = [
  { id: 1, email: "admin@demo.ge", first_name: "Admin", last_name: "", is_staff: true, is_active: true },
  { id: 3, email: "agent@demo.ge", first_name: "Agent", last_name: "", is_staff: false, is_active: true },
  { id: 5, email: "other@demo.ge", first_name: "Other", last_name: "", is_staff: false, is_active: true },
];
const TAGS = [
  { id: 7, name: "VIP", color: "#ef4444" },
  { id: 8, name: "Bug", color: "#6366f1" },
];
const GROUPS = [{ id: 30, name: "Tier 1" }];

function page<T>(results: T[], next: string | null = null) {
  return { data: { count: results.length, next, previous: null, results } };
}

let forms: unknown[] = [];
let attachmentFails = new Set<string>();
let createStatus = 201;

function routeGet(url: string, config?: { params?: Record<string, unknown> }) {
  const p = config?.params ?? {};
  if (url === "/api/boards/") return page(BOARDS);
  if (url === "/api/boards/1/") return { data: { id: 1, name: "Support", board_users: [{ id: 3 }], board_groups: [], order_users: [] } };
  if (url === "/api/boards/2/") return { data: { id: 2, name: "Sales", board_users: [], board_groups: [], order_users: [] } };
  if (url === "/api/columns/") {
    if (p.board === 1) return p.page === 2 ? page(COLUMNS_B1_P2) : page(COLUMNS_B1_P1, "http://x/api/columns/?page=2");
    if (p.board === 2) return page(COLUMNS_B2);
    return page([]);
  }
  if (url === "/api/users/") return page(USERS);
  if (url === "/api/tags/") return page(TAGS);
  if (url === "/api/tenant-groups/") return page(GROUPS);
  if (url === "/api/departments/") return page([]);
  if (url === "/api/ticket-forms/") return page(forms);
  if (url === "/api/social/clients/") return page([{ id: 9, name: "Nino Beridze", phone: "+995597147515", email: "" }]);
  if (url === "/api/social/clients/9/") return { data: { id: 9, name: "Nino Beridze", phone: "+995597147515", email: "" } };
  throw new Error(`unexpected GET ${url}`);
}

function routePost(url: string, body: unknown) {
  if (url === "/api/tickets/") {
    if (createStatus >= 400) return Promise.reject({ response: { status: createStatus } });
    return Promise.resolve({ data: { id: 77, title: (body as Json).title } });
  }
  if (url === "/api/attachments/") {
    const file = (body as FormData).get("file") as File;
    if (attachmentFails.has(file.name)) return Promise.reject(new Error("upload failed"));
    return Promise.resolve({ data: { id: 1 } });
  }
  return Promise.reject(new Error(`unexpected POST ${url}`));
}

// ---------------------------------------------------------------------------
// harness
// ---------------------------------------------------------------------------

let ctx: ReturnType<typeof useTicketCreate>;
function Grab() {
  ctx = useTicketCreate();
  return null;
}

let qc: QueryClient;
function renderSheet(locale: "en" | "ka" = "en") {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <NextIntlClientProvider locale={locale} messages={messages[locale]} timeZone="Asia/Tbilisi">
        <TicketCreateProvider>
          <BoardProvider>
            <Grab />
            <TicketCreateSheet />
          </BoardProvider>
        </TicketCreateProvider>
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

function open(...args: Parameters<ReturnType<typeof useTicketCreate>["openTicketCreate"]>) {
  act(() => ctx.openTicketCreate(...args));
}

const sheet = () => screen.getByTestId("ticket-create-sheet");
const pickerIn = (cls: string) => sheet().querySelector(`.${cls}`) as HTMLButtonElement;
const submitBtn = () => screen.getByTestId("create-submit") as HTMLButtonElement;
const options = () => Array.from(document.querySelectorAll('[data-slot="property-picker-option"]')) as HTMLElement[];

async function typeTitle(text: string) {
  fireEvent.change(await screen.findByTestId("create-title"), { target: { value: text } });
}

async function waitColumn(name: string) {
  await waitFor(() => expect(pickerIn("create-column-picker")).toHaveTextContent(name));
}

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
  if (!URL.createObjectURL) (URL as unknown as { createObjectURL: () => string }).createObjectURL = () => "blob:x";
});

beforeEach(() => {
  vi.clearAllMocks();
  _resetMutations();
  try {
    localStorage.clear();
  } catch {
    /* ignore */
  }
  h.profile = { id: 1, is_staff: true, feature_keys: ["social_integrations"] };
  forms = [];
  attachmentFails = new Set();
  createStatus = 201;
  h.get.mockImplementation(async (url: string, config?: { params?: Record<string, unknown> }) => routeGet(url, config));
  h.post.mockImplementation((url: string, body: unknown) => routePost(url, body));
});

// ---------------------------------------------------------------------------
// pure helpers
// ---------------------------------------------------------------------------

describe("resolveBoardId / resolveColumnId", () => {
  it("prefers the passed board, then the app-selected one, then the default, then the first", () => {
    expect(resolveBoardId(BOARDS, 2, 1)).toBe(2);
    expect(resolveBoardId(BOARDS, null, 2)).toBe(2);
    expect(resolveBoardId(BOARDS, null, 99)).toBe(1);
    expect(resolveBoardId([{ id: 4, is_default: false }, { id: 5, is_default: false }], null, null)).toBe(4);
    expect(resolveBoardId([], null, null)).toBeNull();
  });

  it("keeps a current column of the board, else the default open column, else the first open one", () => {
    const cols = [...COLUMNS_B1_P1, ...COLUMNS_B1_P2];
    expect(resolveColumnId(cols, 12)).toBe(12);
    expect(resolveColumnId(cols, 999)).toBe(11);
    expect(resolveColumnId(cols, null)).toBe(11);
    expect(resolveColumnId([{ id: 1, is_closed_status: true, is_default: true }, { id: 2 }], null)).toBe(2);
    expect(resolveColumnId([{ id: 1, is_closed_status: true }], null)).toBe(1);
    expect(resolveColumnId([], null)).toBeNull();
  });

  it("buildCreateBody leaves empty optional fields out and maps roles", () => {
    const base = {
      title: "  Router  ",
      priority: "high" as const,
      columnId: 10,
      descriptionHtml: "<p></p>",
      tagIds: [],
      groupIds: [],
      assignments: [],
      dueDate: "",
      customerId: 9,
      includeCustomer: false,
    };
    expect(buildCreateBody(base)).toEqual({ title: "Router", priority: "high", column_id: 10 });
    expect(
      buildCreateBody({
        ...base,
        descriptionHtml: "<p><strong>Hi</strong></p>",
        tagIds: [7],
        groupIds: [30],
        assignments: [
          { userId: 5, role: "reviewer" },
          { userId: 3, role: "primary" },
        ],
        dueDate: "2026-11-20",
        includeCustomer: true,
      }),
    ).toEqual({
      title: "Router",
      priority: "high",
      column_id: 10,
      description: "<p><strong>Hi</strong></p>",
      rich_description: "<p><strong>Hi</strong></p>",
      description_format: "html",
      tag_ids: [7],
      assigned_group_ids: [30],
      assigned_to_id: 3,
      assigned_user_ids: [5, 3],
      assignment_roles: { "5": "reviewer", "3": "primary" },
      due_date: "2026-11-20",
      customer_id: 9,
    });
  });
});

// ---------------------------------------------------------------------------
// sheet
// ---------------------------------------------------------------------------

describe("TicketCreateSheet", () => {
  it("requires a title: Create stays disabled while it is empty or blank", async () => {
    renderSheet();
    open({ id: 1, name: "Support" } as never);
    await waitColumn("In Progress");
    expect(submitBtn()).toBeDisabled();
    await typeTitle("   ");
    expect(submitBtn()).toBeDisabled();
    await typeTitle("Printer jam");
    expect(submitBtn()).toBeEnabled();
    expect(screen.getByTestId("create-title")).toBeRequired();
  });

  it("offers exactly four priorities (no urgent) and defaults to medium", async () => {
    renderSheet();
    open({ id: 1, name: "Support" } as never);
    await waitColumn("In Progress");
    expect(pickerIn("create-priority-picker")).toHaveTextContent("Medium");
    fireEvent.click(pickerIn("create-priority-picker"));
    await waitFor(() => expect(options()).toHaveLength(4));
    expect(options().map((o) => o.textContent)).toEqual(["Critical", "High", "Medium", "Low"]);
    expect(screen.queryByText("Urgent")).toBeNull();
  });

  it("keeps the column it was opened with, even when it is on the second page of columns", async () => {
    renderSheet();
    open({ id: 1, name: "Support" } as never, { id: 12, name: "Waiting" } as never);
    await waitColumn("Waiting");
    expect(screen.getByTestId("create-sheet-context")).toHaveTextContent("Support·Waiting");
    expect(h.get).toHaveBeenCalledWith("/api/columns/", expect.objectContaining({ params: expect.objectContaining({ board: 1, page: 2 }) }));
    await typeTitle("Paged column");
    fireEvent.click(submitBtn());
    await waitFor(() => expect(h.post).toHaveBeenCalledWith("/api/tickets/", expect.anything(), expect.anything()));
    expect(h.post.mock.calls[0][1]).toMatchObject({ column_id: 12 });
  });

  it("opened with a board only (header New ticket): selects the board's default open column", async () => {
    renderSheet();
    open({ id: 1, name: "Support" } as never);
    await waitColumn("In Progress");
    expect(submitBtn()).toBeDisabled(); // only the title is missing
    await typeTitle("x");
    expect(submitBtn()).toBeEnabled();
  });

  it("opened with nothing (global +): uses the board selected in the app, else the default board", async () => {
    localStorage.setItem("echodesk_selected_board_id", "2");
    renderSheet();
    open();
    await waitColumn("Lead");
    expect(pickerIn("create-board-picker")).toHaveTextContent("Sales");
  });

  it("opened with nothing and no app selection: the default board and its default column", async () => {
    renderSheet();
    open();
    await waitColumn("In Progress");
    expect(pickerIn("create-board-picker")).toHaveTextContent("Support");
  });

  it("switching the board reloads its columns and picks that board's column", async () => {
    renderSheet();
    open({ id: 1, name: "Support" } as never, { id: 10, name: "To Do" } as never);
    await waitColumn("To Do");
    fireEvent.click(pickerIn("create-board-picker"));
    await waitFor(() => expect(options().length).toBe(2));
    fireEvent.click(options().find((o) => o.textContent === "Sales")!);
    await waitColumn("Lead");
    expect(h.get).toHaveBeenCalledWith("/api/columns/", expect.objectContaining({ params: expect.objectContaining({ board: 2 }) }));
  });

  it("shows a translated message when the board has no columns", async () => {
    h.get.mockImplementation(async (url: string, config?: { params?: Record<string, unknown> }) =>
      url === "/api/columns/" ? page([]) : routeGet(url, config),
    );
    renderSheet();
    open({ id: 1, name: "Support" } as never);
    expect(await screen.findByTestId("create-no-columns")).toHaveTextContent("This board has no columns");
    await typeTitle("x");
    expect(submitBtn()).toBeDisabled();
  });

  it("lists only users with access to the board (staff always)", async () => {
    renderSheet();
    open({ id: 1, name: "Support" } as never);
    await waitFor(() => expect(screen.getByTestId("assign-3")).toBeInTheDocument());
    expect(screen.getByTestId("assign-1")).toBeInTheDocument();
    expect(screen.queryByTestId("assign-5")).toBeNull();
  });

  it("posts title, priority, column, assignees with roles, labels, groups, due date and customer, with a mutation id", async () => {
    renderSheet();
    open({ id: 1, name: "Support" } as never, undefined, { customerId: 9, title: "Nino Beridze" });
    await waitColumn("In Progress");
    expect(screen.getByTestId("create-title")).toHaveValue("Nino Beridze");
    // customer pre-filled from opts.customerId
    await waitFor(() => expect(screen.getByTestId("create-customer")).toHaveTextContent("Nino Beridze"));

    fireEvent.click(pickerIn("create-priority-picker"));
    await waitFor(() => expect(options()).toHaveLength(4));
    fireEvent.click(options().find((o) => o.textContent === "High")!);

    await waitFor(() => expect(screen.getByTestId("assign-3")).toBeInTheDocument());
    fireEvent.click(screen.getByTestId("assign-3"));
    fireEvent.click(screen.getByTestId("assign-1"));

    fireEvent.click(pickerIn("create-labels-picker"));
    await waitFor(() => expect(options().map((o) => o.textContent)).toContain("VIP"));
    fireEvent.click(options().find((o) => o.textContent === "VIP")!);
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });

    await waitFor(() => expect(pickerIn("create-groups-picker")).toBeTruthy());
    fireEvent.click(pickerIn("create-groups-picker"));
    await waitFor(() => expect(options().map((o) => o.textContent)).toContain("Tier 1"));
    fireEvent.click(options().find((o) => o.textContent === "Tier 1")!);
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });

    fireEvent.change(screen.getByTestId("create-ticket-due"), { target: { value: "2026-11-20" } });
    fireEvent.change(screen.getByTestId("rte"), { target: { value: "<p><strong>Bold</strong></p>" } });

    fireEvent.click(submitBtn());
    await waitFor(() => expect(h.post).toHaveBeenCalledWith("/api/tickets/", expect.anything(), expect.anything()));
    const [, body, config] = h.post.mock.calls[0];
    expect(body).toEqual({
      title: "Nino Beridze",
      priority: "high",
      column_id: 11,
      description: "<p><strong>Bold</strong></p>",
      rich_description: "<p><strong>Bold</strong></p>",
      description_format: "html",
      tag_ids: [7],
      assigned_group_ids: [30],
      assigned_to_id: 3,
      assigned_user_ids: [3, 1],
      assignment_roles: { "3": "primary", "1": "reviewer" },
      due_date: "2026-11-20",
      customer_id: 9,
    });
    expect(config.headers["X-Client-Mutation"]).toMatch(/.+/);
  });

  it("hides the customer row without the social feature and never sends customer_id", async () => {
    h.profile = { id: 3, is_staff: false, feature_keys: ["tickets"], permissions_list: ["create_tickets"] };
    renderSheet();
    open({ id: 1, name: "Support" } as never, undefined, { customerId: 9 });
    await waitColumn("In Progress");
    expect(screen.queryByTestId("create-customer")).toBeNull();
    await typeTitle("No customer");
    fireEvent.click(submitBtn());
    await waitFor(() => expect(h.post).toHaveBeenCalled());
    expect(h.post.mock.calls[0][1]).not.toHaveProperty("customer_id");
  });

  it("links a customer through the client search and can remove it", async () => {
    renderSheet();
    open({ id: 1, name: "Support" } as never);
    await waitColumn("In Progress");
    const row = screen.getByTestId("create-customer");
    expect(row).toHaveTextContent("Link a client");
    fireEvent.click(within(row).getByRole("button"));
    const option = await screen.findByText("Nino Beridze");
    fireEvent.click(option);
    await waitFor(() => expect(row).toHaveTextContent("Nino Beridze"));
    fireEvent.click(within(row).getByRole("button", { name: "Remove customer" }));
    expect(row).toHaveTextContent("Link a client");
  });

  it("uploads attachments after create, reports each failure by name, and offers Open ticket", async () => {
    attachmentFails = new Set(["broken.pdf"]);
    renderSheet();
    open({ id: 1, name: "Support" } as never);
    await waitColumn("In Progress");
    await typeTitle("With files");
    fireEvent.change(screen.getByTestId("dropzone"), {
      target: { files: [new File(["a"], "ok.png", { type: "image/png" }), new File(["b"], "broken.pdf", { type: "application/pdf" })] },
    });
    expect(screen.getByTestId("file-count")).toHaveTextContent("2");
    const invalidate = vi.spyOn(qc, "invalidateQueries");
    fireEvent.click(submitBtn());

    await waitFor(() => expect(h.toast.success).toHaveBeenCalled());
    const attachmentCalls = h.post.mock.calls.filter((c) => c[0] === "/api/attachments/");
    expect(attachmentCalls).toHaveLength(2);
    expect((attachmentCalls[0][1] as FormData).get("ticket")).toBe("77");
    expect(h.toast.error).toHaveBeenCalledTimes(1);
    expect(h.toast.error).toHaveBeenCalledWith("Couldn't upload broken.pdf");

    const [msg, opts] = h.toast.success.mock.calls[0];
    expect(msg).toBe("Ticket #77 created");
    expect(opts.action.label).toBe("Open ticket");
    opts.action.onClick();
    expect(h.push).toHaveBeenCalledWith("/tickets/77");

    const keys = invalidate.mock.calls.map((c) => JSON.stringify((c[0] as { queryKey: unknown }).queryKey));
    expect(keys).toEqual(
      expect.arrayContaining([
        JSON.stringify(["kanbanBoard", 1]),
        JSON.stringify(["ticketList", 1]),
        JSON.stringify(["ticketColumnCounts", 1]),
        JSON.stringify(["ticketViewCounts"]),
        JSON.stringify(["boards"]),
      ]),
    );
    // closed after create
    await waitFor(() => expect(ctx.isOpen).toBe(false));
  });

  it("a forbidden create shows the permission toast and keeps the sheet open", async () => {
    createStatus = 403;
    renderSheet();
    open({ id: 1, name: "Support" } as never);
    await waitColumn("In Progress");
    await typeTitle("Nope");
    fireEvent.click(submitBtn());
    await waitFor(() => expect(h.toast.error).toHaveBeenCalledWith("You don't have permission to do that"));
    expect(ctx.isOpen).toBe(true);
    expect(submitBtn()).toBeEnabled();
  });

  it("auto-selects the default form, blocks create until required custom fields are filled, then submits the form", async () => {
    forms = [
      { id: 4, title: "Repair", is_default: true, is_active: true },
      { id: 5, title: "Inactive", is_default: false, is_active: false },
    ];
    h.generated.ticketFormsRetrieve.mockResolvedValue({
      id: 4,
      title: "Repair",
      item_lists: [],
      custom_fields: [
        { name: "serial", label: "Serial", type: "string", required: true },
        { name: "qty", label: "Qty", type: "number" },
      ],
    });
    h.generated.formSubmissionsCreate.mockResolvedValue({ id: 1 });
    renderSheet();
    open({ id: 1, name: "Support" } as never);
    await waitColumn("In Progress");
    await waitFor(() => expect(pickerIn("create-form-picker")).toHaveTextContent("Repair (Default form)"));
    await typeTitle("Form ticket");
    const serial = await screen.findByLabelText(/Serial/);
    expect(submitBtn()).toBeDisabled();
    fireEvent.change(serial, { target: { value: "SN-1" } });
    fireEvent.change(screen.getByLabelText("Qty"), { target: { value: "3" } });
    expect(submitBtn()).toBeEnabled();
    fireEvent.click(submitBtn());
    await waitFor(() => expect(h.generated.formSubmissionsCreate).toHaveBeenCalled());
    expect(h.generated.formSubmissionsCreate).toHaveBeenCalledWith({
      ticket: 77,
      form_id: 4,
      selected_item_ids: [],
      form_data: { serial: "SN-1", qty: 3 },
    });
  });

  it("clearing the form removes its fields and it is not re-selected", async () => {
    forms = [{ id: 4, title: "Repair", is_default: true, is_active: true }];
    h.generated.ticketFormsRetrieve.mockResolvedValue({
      id: 4,
      title: "Repair",
      item_lists: [],
      custom_fields: [{ name: "serial", label: "Serial", type: "string", required: true }],
    });
    renderSheet();
    open({ id: 1, name: "Support" } as never);
    await screen.findByLabelText(/Serial/);
    fireEvent.click(screen.getByRole("button", { name: "Clear form" }));
    await waitFor(() => expect(screen.queryByLabelText(/Serial/)).toBeNull());
    expect(pickerIn("create-form-picker")).toHaveTextContent("Select a form (optional)");
    await typeTitle("No form");
    expect(submitBtn()).toBeEnabled();
  });

  it("renders in Georgian with no raw keys", async () => {
    renderSheet("ka");
    open({ id: 1, name: "Support" } as never);
    await waitColumn("In Progress");
    const text = sheet().textContent ?? "";
    expect(text).toContain("ახალი ბილეთი");
    expect(text).toContain("ბილეთის შექმნა");
    expect(text).toContain("სტატუსი");
    expect(text).toContain("შემსრულებლები");
    expect(text).toContain("საშუალო"); // Medium
    expect(text).not.toMatch(/tickets\.|create\.\w/);
  });

  it("starts empty on the next open", async () => {
    renderSheet();
    open({ id: 1, name: "Support" } as never, undefined, { title: "First" });
    await waitColumn("In Progress");
    expect(screen.getByTestId("create-title")).toHaveValue("First");
    act(() => ctx.closeTicketCreate());
    await new Promise((r) => setTimeout(r, 250));
    open({ id: 1, name: "Support" } as never);
    await waitFor(() => expect(screen.getByTestId("create-title")).toHaveValue(""));
  });
});
