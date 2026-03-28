/**
 * Tests for SignInForm component.
 * Frontend counterpart of backend test_auth.py:
 *   - TestLogin: valid creds, invalid password, password_change_required
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      email: "Email",
      emailPlaceholder: "Enter your email",
      password: "Password",
      forgotPassword: "Forgot password?",
      signInWithEmail: "Sign In",
      signingIn: "Signing In...",
      noAccount: "Don't have an account?",
      signUp: "Sign Up",
      invalidResponse: "Invalid response from server",
      networkError: "Network error occurred",
    };
    return translations[key] || key;
  },
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

// Mock authService
const mockLogin = vi.fn();
const mockGetUser = vi.fn();
vi.mock("@/services/authService", () => ({
  authService: {
    login: (...args: any[]) => mockLogin(...args),
    getUser: () => mockGetUser(),
  },
}));

// Mock fetch for /api/auth/sync
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ success: true }),
  })
) as any;

import { SignInForm } from "@/components/auth/sign-in-form";

describe("SignInForm", () => {
  const onLogin = vi.fn();
  const onForgotPassword = vi.fn();
  const onPasswordChangeRequired = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockReturnValue(null);
  });

  function renderForm() {
    return render(
      <SignInForm
        onLogin={onLogin}
        onForgotPassword={onForgotPassword}
        onPasswordChangeRequired={onPasswordChangeRequired}
      />
    );
  }

  it("renders email and password fields", () => {
    renderForm();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Sign In" })
    ).toBeInTheDocument();
  });

  it("shows validation errors on empty submit", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => {
      expect(
        screen.getByText("Please enter a valid email address.")
      ).toBeInTheDocument();
    });
  });

  it("calls onLogin on successful login", async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue({
      message: "Login successful",
      token: "test-token",
    });
    mockGetUser.mockReturnValue({
      id: 1,
      email: "login@test.com",
      first_name: "Test",
      last_name: "User",
      is_active: true,
      is_staff: false,
      date_joined: "2024-01-01",
    });

    renderForm();

    await user.type(screen.getByLabelText("Email"), "login@test.com");
    await user.type(screen.getByLabelText("Password"), "correctpass123");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => {
      expect(onLogin).toHaveBeenCalledWith("test-token", expect.objectContaining({
        id: 1,
        email: "login@test.com",
      }));
    });
  });

  it("calls onPasswordChangeRequired when flag is set", async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue({
      message: "Password change required",
      password_change_required: true,
      user_id: 1,
      email: "login@test.com",
    });

    renderForm();

    await user.type(screen.getByLabelText("Email"), "login@test.com");
    await user.type(screen.getByLabelText("Password"), "correctpass123");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => {
      expect(onPasswordChangeRequired).toHaveBeenCalledWith(1, "login@test.com");
    });
  });

  it("displays backend error message on login failure", async () => {
    const user = userEvent.setup();
    mockLogin.mockRejectedValue(new Error("Invalid email or password"));

    renderForm();

    await user.type(screen.getByLabelText("Email"), "login@test.com");
    await user.type(screen.getByLabelText("Password"), "wrongpassword");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => {
      expect(
        screen.getByText("Invalid email or password")
      ).toBeInTheDocument();
    });
  });

  it("calls onForgotPassword when link is clicked", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByText("Forgot password?"));
    expect(onForgotPassword).toHaveBeenCalled();
  });
});
