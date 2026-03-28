/**
 * Tests for UserForm component.
 * Frontend counterpart of backend test_user_views.py:
 *   - TestUserCreate: create form validation, submission
 *   - TestUserUpdate: edit form, field restrictions
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import UserForm from "@/components/user-management/UserForm";
import type { User } from "@/api/generated/interfaces";

// Mock useTenantGroups hook
vi.mock("@/hooks/api/useTenant", () => ({
  useTenantGroups: vi.fn(() => ({
    data: { results: [] },
    isLoading: false,
  })),
}));

// Mock usersRetrieve for edit mode
vi.mock("@/api/generated/api", () => ({
  usersRetrieve: vi.fn().mockResolvedValue({
    id: 1,
    email: "edit@test.com",
    first_name: "Edit",
    last_name: "Me",
    full_name: "Edit Me",
    is_active: true,
    is_staff: false,
    is_booking_staff: "false",
    date_joined: "2024-01-01T00:00:00Z",
    last_login: "2024-01-01T00:00:00Z",
    permissions: "{}",
    group_permissions: "{}",
    all_permissions: "{}",
    feature_keys: "[]",
    groups: [],
    tenant_groups: [],
    department: { id: 1, name: "Engineering" },
  }),
}));

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    email: "user@test.com",
    first_name: "Test",
    last_name: "User",
    full_name: "Test User",
    is_active: true,
    is_staff: false,
    is_booking_staff: "false",
    date_joined: "2024-01-01T00:00:00Z",
    last_login: "2024-01-01T00:00:00Z",
    permissions: "{}",
    group_permissions: "{}",
    all_permissions: "{}",
    feature_keys: "[]",
    groups: [],
    tenant_groups: [],
    department: { id: 1, name: "Engineering" },
    ...overrides,
  } as User;
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

function renderForm(props: Partial<React.ComponentProps<typeof UserForm>> = {}) {
  const defaultFormProps = {
    mode: "create" as const,
    open: true,
    onSubmit: vi.fn().mockResolvedValue(undefined),
    onClose: vi.fn(),
    ...props,
  };

  return render(
    React.createElement(
      createWrapper(),
      null,
      React.createElement(UserForm, defaultFormProps)
    )
  );
}

describe("UserForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -- Create mode --

  describe("create mode", () => {
    it("renders create form with correct title", () => {
      renderForm();

      expect(screen.getByText("Add New User")).toBeInTheDocument();
    });

    it("shows auto-generated password message", () => {
      renderForm();

      expect(
        screen.getByText(/secure password will be auto-generated/i)
      ).toBeInTheDocument();
    });

    it("shows email, first name, last name fields", () => {
      renderForm();

      expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/First Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Last Name/i)).toBeInTheDocument();
    });

    it("shows Create User button", () => {
      renderForm();

      expect(screen.getByText("Create User")).toBeInTheDocument();
    });

    it("validates required email field", async () => {
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      renderForm({ onSubmit });

      // Fill only first and last name, leave email empty
      await user.type(screen.getByLabelText(/First Name/i), "John");
      await user.type(screen.getByLabelText(/Last Name/i), "Doe");
      await user.click(screen.getByText("Create User"));

      expect(screen.getByText("Email is required")).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("validates email format", async () => {
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      renderForm({ onSubmit });

      // Use value that passes HTML5 email validation but fails custom regex
      // (regex requires a dot in the domain: /^[^\s@]+@[^\s@]+\.[^\s@]+$/)
      await user.type(screen.getByLabelText(/Email Address/i), "user@invalid");
      await user.type(screen.getByLabelText(/First Name/i), "John");
      await user.type(screen.getByLabelText(/Last Name/i), "Doe");
      await user.click(screen.getByText("Create User"));

      expect(
        screen.getByText("Please enter a valid email address")
      ).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("validates required first name", async () => {
      const user = userEvent.setup();
      renderForm();

      await user.type(screen.getByLabelText(/Email Address/i), "test@test.com");
      await user.type(screen.getByLabelText(/Last Name/i), "Doe");
      await user.click(screen.getByText("Create User"));

      expect(screen.getByText("First name is required")).toBeInTheDocument();
    });

    it("validates required last name", async () => {
      const user = userEvent.setup();
      renderForm();

      await user.type(screen.getByLabelText(/Email Address/i), "test@test.com");
      await user.type(screen.getByLabelText(/First Name/i), "John");
      await user.click(screen.getByText("Create User"));

      expect(screen.getByText("Last name is required")).toBeInTheDocument();
    });

    it("submits valid create form", async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      const user = userEvent.setup();
      renderForm({ onSubmit });

      await user.type(screen.getByLabelText(/Email Address/i), "new@test.com");
      await user.type(screen.getByLabelText(/First Name/i), "New");
      await user.type(screen.getByLabelText(/Last Name/i), "User");
      await user.click(screen.getByText("Create User"));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            email: "new@test.com",
            first_name: "New",
            last_name: "User",
          })
        );
      });
    });

    it("shows error when submission fails", async () => {
      const onSubmit = vi.fn().mockRejectedValue(new Error("Server error"));
      const user = userEvent.setup();
      renderForm({ onSubmit });

      await user.type(screen.getByLabelText(/Email Address/i), "new@test.com");
      await user.type(screen.getByLabelText(/First Name/i), "New");
      await user.type(screen.getByLabelText(/Last Name/i), "User");
      await user.click(screen.getByText("Create User"));

      await waitFor(() => {
        expect(screen.getByText("Server error")).toBeInTheDocument();
      });
    });
  });

  // -- Edit mode --

  describe("edit mode", () => {
    const editUser = makeUser({
      id: 1,
      email: "edit@test.com",
      first_name: "Edit",
      last_name: "Me",
    });

    it("renders edit form with correct title", () => {
      renderForm({ mode: "edit", user: editUser });

      expect(screen.getByText("Edit User")).toBeInTheDocument();
    });

    it("shows Update User button", () => {
      renderForm({ mode: "edit", user: editUser });

      expect(screen.getByText("Update User")).toBeInTheDocument();
    });

    it("pre-fills form with user data", () => {
      renderForm({ mode: "edit", user: editUser });

      expect(screen.getByDisplayValue("edit@test.com")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Edit")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Me")).toBeInTheDocument();
    });

    it("disables email field in edit mode", () => {
      renderForm({ mode: "edit", user: editUser });

      expect(screen.getByDisplayValue("edit@test.com")).toBeDisabled();
    });

    it("shows status selector in edit mode", () => {
      renderForm({ mode: "edit", user: editUser });

      expect(screen.getByText("User Status")).toBeInTheDocument();
    });

    it("shows active checkbox in edit mode", () => {
      renderForm({ mode: "edit", user: editUser });

      expect(screen.getByText("User is active")).toBeInTheDocument();
    });
  });

  // -- Close / Cancel --

  describe("dialog controls", () => {
    it("calls onClose when Cancel clicked", async () => {
      const onClose = vi.fn();
      const user = userEvent.setup();
      renderForm({ onClose });

      await user.click(screen.getByText("Cancel"));

      expect(onClose).toHaveBeenCalled();
    });
  });
});
