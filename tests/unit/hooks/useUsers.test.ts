/**
 * Tests for useUsers hooks.
 * Frontend counterpart of backend test_user_views.py:
 *   - TestUserList: list, search, pagination
 *   - TestUserCreate: create user
 *   - TestUserUpdate: full + partial update
 *   - TestUserDelete: delete user
 *
 * Uses renderHook + QueryClientProvider wrapper.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("@/api/generated/api", () => ({
  usersList: vi.fn(),
  usersCreate: vi.fn(),
  usersUpdate: vi.fn(),
  usersPartialUpdate: vi.fn(),
  usersDestroy: vi.fn(),
}));

vi.mock("@/services/auth", () => ({
  authService: {
    isAuthenticated: vi.fn(() => true),
  },
}));

import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  usePartialUpdateUser,
  useDeleteUser,
} from "@/hooks/api/useUsers";
import {
  usersList,
  usersCreate,
  usersUpdate,
  usersPartialUpdate,
  usersDestroy,
} from "@/api/generated/api";
import { authService } from "@/services/auth";

const mockUsersList = vi.mocked(usersList);
const mockUsersCreate = vi.mocked(usersCreate);
const mockUsersUpdate = vi.mocked(usersUpdate);
const mockUsersPartialUpdate = vi.mocked(usersPartialUpdate);
const mockUsersDestroy = vi.mocked(usersDestroy);
const mockIsAuthenticated = vi.mocked(authService.isAuthenticated);

type UsersListReturn = Awaited<ReturnType<typeof usersList>>;
type UserCreateReturn = Awaited<ReturnType<typeof usersCreate>>;
type UserUpdateReturn = Awaited<ReturnType<typeof usersUpdate>>;

const MOCK_USER = {
  id: 1,
  email: "admin@test.com",
  first_name: "Test",
  last_name: "Admin",
  full_name: "Test Admin",
  is_active: true,
  is_staff: true,
  is_booking_staff: "false",
  date_joined: "2024-01-01T00:00:00Z",
  last_login: "2024-01-01T00:00:00Z",
  permissions: "{}",
  group_permissions: "{}",
  all_permissions: "{}",
  feature_keys: "[]",
  groups: [],
  tenant_groups: [],
  department: { id: 0, name: "" },
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("useUsers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAuthenticated.mockReturnValue(true);
  });

  // -- TestUserList counterparts --

  describe("list query", () => {
    it("fetches users when authenticated", async () => {
      const response: UsersListReturn = {
        count: 2,
        results: [
          { ...MOCK_USER, id: 1, email: "admin@test.com" },
          { ...MOCK_USER, id: 2, email: "agent@test.com" },
        ] as any,
      };
      mockUsersList.mockResolvedValue(response);

      const { result } = renderHook(() => useUsers(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.count).toBe(2);
      expect(result.current.data?.results).toHaveLength(2);
    });

    it("does NOT fetch when not authenticated", () => {
      mockIsAuthenticated.mockReturnValue(false);

      const { result } = renderHook(() => useUsers(), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
      expect(mockUsersList).not.toHaveBeenCalled();
    });

    it("passes page and search to API", async () => {
      mockUsersList.mockResolvedValue({ count: 0, results: [] });

      renderHook(() => useUsers({ page: 2, search: "admin" }), {
        wrapper: createWrapper(),
      });

      await waitFor(() =>
        expect(mockUsersList).toHaveBeenCalledWith(undefined, 2, undefined, "admin")
      );
    });

    it("handles API error", async () => {
      mockUsersList.mockRejectedValue(new Error("Server error"));

      const { result } = renderHook(() => useUsers(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("returns empty results", async () => {
      mockUsersList.mockResolvedValue({ count: 0, results: [] });

      const { result } = renderHook(() => useUsers(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.results).toEqual([]);
    });

    it("can be disabled via options", () => {
      const { result } = renderHook(() => useUsers({ enabled: false }), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
      expect(mockUsersList).not.toHaveBeenCalled();
    });
  });

  // -- TestUserCreate counterpart --

  describe("useCreateUser", () => {
    it("calls usersCreate with data", async () => {
      const created: UserCreateReturn = {
        email: "new@test.com",
        first_name: "New",
        last_name: "User",
      };
      mockUsersCreate.mockResolvedValue(created);

      const { result } = renderHook(() => useCreateUser(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          email: "new@test.com",
          first_name: "New",
          last_name: "User",
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockUsersCreate).toHaveBeenCalledWith({
        email: "new@test.com",
        first_name: "New",
        last_name: "User",
      });
    });

    it("handles create error", async () => {
      mockUsersCreate.mockRejectedValue(new Error("Email already exists"));

      const { result } = renderHook(() => useCreateUser(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ email: "dupe@test.com" });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // -- TestUserUpdate counterparts --

  describe("useUpdateUser", () => {
    it("calls usersUpdate with id and data", async () => {
      const updated: UserUpdateReturn = {
        first_name: "Updated",
        last_name: "Name",
      } as any;
      mockUsersUpdate.mockResolvedValue(updated);

      const { result } = renderHook(() => useUpdateUser(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          id: 1,
          data: { first_name: "Updated", last_name: "Name" } as any,
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockUsersUpdate).toHaveBeenCalledWith(1, {
        first_name: "Updated",
        last_name: "Name",
      });
    });
  });

  describe("usePartialUpdateUser", () => {
    it("calls usersPartialUpdate with id and partial data", async () => {
      mockUsersPartialUpdate.mockResolvedValue({
        first_name: "Patched",
      } as any);

      const { result } = renderHook(() => usePartialUpdateUser(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          id: 1,
          data: { first_name: "Patched" },
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockUsersPartialUpdate).toHaveBeenCalledWith(1, {
        first_name: "Patched",
      });
    });

    it("handles update error (403 forbidden)", async () => {
      mockUsersPartialUpdate.mockRejectedValue(new Error("Forbidden"));

      const { result } = renderHook(() => usePartialUpdateUser(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ id: 1, data: { first_name: "x" } });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // -- TestUserDelete counterpart --

  describe("useDeleteUser", () => {
    it("calls usersDestroy with user ID", async () => {
      mockUsersDestroy.mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteUser(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(1);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockUsersDestroy).toHaveBeenCalledWith(1);
    });

    it("handles delete error", async () => {
      mockUsersDestroy.mockRejectedValue(new Error("Cannot delete self"));

      const { result } = renderHook(() => useDeleteUser(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(1);
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });
});
