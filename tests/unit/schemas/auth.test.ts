/**
 * Tests for auth validation schemas.
 * Frontend counterpart of backend test_auth.py validation checks.
 */
import { describe, it, expect } from "vitest";
import { SignInSchema, ForgotPasswordSchema } from "@/schemas/auth";

describe("SignInSchema", () => {
  it("accepts valid email and password", () => {
    const result = SignInSchema.safeParse({
      email: "login@test.com",
      password: "correctpass123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = SignInSchema.safeParse({
      email: "not-an-email",
      password: "correctpass123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty email", () => {
    const result = SignInSchema.safeParse({
      email: "",
      password: "correctpass123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty password", () => {
    const result = SignInSchema.safeParse({
      email: "login@test.com",
      password: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing fields", () => {
    const result = SignInSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("ForgotPasswordSchema", () => {
  it("accepts valid email", () => {
    const result = ForgotPasswordSchema.safeParse({
      email: "user@test.com",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = ForgotPasswordSchema.safeParse({
      email: "bad-email",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty email", () => {
    const result = ForgotPasswordSchema.safeParse({ email: "" });
    expect(result.success).toBe(false);
  });
});
