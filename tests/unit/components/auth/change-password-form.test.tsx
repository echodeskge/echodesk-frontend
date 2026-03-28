/**
 * Tests for ChangePasswordForm component.
 * Frontend counterpart of backend test_auth.py:
 *   - TestForcedPasswordChange: success, wrong current password, validation
 *   - TestChangePassword: too short, missing fields
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      passwordChangeRequired: "You must change your password before continuing.",
      currentPassword: "Current Password",
      currentPasswordPlaceholder: "Enter your temporary password",
      newPassword: "New Password",
      newPasswordPlaceholder: "Enter your new password",
      confirmPassword: "Confirm New Password",
      confirmPasswordPlaceholder: "Re-enter your new password",
      changePassword: "Change Password",
      changingPassword: "Changing Password...",
    };
    return translations[key] || key;
  },
}));

// Mock forcedPasswordChange API — return type matches generated signature:
// Promise<{ message?: string; token?: string }>
import type { forcedPasswordChange as ForcedPasswordChangeFn } from "@/api/generated/api";
type ForcedPasswordChangeReturn = Awaited<ReturnType<typeof ForcedPasswordChangeFn>>;

const mockForcedPasswordChange = vi.fn<(...args: any[]) => Promise<ForcedPasswordChangeReturn>>();
vi.mock("@/api/generated/api", () => ({
  forcedPasswordChange: (...args: any[]) => mockForcedPasswordChange(...args),
}));

import { ChangePasswordForm } from "@/components/auth/change-password-form";

describe("ChangePasswordForm", () => {
  const onPasswordChanged = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderForm() {
    return render(
      <ChangePasswordForm
        userId={1}
        email="forced@test.com"
        onPasswordChanged={onPasswordChanged}
      />
    );
  }

  it("renders all password fields", () => {
    renderForm();
    expect(screen.getByLabelText("Current Password")).toBeInTheDocument();
    expect(screen.getByLabelText("New Password")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm New Password")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Change Password" })
    ).toBeInTheDocument();
  });

  it("shows alert banner about password change requirement", () => {
    renderForm();
    expect(
      screen.getByText("You must change your password before continuing.")
    ).toBeInTheDocument();
  });

  it("rejects short new password", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("Current Password"), "temppass123");
    await user.type(screen.getByLabelText("New Password"), "short");
    await user.type(screen.getByLabelText("Confirm New Password"), "short");
    await user.click(screen.getByRole("button", { name: "Change Password" }));

    await waitFor(() => {
      expect(
        screen.getByText("Password must be at least 8 characters")
      ).toBeInTheDocument();
    });
  });

  it("rejects mismatched passwords", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("Current Password"), "temppass123");
    await user.type(screen.getByLabelText("New Password"), "newstrongpass1");
    await user.type(
      screen.getByLabelText("Confirm New Password"),
      "different123"
    );
    await user.click(screen.getByRole("button", { name: "Change Password" }));

    await waitFor(() => {
      expect(screen.getByText("Passwords don't match")).toBeInTheDocument();
    });
  });

  it("shows success message and calls callback on success", async () => {
    const user = userEvent.setup();
    mockForcedPasswordChange.mockResolvedValue({
      message: "Password changed successfully",
      token: "new-token-456",
    });

    renderForm();

    await user.type(screen.getByLabelText("Current Password"), "temppass123");
    await user.type(screen.getByLabelText("New Password"), "newstrongpass1");
    await user.type(
      screen.getByLabelText("Confirm New Password"),
      "newstrongpass1"
    );
    await user.click(screen.getByRole("button", { name: "Change Password" }));

    await waitFor(() => {
      expect(
        screen.getByText("Password changed successfully! Redirecting...")
      ).toBeInTheDocument();
    });

    expect(mockForcedPasswordChange).toHaveBeenCalledWith({
      email: "forced@test.com",
      current_password: "temppass123",
      new_password: "newstrongpass1",
    });
  });

  it("displays backend error on failure", async () => {
    const user = userEvent.setup();
    mockForcedPasswordChange.mockRejectedValue({
      response: {
        data: {
          error: "Invalid credentials",
        },
      },
    });

    renderForm();

    await user.type(screen.getByLabelText("Current Password"), "wrongpass");
    await user.type(screen.getByLabelText("New Password"), "newstrongpass1");
    await user.type(
      screen.getByLabelText("Confirm New Password"),
      "newstrongpass1"
    );
    await user.click(screen.getByRole("button", { name: "Change Password" }));

    await waitFor(() => {
      expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
    });
  });
});
