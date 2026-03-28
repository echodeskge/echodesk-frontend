/**
 * Tests for UserBulkActions component.
 * Frontend counterpart of backend test_user_views.py TestBulkActions:
 *   - bulk activate, deactivate, delete, change_role
 *   - No deprecated add_to_group/remove_from_group actions
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UserBulkActions from "@/components/user-management/UserBulkActions";

describe("UserBulkActions", () => {
  const onBulkAction = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.confirm for all tests
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  function renderComponent(selectedCount = 2, selectedUsers = [1, 2]) {
    return render(
      <UserBulkActions
        selectedCount={selectedCount}
        selectedUsers={selectedUsers}
        onBulkAction={onBulkAction}
      />
    );
  }

  it("renders selected count", () => {
    renderComponent(3, [1, 2, 3]);
    expect(screen.getByText("3 users selected")).toBeInTheDocument();
  });

  it("renders singular when 1 selected", () => {
    renderComponent(1, [1]);
    expect(screen.getByText("1 user selected")).toBeInTheDocument();
  });

  it("shows actions dropdown when toggle clicked", async () => {
    const user = userEvent.setup();
    renderComponent();

    await user.click(screen.getByText(/Bulk Actions/));

    // Verify action sections are visible
    expect(screen.getByText("User Status")).toBeInTheDocument();
    expect(screen.getByText("Security")).toBeInTheDocument();
    expect(screen.getByText("Role Changes")).toBeInTheDocument();
    expect(screen.getByText("Danger Zone")).toBeInTheDocument();
  });

  it("shows correct actions: activate, deactivate, reset_password, role changes, delete", async () => {
    const user = userEvent.setup();
    renderComponent();

    await user.click(screen.getByText(/Bulk Actions/));

    expect(screen.getByText(/Activate Users/)).toBeInTheDocument();
    expect(screen.getByText(/Deactivate Users/)).toBeInTheDocument();
    expect(screen.getByText(/Reset Passwords/)).toBeInTheDocument();
    expect(screen.getByText(/Make Admin/)).toBeInTheDocument();
    expect(screen.getByText(/Make Manager/)).toBeInTheDocument();
    expect(screen.getByText(/Make Agent/)).toBeInTheDocument();
    expect(screen.getByText(/Make Viewer/)).toBeInTheDocument();
    expect(screen.getByText(/Delete Users/)).toBeInTheDocument();
  });

  it("does NOT have deprecated add_to_group or remove_from_group actions", async () => {
    const user = userEvent.setup();
    renderComponent();

    await user.click(screen.getByText(/Bulk Actions/));

    expect(screen.queryByText(/Add to Group/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Remove from Group/i)).not.toBeInTheDocument();
  });

  it("calls onBulkAction with activate and user ids", async () => {
    const user = userEvent.setup();
    renderComponent(2, [10, 20]);

    await user.click(screen.getByText(/Bulk Actions/));

    // Find the activate button in the dropdown (not the toggle)
    const activateBtn = screen.getByText(/✅ Activate Users/);
    await user.click(activateBtn);

    expect(window.confirm).toHaveBeenCalled();
    expect(onBulkAction).toHaveBeenCalledWith("activate", [10, 20], undefined);
  });

  it("calls onBulkAction with change_role and role data", async () => {
    const user = userEvent.setup();
    renderComponent(2, [10, 20]);

    await user.click(screen.getByText(/Bulk Actions/));

    const makeAdminBtn = screen.getByText(/👑 Make Admin/);
    await user.click(makeAdminBtn);

    expect(onBulkAction).toHaveBeenCalledWith("change_role", [10, 20], {
      role: "admin",
    });
  });

  it("calls onBulkAction with delete", async () => {
    const user = userEvent.setup();
    renderComponent(1, [5]);

    await user.click(screen.getByText(/Bulk Actions/));

    const deleteBtn = screen.getByText(/🗑️ Delete Users/);
    await user.click(deleteBtn);

    expect(onBulkAction).toHaveBeenCalledWith("delete", [5], undefined);
  });

  it("does not call onBulkAction when confirm is cancelled", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const user = userEvent.setup();
    renderComponent();

    await user.click(screen.getByText(/Bulk Actions/));
    await user.click(screen.getByText(/✅ Activate Users/));

    expect(onBulkAction).not.toHaveBeenCalled();
  });
});
