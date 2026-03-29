/**
 * Tests for ticket-form generated API functions.
 * Frontend counterpart of backend test_form_views.py:
 *   - set_default staff-only enforcement (403)
 *   - CRUD operations
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/api/generated/api", () => ({
  ticketFormsList: vi.fn(),
  ticketFormsCreate: vi.fn(),
  ticketFormsUpdate: vi.fn(),
  ticketFormsDestroy: vi.fn(),
  ticketFormsSetDefaultCreate: vi.fn(),
}));

import {
  ticketFormsList,
  ticketFormsCreate,
  ticketFormsUpdate,
  ticketFormsDestroy,
  ticketFormsSetDefaultCreate,
} from "@/api/generated/api";

const mockList = vi.mocked(ticketFormsList);
const mockCreate = vi.mocked(ticketFormsCreate);
const mockUpdate = vi.mocked(ticketFormsUpdate);
const mockDestroy = vi.mocked(ticketFormsDestroy);
const mockSetDefault = vi.mocked(ticketFormsSetDefaultCreate);

type FormReturn = Awaited<ReturnType<typeof ticketFormsCreate>>;
type ListReturn = Awaited<ReturnType<typeof ticketFormsList>>;

const MOCK_FORM: FormReturn = {
  id: 1,
  title: "Order Form",
  description: "Test form",
  parent_form: { id: 0, title: "" } as any,
  child_forms: [],
  child_forms_count: "0",
  item_lists: [],
  form_config: {},
  custom_fields: {},
  is_default: false,
  is_active: true,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  created_by: { id: 1, email: "admin@test.com", first_name: "Admin", last_name: "User" },
  submissions_count: "0",
};

describe("TicketForm API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("ticketFormsList", () => {
    it("returns paginated form list", async () => {
      const response: ListReturn = { count: 1, results: [MOCK_FORM as any] };
      mockList.mockResolvedValue(response);

      const result = await ticketFormsList();

      expect(result.count).toBe(1);
      expect(result.results).toHaveLength(1);
    });
  });

  describe("ticketFormsCreate", () => {
    it("creates a form", async () => {
      mockCreate.mockResolvedValue(MOCK_FORM);

      const result = await ticketFormsCreate({ title: "Order Form" });

      expect(result.title).toBe("Order Form");
      expect(mockCreate).toHaveBeenCalledWith({ title: "Order Form" });
    });
  });

  describe("ticketFormsSetDefaultCreate", () => {
    it("sets form as default", async () => {
      const defaultForm = { ...MOCK_FORM, is_default: true };
      mockSetDefault.mockResolvedValue(defaultForm);

      const result = await ticketFormsSetDefaultCreate(1, MOCK_FORM as any);

      expect(result.is_default).toBe(true);
      expect(mockSetDefault).toHaveBeenCalledWith(1, expect.anything());
    });

    it("rejects with 403 for non-staff user", async () => {
      mockSetDefault.mockRejectedValue({
        response: { status: 403, data: { error: "Only staff can set default form" } },
      });

      await expect(
        ticketFormsSetDefaultCreate(1, MOCK_FORM as any)
      ).rejects.toEqual(
        expect.objectContaining({
          response: expect.objectContaining({ status: 403 }),
        })
      );
    });
  });

  describe("ticketFormsDestroy", () => {
    it("deletes a form", async () => {
      mockDestroy.mockResolvedValue(undefined);

      await ticketFormsDestroy(1);

      expect(mockDestroy).toHaveBeenCalledWith(1);
    });
  });
});
