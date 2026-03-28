import { Page } from "@playwright/test";

/**
 * Mock data and route mocks for kanban/ticket E2E tests.
 * Follows the same pattern as api-mocks.ts.
 */

const MOCK_USER_MINIMAL = {
  id: 1,
  email: "admin@test.com",
  first_name: "Test",
  last_name: "Admin",
};

export const MOCK_BOARD = {
  id: 1,
  name: "Main Board",
  description: "Default board",
  is_default: true,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  created_by: "1",
  columns_count: 3,
  order_users: [],
  board_groups: [],
  board_users: [],
  payment_summary: "",
};

export const MOCK_COLUMNS = [
  {
    id: 1,
    name: "To Do",
    description: "",
    color: "#E2E8F0",
    position: 0,
    is_default: true,
    is_closed_status: false,
    track_time: false,
    board: 1,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    created_by: "1",
    tickets_count: 2,
  },
  {
    id: 2,
    name: "In Progress",
    description: "",
    color: "#FEF3C7",
    position: 1,
    is_default: false,
    is_closed_status: false,
    track_time: true,
    board: 1,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    created_by: "1",
    tickets_count: 1,
  },
  {
    id: 3,
    name: "Done",
    description: "",
    color: "#D1FAE5",
    position: 2,
    is_default: false,
    is_closed_status: true,
    track_time: false,
    board: 1,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    created_by: "1",
    tickets_count: 0,
  },
];

export const MOCK_TAGS = [
  {
    id: 1,
    name: "bug",
    color: "#EF4444",
    created_at: "2024-01-01T00:00:00Z",
    created_by: MOCK_USER_MINIMAL,
  },
  {
    id: 2,
    name: "feature",
    color: "#3B82F6",
    created_at: "2024-01-01T00:00:00Z",
    created_by: MOCK_USER_MINIMAL,
  },
];

export const MOCK_TICKETS = [
  {
    id: 1,
    title: "Fix login bug",
    status: "open",
    priority: "high",
    is_closed: "false",
    column: MOCK_COLUMNS[0],
    position_in_column: 0,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    created_by: MOCK_USER_MINIMAL,
    assigned_to: MOCK_USER_MINIMAL,
    assigned_users: [MOCK_USER_MINIMAL],
    assigned_groups: [],
    assignments: [],
    tags: [MOCK_TAGS[0]],
    comments_count: 2,
  },
  {
    id: 2,
    title: "Add dashboard widget",
    status: "open",
    priority: "medium",
    is_closed: "false",
    column: MOCK_COLUMNS[0],
    position_in_column: 1,
    created_at: "2024-01-02T00:00:00Z",
    updated_at: "2024-01-02T00:00:00Z",
    created_by: MOCK_USER_MINIMAL,
    assigned_to: MOCK_USER_MINIMAL,
    assigned_users: [],
    assigned_groups: [],
    assignments: [],
    tags: [MOCK_TAGS[1]],
    comments_count: 0,
  },
  {
    id: 3,
    title: "Refactor auth module",
    status: "in_progress",
    priority: "low",
    is_closed: "false",
    column: MOCK_COLUMNS[1],
    position_in_column: 0,
    created_at: "2024-01-03T00:00:00Z",
    updated_at: "2024-01-03T00:00:00Z",
    created_by: MOCK_USER_MINIMAL,
    assigned_to: MOCK_USER_MINIMAL,
    assigned_users: [MOCK_USER_MINIMAL],
    assigned_groups: [],
    assignments: [],
    tags: [],
    comments_count: 1,
  },
];

export const MOCK_KANBAN_BOARD = {
  columns: MOCK_COLUMNS,
  tickets_by_column: JSON.stringify({
    "1": MOCK_TICKETS.filter((t) => t.column.id === 1),
    "2": MOCK_TICKETS.filter((t) => t.column.id === 2),
    "3": [],
  }),
};

// -- Route mock functions --

export async function mockBoardsList(page: Page) {
  await page.route("**/api/boards/*", (route) => {
    if (route.request().method() === "GET" && !route.request().url().includes("kanban_board")) {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          count: 1,
          results: [MOCK_BOARD],
        }),
      });
    } else {
      route.continue();
    }
  });
}

export async function mockBoardsEmpty(page: Page) {
  await page.route("**/api/boards/*", (route) => {
    if (route.request().method() === "GET" && !route.request().url().includes("kanban_board")) {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ count: 0, results: [] }),
      });
    } else {
      route.continue();
    }
  });
}

export async function mockBoardsError(page: Page) {
  await page.route("**/api/boards/*", (route) => {
    if (route.request().method() === "GET") {
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Internal server error" }),
      });
    } else {
      route.continue();
    }
  });
}

export async function mockKanbanBoard(page: Page) {
  await page.route("**/api/boards/*/kanban_board/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_KANBAN_BOARD),
    })
  );
}

export async function mockKanbanBoardError(page: Page) {
  await page.route("**/api/boards/*/kanban_board/**", (route) =>
    route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ detail: "Internal server error" }),
    })
  );
}

export async function mockTicketCreate(page: Page) {
  await page.route("**/api/tickets/", (route) => {
    if (route.request().method() === "POST") {
      route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          ...MOCK_TICKETS[0],
          id: 100,
          title: "New ticket",
        }),
      });
    } else {
      route.continue();
    }
  });
}

export async function mockTicketUpdate(page: Page) {
  await page.route("**/api/tickets/*/", (route) => {
    if (route.request().method() === "PATCH") {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_TICKETS[0]),
      });
    } else {
      route.continue();
    }
  });
}

export async function mockTicketDelete(page: Page) {
  await page.route("**/api/tickets/*/", (route) => {
    if (route.request().method() === "DELETE") {
      route.fulfill({ status: 204 });
    } else {
      route.continue();
    }
  });
}

export async function mockTagsList(page: Page) {
  await page.route("**/api/tags/*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        count: MOCK_TAGS.length,
        results: MOCK_TAGS,
      }),
    })
  );
}

export async function mockColumnsList(page: Page) {
  await page.route("**/api/columns/*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        count: MOCK_COLUMNS.length,
        results: MOCK_COLUMNS,
      }),
    })
  );
}

export async function mockBoardsDefault(page: Page) {
  await mockBoardsList(page);
  await mockKanbanBoard(page);
  await mockTagsList(page);
  await mockColumnsList(page);
}
