import { Page } from "@playwright/test";

/**
 * Mock data and route mocks for the kanban / ticket E2E tests (mocked API).
 *
 * Shapes follow the tickets redesign contracts (plan §4.2): the lite board
 * list (`GET boards/?lite=1`, A1) and the lite kanban payload
 * (`GET boards/{id}/kanban_board/?lite=1`, A2), with the B1 card extras.
 */

const MOCK_USER_MINIMAL = {
  id: 1,
  email: "admin@test.com",
  first_name: "Test",
  last_name: "Admin",
};

/** A1 lite board row. */
export const MOCK_BOARD = {
  id: 1,
  name: "Main Board",
  color: "#3b82f6",
  position: 0,
  is_default: true,
  open_count: 3,
  columns_count: 3,
};

export const MOCK_COLUMNS = [
  {
    id: 1,
    name: "To Do",
    description: "",
    color: "#64748b",
    position: 0,
    is_default: true,
    is_closed_status: false,
    track_time: false,
    board: 1,
    tickets_count: 2,
  },
  {
    id: 2,
    name: "In Progress",
    description: "",
    color: "#f59e0b",
    position: 1,
    is_default: false,
    is_closed_status: false,
    track_time: true,
    board: 1,
    tickets_count: 1,
  },
  {
    id: 3,
    name: "Done",
    description: "",
    color: "#22c55e",
    position: 2,
    is_default: false,
    is_closed_status: true,
    track_time: false,
    board: 1,
    // Unfiltered server count; the header shows the rendered cards instead (F20).
    tickets_count: 7,
  },
];

export const MOCK_TAGS = [
  { id: 1, name: "bug", color: "#EF4444", created_at: "2024-01-01T00:00:00Z", created_by: MOCK_USER_MINIMAL },
  { id: 2, name: "feature", color: "#3B82F6", created_at: "2024-01-01T00:00:00Z", created_by: MOCK_USER_MINIMAL },
];

const tagRef = (t: (typeof MOCK_TAGS)[number]) => ({ id: t.id, name: t.name, color: t.color });

/** A2 lite cards. */
export const MOCK_TICKETS = [
  {
    id: 1,
    title: "Fix login bug",
    priority: "high",
    column_id: 1,
    position_in_column: 0,
    is_order: false,
    is_closed: false,
    tags: [tagRef(MOCK_TAGS[0])],
    assignees: [{ id: 1, name: "Test Admin", email: "admin@test.com" }],
    comments_count: 2,
    attachments_count: 1,
    price: null,
    currency: null,
    is_paid: false,
    payment_due_date: null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    due_date: "2024-01-03",
    is_overdue_task: true,
    checklist_items_count: 4,
    completed_checklist_items_count: 1,
    description_preview: "Users can't sign in after a password reset.",
  },
  {
    id: 2,
    title: "Add dashboard widget",
    priority: "medium",
    column_id: 1,
    position_in_column: 1,
    is_order: false,
    is_closed: false,
    tags: [tagRef(MOCK_TAGS[1])],
    assignees: [],
    comments_count: 0,
    attachments_count: 0,
    price: null,
    currency: null,
    is_paid: false,
    payment_due_date: null,
    created_at: "2024-01-02T00:00:00Z",
    updated_at: "2024-01-02T00:00:00Z",
    due_date: null,
    is_overdue_task: false,
    checklist_items_count: 0,
    completed_checklist_items_count: 0,
    description_preview: "",
  },
  {
    id: 3,
    title: "Refactor auth module",
    priority: "low",
    column_id: 2,
    position_in_column: 0,
    is_order: false,
    is_closed: false,
    tags: [],
    assignees: [{ id: 1, name: "Test Admin", email: "admin@test.com" }],
    comments_count: 1,
    attachments_count: 0,
    price: null,
    currency: null,
    is_paid: false,
    payment_due_date: null,
    created_at: "2024-01-03T00:00:00Z",
    updated_at: "2024-01-03T00:00:00Z",
    due_date: null,
    is_overdue_task: false,
    checklist_items_count: 0,
    completed_checklist_items_count: 0,
    description_preview: "",
  },
];

export const MOCK_KANBAN_BOARD = {
  board: { id: MOCK_BOARD.id, name: MOCK_BOARD.name, color: MOCK_BOARD.color, is_default: true },
  columns: MOCK_COLUMNS,
  tickets_by_column: {
    "1": MOCK_TICKETS.filter((t) => t.column_id === 1),
    "2": MOCK_TICKETS.filter((t) => t.column_id === 2),
    "3": [],
  },
};

export const MOCK_STAFF_PROFILE = {
  id: 1,
  email: "admin@test.com",
  first_name: "Test",
  last_name: "Admin",
  full_name: "Test Admin",
  is_staff: true,
  is_superuser: true,
  is_active: true,
  permissions_list: [],
  feature_keys: ["ticket_management"],
};

