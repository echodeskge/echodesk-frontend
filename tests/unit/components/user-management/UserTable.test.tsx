/**
 * Tests for UserTable component.
 * Frontend counterpart of backend test_user_views.py TestUserList:
 *   - Renders user rows with correct data
 *   - Selection (single, all, indeterminate)
 *   - Pagination controls
 *   - Loading state
 *   - Empty state
 *   - Action buttons per row
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UserTable from "@/components/user-management/UserTable";
import type { User } from "@/api/generated/interfaces";

const MOCK_DEPT = { id: 1, name: "Engineering" };

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
    department: MOCK_DEPT,
    ...overrides,
  } as User;
}

const defaultPagination = {
  count: 2,
  next: null,
  previous: null,
  currentPage: 1,
  totalPages: 1,
};

const defaultProps = {
  users: [
    makeUser({ id: 1, email: "admin@test.com", full_name: "Test Admin" }),
    makeUser({ id: 2, email: "agent@test.com", full_name: "Test Agent" }),
  ],
  loading: false,
  selectedUsers: [] as number[],
  onSelectionChange: vi.fn(),
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  onView: vi.fn(),
  onChangeStatus: vi.fn(),
  onSendNewPassword: vi.fn(),
  onToggleStaff: vi.fn(),
  pagination: defaultPagination,
  onPageChange: vi.fn(),
};

describe("UserTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -- Rendering --

  it("renders user rows with name and email", () => {
    render(<UserTable {...defaultProps} />);

    expect(screen.getByText("Test Admin")).toBeInTheDocument();
    expect(screen.getByText("admin@test.com")).toBeInTheDocument();
    expect(screen.getByText("Test Agent")).toBeInTheDocument();
    expect(screen.getByText("agent@test.com")).toBeInTheDocument();
  });

  it("renders status badge for active user", () => {
    render(<UserTable {...defaultProps} />);

    const badges = screen.getAllByText(/Active/i);
    expect(badges.length).toBeGreaterThan(0);
  });

  it("renders Inactive badge for inactive user", () => {
    const users = [makeUser({ id: 1, is_active: false, full_name: "Inactive User" })];
    render(<UserTable {...defaultProps} users={users} />);

    expect(screen.getByText("Inactive")).toBeInTheDocument();
  });

  it("shows tenant groups as badges", () => {
    const users = [
      makeUser({
        id: 1,
        tenant_groups: [
          { id: 1, name: "Support" } as any,
          { id: 2, name: "Sales" } as any,
        ],
      }),
    ];
    render(<UserTable {...defaultProps} users={users} />);

    expect(screen.getByText("Support")).toBeInTheDocument();
    expect(screen.getByText("Sales")).toBeInTheDocument();
  });

  it("shows 'No groups' when user has no tenant groups", () => {
    const users = [makeUser({ id: 1, tenant_groups: [] })];
    render(<UserTable {...defaultProps} users={users} />);

    expect(screen.getByText("No groups")).toBeInTheDocument();
  });

  it("shows job title when present", () => {
    const users = [makeUser({ id: 1, job_title: "Senior Engineer" })];
    render(<UserTable {...defaultProps} users={users} />);

    expect(screen.getByText("Senior Engineer")).toBeInTheDocument();
  });

  // -- Loading state --

  it("shows loading spinner when loading", () => {
    render(<UserTable {...defaultProps} loading={true} users={[]} />);

    expect(screen.getByText("Loading users...")).toBeInTheDocument();
  });

  // -- Empty state --

  it("shows 'No users found' when empty", () => {
    render(<UserTable {...defaultProps} users={[]} />);

    expect(screen.getByText("No users found")).toBeInTheDocument();
  });

  // -- Selection --

  it("calls onSelectionChange when individual user checked", async () => {
    const onSelectionChange = vi.fn();
    const user = userEvent.setup();

    render(
      <UserTable
        {...defaultProps}
        onSelectionChange={onSelectionChange}
      />
    );

    // Get all checkboxes - first is "select all", rest are per-user
    const checkboxes = screen.getAllByRole("checkbox");
    await user.click(checkboxes[1]); // Click first user checkbox

    expect(onSelectionChange).toHaveBeenCalledWith([1]);
  });

  it("calls onSelectionChange with all user IDs when select-all clicked", async () => {
    const onSelectionChange = vi.fn();
    const user = userEvent.setup();

    render(
      <UserTable
        {...defaultProps}
        onSelectionChange={onSelectionChange}
      />
    );

    const checkboxes = screen.getAllByRole("checkbox");
    await user.click(checkboxes[0]); // Click select-all checkbox

    expect(onSelectionChange).toHaveBeenCalledWith([1, 2]);
  });

  it("deselects user when already selected", async () => {
    const onSelectionChange = vi.fn();
    const user = userEvent.setup();

    render(
      <UserTable
        {...defaultProps}
        selectedUsers={[1, 2]}
        onSelectionChange={onSelectionChange}
      />
    );

    const checkboxes = screen.getAllByRole("checkbox");
    await user.click(checkboxes[1]); // Uncheck first user

    expect(onSelectionChange).toHaveBeenCalledWith([2]);
  });

  // -- Action buttons --

  it("calls onView when view button clicked", async () => {
    const onView = vi.fn();
    const user = userEvent.setup();
    const users = [makeUser({ id: 1 })];

    render(<UserTable {...defaultProps} users={users} onView={onView} />);

    const viewBtn = screen.getByTitle("View Details");
    await user.click(viewBtn);

    expect(onView).toHaveBeenCalledWith(users[0]);
  });

  it("calls onEdit when edit button clicked", async () => {
    const onEdit = vi.fn();
    const user = userEvent.setup();
    const users = [makeUser({ id: 1 })];

    render(<UserTable {...defaultProps} users={users} onEdit={onEdit} />);

    const editBtn = screen.getByTitle("Edit User");
    await user.click(editBtn);

    expect(onEdit).toHaveBeenCalledWith(users[0]);
  });

  it("calls onDelete when delete button clicked", async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();
    const users = [makeUser({ id: 5 })];

    render(<UserTable {...defaultProps} users={users} onDelete={onDelete} />);

    const deleteBtn = screen.getByTitle("Delete User");
    await user.click(deleteBtn);

    expect(onDelete).toHaveBeenCalledWith(5);
  });

  it("calls onSendNewPassword when send password button clicked", async () => {
    const onSendNewPassword = vi.fn();
    const user = userEvent.setup();
    const users = [makeUser({ id: 1 })];

    render(
      <UserTable
        {...defaultProps}
        users={users}
        onSendNewPassword={onSendNewPassword}
      />
    );

    const sendPwBtn = screen.getByTitle("Send New Password");
    await user.click(sendPwBtn);

    expect(onSendNewPassword).toHaveBeenCalledWith(users[0]);
  });

  it("calls onChangeStatus to deactivate active user", async () => {
    const onChangeStatus = vi.fn();
    const user = userEvent.setup();
    const users = [makeUser({ id: 1, is_active: true })];

    render(
      <UserTable
        {...defaultProps}
        users={users}
        onChangeStatus={onChangeStatus}
      />
    );

    const toggleBtn = screen.getByTitle("Deactivate");
    await user.click(toggleBtn);

    expect(onChangeStatus).toHaveBeenCalledWith(1, "inactive");
  });

  it("calls onChangeStatus to activate inactive user", async () => {
    const onChangeStatus = vi.fn();
    const user = userEvent.setup();
    const users = [makeUser({ id: 1, is_active: false })];

    render(
      <UserTable
        {...defaultProps}
        users={users}
        onChangeStatus={onChangeStatus}
      />
    );

    const toggleBtn = screen.getByTitle("Activate");
    await user.click(toggleBtn);

    expect(onChangeStatus).toHaveBeenCalledWith(1, "active");
  });

  // -- Pagination --

  it("shows pagination when totalPages > 1", () => {
    render(
      <UserTable
        {...defaultProps}
        pagination={{ ...defaultPagination, totalPages: 3, count: 60 }}
      />
    );

    expect(screen.getByText("Previous")).toBeInTheDocument();
    expect(screen.getByText("Next")).toBeInTheDocument();
  });

  it("hides pagination when totalPages <= 1", () => {
    render(<UserTable {...defaultProps} />);

    expect(screen.queryByText("Previous")).not.toBeInTheDocument();
    expect(screen.queryByText("Next")).not.toBeInTheDocument();
  });

  it("calls onPageChange when next clicked", async () => {
    const onPageChange = vi.fn();
    const user = userEvent.setup();

    render(
      <UserTable
        {...defaultProps}
        pagination={{ ...defaultPagination, totalPages: 3, count: 60 }}
        onPageChange={onPageChange}
      />
    );

    await user.click(screen.getByText("Next"));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("disables Previous on first page", () => {
    render(
      <UserTable
        {...defaultProps}
        pagination={{ ...defaultPagination, totalPages: 3, count: 60, currentPage: 1 }}
      />
    );

    expect(screen.getByText("Previous").closest("button")).toBeDisabled();
  });

  it("disables Next on last page", () => {
    render(
      <UserTable
        {...defaultProps}
        pagination={{ ...defaultPagination, totalPages: 3, count: 60, currentPage: 3 }}
      />
    );

    expect(screen.getByText("Next").closest("button")).toBeDisabled();
  });

  // -- Staff column --

  it("shows staff column when showStaffColumn is true", () => {
    render(<UserTable {...defaultProps} showStaffColumn={true} />);

    expect(screen.getByText("Staff")).toBeInTheDocument();
  });

  it("hides staff column by default", () => {
    render(<UserTable {...defaultProps} />);

    expect(screen.queryByText("Staff")).not.toBeInTheDocument();
  });
});
