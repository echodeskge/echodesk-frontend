/**
 * Tests for useToast hook (src/hooks/use-toast.ts).
 * Tests toast creation, variants, and message handling.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";

const mockSuccess = vi.mocked(sonnerToast.success);
const mockError = vi.mocked(sonnerToast.error);

describe("useToast", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a toast function", () => {
    const { result } = renderHook(() => useToast());

    expect(result.current.toast).toBeDefined();
    expect(typeof result.current.toast).toBe("function");
  });

  describe("default variant (success)", () => {
    it("calls sonner.success with title", () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast({ title: "Invoice created" });
      });

      expect(mockSuccess).toHaveBeenCalledWith("Invoice created", {
        description: undefined,
      });
    });

    it("calls sonner.success with description when no title", () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast({ description: "Operation completed" });
      });

      expect(mockSuccess).toHaveBeenCalledWith("Operation completed", {
        description: undefined,
      });
    });

    it("calls sonner.success with title and description", () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast({
          title: "Invoice Sent",
          description: "Email was sent to client@example.com",
        });
      });

      expect(mockSuccess).toHaveBeenCalledWith("Invoice Sent", {
        description: "Email was sent to client@example.com",
      });
    });

    it("defaults to Success when no title or description", () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast({});
      });

      expect(mockSuccess).toHaveBeenCalledWith("Success", {
        description: undefined,
      });
    });

    it("treats undefined variant as success", () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast({ title: "Saved", variant: undefined });
      });

      expect(mockSuccess).toHaveBeenCalled();
      expect(mockError).not.toHaveBeenCalled();
    });
  });

  describe("destructive variant (error)", () => {
    it("calls sonner.error with title", () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast({
          title: "Failed to save",
          variant: "destructive",
        });
      });

      expect(mockError).toHaveBeenCalledWith("Failed to save", {
        description: undefined,
      });
    });

    it("calls sonner.error with description when no title", () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast({
          description: "Something went wrong",
          variant: "destructive",
        });
      });

      expect(mockError).toHaveBeenCalledWith("Something went wrong", {
        description: undefined,
      });
    });

    it("calls sonner.error with title and description", () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast({
          title: "Payment Failed",
          description: "Card was declined",
          variant: "destructive",
        });
      });

      expect(mockError).toHaveBeenCalledWith("Payment Failed", {
        description: "Card was declined",
      });
    });

    it("defaults to error message when no title or description", () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast({ variant: "destructive" });
      });

      expect(mockError).toHaveBeenCalledWith("An error occurred", {
        description: undefined,
      });
    });
  });

  describe("multiple toasts", () => {
    it("can fire multiple toasts in sequence", () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast({ title: "First" });
        result.current.toast({ title: "Second" });
        result.current.toast({ title: "Third", variant: "destructive" });
      });

      expect(mockSuccess).toHaveBeenCalledTimes(2);
      expect(mockError).toHaveBeenCalledTimes(1);
    });

    it("fires success and error toasts independently", () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast({ title: "Saved!" });
      });

      expect(mockSuccess).toHaveBeenCalledWith("Saved!", {
        description: undefined,
      });
      expect(mockError).not.toHaveBeenCalled();

      vi.clearAllMocks();

      act(() => {
        result.current.toast({
          title: "Error!",
          variant: "destructive",
        });
      });

      expect(mockError).toHaveBeenCalledWith("Error!", {
        description: undefined,
      });
      expect(mockSuccess).not.toHaveBeenCalled();
    });
  });

  describe("description handling", () => {
    it("shows description only when both title and description are present (success)", () => {
      const { result } = renderHook(() => useToast());

      // Title only - no description in sonner
      act(() => {
        result.current.toast({ title: "Title Only" });
      });

      expect(mockSuccess).toHaveBeenCalledWith("Title Only", {
        description: undefined,
      });

      vi.clearAllMocks();

      // Both title and description - description shown
      act(() => {
        result.current.toast({
          title: "Has Title",
          description: "Has Desc",
        });
      });

      expect(mockSuccess).toHaveBeenCalledWith("Has Title", {
        description: "Has Desc",
      });
    });

    it("shows description only when both title and description are present (error)", () => {
      const { result } = renderHook(() => useToast());

      // Description only - used as first arg, no description in options
      act(() => {
        result.current.toast({
          description: "Error details",
          variant: "destructive",
        });
      });

      expect(mockError).toHaveBeenCalledWith("Error details", {
        description: undefined,
      });

      vi.clearAllMocks();

      // Both present
      act(() => {
        result.current.toast({
          title: "Error Title",
          description: "Error Details",
          variant: "destructive",
        });
      });

      expect(mockError).toHaveBeenCalledWith("Error Title", {
        description: "Error Details",
      });
    });
  });
});