export const MOCK_AGENT_PROFILE = {
  ...MOCK_STAFF_PROFILE,
  id: 2,
  email: "user@test.com",
  first_name: "Plain",
  last_name: "User",
  full_name: "Plain User",
  is_staff: false,
  is_superuser: false,
};

// -- Route mock functions --

function json(body: unknown, status = 200) {
  return { status, contentType: "application/json", body: JSON.stringify(body) };
}

/** `GET boards/` (lite or not) and `GET boards/{id}/` — never the kanban action. */
function isBoardsRead(url: string, method: string) {
  return method === "GET" && /\/api\/boards\/(\?|\d+\/(\?|$)|$)/.test(url) && !url.includes("kanban_board");
}

export async function mockBoardsList(page: Page) {
  await page.route(/\/api\/boards\//, (route) => {
    const req = route.request();
    if (isBoardsRead(req.url(), req.method())) {
      return route.fulfill(json({ count: 1, next: null, previous: null, results: [MOCK_BOARD] }));
    }
    return route.fallback();
  });
}

export async function mockBoardsEmpty(page: Page) {
  await page.route(/\/api\/boards\//, (route) => {
    const req = route.request();
    if (isBoardsRead(req.url(), req.method())) {
      return route.fulfill(json({ count: 0, next: null, previous: null, results: [] }));
    }
    return route.fallback();
  });
}

export async function mockBoardsError(page: Page) {
  await page.route(/\/api\/boards\//, (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill(json({ detail: "Internal server error" }, 500));
    }
    return route.fallback();
  });
}

export async function mockKanbanBoard(page: Page, payload: unknown = MOCK_KANBAN_BOARD) {
  await page.route(/\/api\/boards\/\d+\/kanban_board\//, (route) => route.fulfill(json(payload)));
}

export async function mockKanbanBoardError(page: Page) {
  await page.route(/\/api\/boards\/\d+\/kanban_board\//, (route) =>
    route.fulfill(json({ detail: "Internal server error" }, 500)),
  );
}

export async function mockProfile(page: Page, profile: unknown = MOCK_STAFF_PROFILE) {
  await page.route(/\/api\/auth\/profile\//, (route) => route.fulfill(json(profile)));
}

export async function mockTicketCreate(page: Page) {
  await page.route(/\/api\/tickets\/(\?|$)/, (route) => {
    if (route.request().method() === "POST") {
      return route.fulfill(json({ ...MOCK_TICKETS[0], id: 100, title: "New ticket" }, 201));
    }
    return route.fallback();
  });
}

export async function mockTicketMove(page: Page, status = 200) {
  await page.route(/\/api\/tickets\/\d+\/move_to_column\//, (route) =>
    route.fulfill(json(status < 400 ? { id: 1, board: { id: 1, name: MOCK_BOARD.name, color: MOCK_BOARD.color } } : { detail: "error" }, status)),
  );
}

export async function mockTicketUpdate(page: Page) {
  await page.route(/\/api\/tickets\/\d+\/$/, (route) => {
    if (route.request().method() === "PATCH") return route.fulfill(json(MOCK_TICKETS[0]));
    return route.fallback();
  });
}

export async function mockTicketDelete(page: Page) {
  await page.route(/\/api\/tickets\/\d+\/$/, (route) => {
    if (route.request().method() === "DELETE") return route.fulfill({ status: 204 });
    return route.fallback();
  });
}

export async function mockTagsList(page: Page) {
  await page.route(/\/api\/tags\//, (route) =>
    route.fulfill(json({ count: MOCK_TAGS.length, next: null, previous: null, results: MOCK_TAGS })),
  );
}

export async function mockColumnsList(page: Page) {
  await page.route(/\/api\/columns\//, (route) =>
    route.fulfill(json({ count: MOCK_COLUMNS.length, next: null, previous: null, results: MOCK_COLUMNS })),
  );
}

/** Counts used by the sidebar and the toolbar; harmless when nothing asks for them. */
export async function mockTicketCounts(page: Page) {
  await page.route(/\/api\/tickets\/view_counts\//, (route) =>
    route.fulfill(json({ mine: 2, unassigned: 1, urgent: 1, due_this_week: 0 })),
  );
  await page.route(/\/api\/tickets\/column_counts\//, (route) =>
    route.fulfill(json({ counts: { "1": 2, "2": 1, "3": 0 } })),
  );
}

export async function mockBoardsDefault(page: Page) {
  await mockBoardsList(page);
  await mockKanbanBoard(page);
  await mockTagsList(page);
  await mockColumnsList(page);
  await mockTicketCounts(page);
  await mockProfile(page);
}
