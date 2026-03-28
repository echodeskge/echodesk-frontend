/**
 * Tests for TicketService.
 * Frontend counterpart of backend test_ticket_views.py:
 *   - CRUD operations for tickets
 *   - Comment management
 *   - Ticket assignment
 *   - Error handling (401, 400, 403, 404)
 *
 * Mock return types are validated against the generated API signatures.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/api/generated/api", () => ({
  ticketsList: vi.fn(),
  ticketsRetrieve: vi.fn(),
  ticketsCreate: vi.fn(),
  ticketsPartialUpdate: vi.fn(),
  ticketsDestroy: vi.fn(),
  ticketsAssignPartialUpdate: vi.fn(),
  commentsCreate: vi.fn(),
  commentsPartialUpdate: vi.fn(),
  commentsDestroy: vi.fn(),
  ticketsCommentsRetrieve: vi.fn(),
  usersList: vi.fn(),
  tagsList: vi.fn(),
}));

import { ticketService } from "@/services/ticketService";
import {
  ticketsList,
  ticketsRetrieve,
  ticketsCreate,
  ticketsPartialUpdate,
  ticketsDestroy,
  ticketsAssignPartialUpdate,
  commentsCreate,
  commentsPartialUpdate,
  commentsDestroy,
  ticketsCommentsRetrieve,
  usersList,
  tagsList,
} from "@/api/generated/api";

const mockTicketsList = vi.mocked(ticketsList);
const mockTicketsRetrieve = vi.mocked(ticketsRetrieve);
const mockTicketsCreate = vi.mocked(ticketsCreate);
const mockTicketsPartialUpdate = vi.mocked(ticketsPartialUpdate);
const mockTicketsDestroy = vi.mocked(ticketsDestroy);
const mockTicketsAssignPartialUpdate = vi.mocked(ticketsAssignPartialUpdate);
const mockCommentsCreate = vi.mocked(commentsCreate);
const mockCommentsPartialUpdate = vi.mocked(commentsPartialUpdate);
const mockCommentsDestroy = vi.mocked(commentsDestroy);
const mockTicketsCommentsRetrieve = vi.mocked(ticketsCommentsRetrieve);
const mockUsersList = vi.mocked(usersList);
const mockTagsList = vi.mocked(tagsList);

type TicketsListReturn = Awaited<ReturnType<typeof ticketsList>>;
type TicketReturn = Awaited<ReturnType<typeof ticketsRetrieve>>;
type CommentReturn = Awaited<ReturnType<typeof commentsCreate>>;
type UsersListReturn = Awaited<ReturnType<typeof usersList>>;
type TagsListReturn = Awaited<ReturnType<typeof tagsList>>;

const MOCK_USER_MINIMAL = {
  id: 1,
  email: "test@test.com",
  first_name: "Test",
  last_name: "User",
};

const MOCK_COLUMN = {
  id: 1,
  name: "To Do",
  board: 1,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  created_by: "1",
  tickets_count: 0,
};

const MOCK_TICKET: TicketReturn = {
  id: 1,
  title: "Test ticket",
  description: "A test ticket",
  status: "open",
  is_closed: "false",
  column: MOCK_COLUMN,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  created_by: MOCK_USER_MINIMAL,
  assigned_to: MOCK_USER_MINIMAL,
  assigned_users: [],
  assignments: [],
  assigned_groups: [],
  assigned_department: { id: 0, name: "" } as any,
  tags: [],
  comments: [],
  comments_count: "0",
  checklist_items: [],
  checklist_items_count: "0",
  completed_checklist_items_count: "0",
};

const MOCK_COMMENT: CommentReturn = {
  id: 1,
  ticket: 1,
  user: MOCK_USER_MINIMAL,
  comment: "Test comment",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

describe("TicketService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -- getTickets --
  describe("getTickets", () => {
    it("returns paginated ticket list", async () => {
      const response: TicketsListReturn = {
        count: 1,
        results: [
          {
            id: 1,
            title: "Test",
            status: "open",
            priority: "medium" as any,
            is_closed: "false",
            column: MOCK_COLUMN,
            position_in_column: 0,
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
            created_by: MOCK_USER_MINIMAL,
            assigned_to: MOCK_USER_MINIMAL,
            assigned_users: [],
            assigned_groups: [],
            assignments: [],
            tags: [],
            comments_count: 0,
          },
        ],
      };
      mockTicketsList.mockResolvedValue(response);

      const result = await ticketService.getTickets();

      expect(result.count).toBe(1);
      expect(result.results).toHaveLength(1);
    });

    it("passes filters to API", async () => {
      mockTicketsList.mockResolvedValue({ count: 0, results: [] });

      await ticketService.getTickets({
        search: "bug",
        page: 2,
        ordering: "-created_at",
      });

      expect(mockTicketsList).toHaveBeenCalledWith(
        "-created_at",
        2,
        undefined,
        "bug"
      );
    });

    it("throws on failure", async () => {
      mockTicketsList.mockRejectedValue({
        response: { status: 500, data: { message: "Server error" } },
      });

      await expect(ticketService.getTickets()).rejects.toThrow("Server error");
    });
  });

  // -- getTicket --
  describe("getTicket", () => {
    it("returns ticket by ID", async () => {
      mockTicketsRetrieve.mockResolvedValue(MOCK_TICKET);

      const result = await ticketService.getTicket(1);

      expect(result.id).toBe(1);
      expect(mockTicketsRetrieve).toHaveBeenCalledWith("1");
    });

    it("handles 404", async () => {
      mockTicketsRetrieve.mockRejectedValue({
        response: { status: 404, data: { detail: "Not found" } },
      });

      await expect(ticketService.getTicket(999)).rejects.toThrow("Not found");
    });
  });

  // -- createTicket --
  describe("createTicket", () => {
    it("creates with required fields", async () => {
      mockTicketsCreate.mockResolvedValue(MOCK_TICKET);

      const result = await ticketService.createTicket({
        title: "New ticket",
        description: "Description",
      });

      expect(result.id).toBe(1);
      expect(mockTicketsCreate).toHaveBeenCalled();
    });

    it("creates with all optional fields", async () => {
      mockTicketsCreate.mockResolvedValue(MOCK_TICKET);

      await ticketService.createTicket({
        title: "Full ticket",
        description: "With all fields",
        priority: "high",
        assigned_to_id: 1,
        column_id: 1,
        tag_ids: [1, 2],
      });

      expect(mockTicketsCreate).toHaveBeenCalled();
      const callArg = mockTicketsCreate.mock.calls[0][0] as any;
      expect(callArg.title).toBe("Full ticket");
      expect(callArg.priority).toBe("high");
    });

    it("throws on 400", async () => {
      mockTicketsCreate.mockRejectedValue({
        response: { status: 400, data: { message: "Title is required" } },
      });

      await expect(
        ticketService.createTicket({ title: "", description: "" })
      ).rejects.toThrow("Title is required");
    });
  });

  // -- updateTicket --
  describe("updateTicket", () => {
    it("partial update works", async () => {
      mockTicketsPartialUpdate.mockResolvedValue({
        ...MOCK_TICKET,
        title: "Updated",
      });

      const result = await ticketService.updateTicket(1, { title: "Updated" });

      expect(result.title).toBe("Updated");
      expect(mockTicketsPartialUpdate).toHaveBeenCalledWith("1", expect.objectContaining({ title: "Updated" }));
    });

    it('throws 401 "Authentication required"', async () => {
      mockTicketsPartialUpdate.mockRejectedValue({
        response: { status: 401, data: {} },
      });

      await expect(
        ticketService.updateTicket(1, { title: "x" })
      ).rejects.toThrow("Authentication required");
    });
  });

  // -- deleteTicket --
  describe("deleteTicket", () => {
    it("deletes by ID", async () => {
      mockTicketsDestroy.mockResolvedValue(undefined);

      await ticketService.deleteTicket(1);

      expect(mockTicketsDestroy).toHaveBeenCalledWith("1");
    });

    it("throws on 403", async () => {
      mockTicketsDestroy.mockRejectedValue({
        response: { status: 403, data: { message: "Forbidden" } },
      });

      await expect(ticketService.deleteTicket(1)).rejects.toThrow("Forbidden");
    });
  });

  // -- assignTicket --
  describe("assignTicket", () => {
    it("calls API with assigned_to_id", async () => {
      mockTicketsAssignPartialUpdate.mockResolvedValue(MOCK_TICKET);

      await ticketService.assignTicket(1, 5);

      expect(mockTicketsAssignPartialUpdate).toHaveBeenCalledWith("1", {
        assigned_to_id: 5,
      });
    });
  });

  // -- addComment --
  describe("addComment", () => {
    it("creates comment with ticket ID", async () => {
      mockCommentsCreate.mockResolvedValue(MOCK_COMMENT);

      const result = await ticketService.addComment(1, "Great work!");

      expect(result.comment).toBe("Test comment");
      expect(mockCommentsCreate).toHaveBeenCalledWith(
        expect.objectContaining({ ticket: 1, comment: "Great work!" })
      );
    });
  });

  // -- updateComment --
  describe("updateComment", () => {
    it("partial update with comment text", async () => {
      mockCommentsPartialUpdate.mockResolvedValue({
        ...MOCK_COMMENT,
        comment: "Updated",
      });

      const result = await ticketService.updateComment("1", "Updated");

      expect(result.comment).toBe("Updated");
      expect(mockCommentsPartialUpdate).toHaveBeenCalledWith("1", {
        comment: "Updated",
      });
    });
  });

  // -- deleteComment --
  describe("deleteComment", () => {
    it("removes by ID", async () => {
      mockCommentsDestroy.mockResolvedValue(undefined);

      await ticketService.deleteComment("1");

      expect(mockCommentsDestroy).toHaveBeenCalledWith("1");
    });
  });

  // -- getTicketComments --
  describe("getTicketComments", () => {
    it("fetches comments for ticket", async () => {
      mockTicketsCommentsRetrieve.mockResolvedValue({
        ...MOCK_TICKET,
        comments: [MOCK_COMMENT],
      });

      const result = await ticketService.getTicketComments(1);

      expect(mockTicketsCommentsRetrieve).toHaveBeenCalledWith("1");
      expect(result.comments).toHaveLength(1);
    });
  });

  // -- getUsers / getTags --
  describe("getUsers", () => {
    it("returns paginated user list", async () => {
      const response: UsersListReturn = {
        count: 1,
        results: [] as any,
      };
      mockUsersList.mockResolvedValue(response);

      const result = await ticketService.getUsers();

      expect(result.count).toBe(1);
    });
  });

  describe("getTags", () => {
    it("returns paginated tag list", async () => {
      const response: TagsListReturn = {
        count: 2,
        results: [
          {
            id: 1,
            name: "bug",
            created_at: "2024-01-01T00:00:00Z",
            created_by: MOCK_USER_MINIMAL,
          },
          {
            id: 2,
            name: "feature",
            created_at: "2024-01-01T00:00:00Z",
            created_by: MOCK_USER_MINIMAL,
          },
        ],
      };
      mockTagsList.mockResolvedValue(response);

      const result = await ticketService.getTags();

      expect(result.count).toBe(2);
      expect(result.results).toHaveLength(2);
    });
  });

  // -- handleError --
  describe("error handling", () => {
    it("401 → 'Authentication required'", async () => {
      mockTicketsList.mockRejectedValue({
        response: { status: 401, data: {} },
      });

      await expect(ticketService.getTickets()).rejects.toThrow(
        "Authentication required"
      );
    });

    it("extracts message from response data", async () => {
      mockTicketsList.mockRejectedValue({
        response: { status: 400, data: { message: "Bad request" } },
      });

      await expect(ticketService.getTickets()).rejects.toThrow("Bad request");
    });

    it("extracts detail from response data", async () => {
      mockTicketsList.mockRejectedValue({
        response: { status: 429, data: { detail: "Rate limited" } },
      });

      await expect(ticketService.getTickets()).rejects.toThrow("Rate limited");
    });

    it('falls back to "Unknown error occurred"', async () => {
      mockTicketsList.mockRejectedValue("something weird");

      await expect(ticketService.getTickets()).rejects.toThrow(
        "Unknown error occurred"
      );
    });
  });
});
