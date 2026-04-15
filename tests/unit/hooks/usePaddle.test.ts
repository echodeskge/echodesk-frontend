/**
 * Tests for usePaddle hook (src/hooks/usePaddle.ts).
 * Tests Paddle SDK initialization, checkout opening, and error handling.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

// Store original env values
const ORIGINAL_ENV = { ...process.env };

describe("usePaddle", () => {
  let appendChildSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset window.Paddle
    delete (window as any).Paddle;
    // Spy on document.head.appendChild
    appendChildSpy = vi.spyOn(document.head, "appendChild").mockImplementation((node) => node);
    // Set env defaults
    process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT = "sandbox";
    process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN = "test_client_token";
  });

  afterEach(() => {
    appendChildSpy.mockRestore();
    process.env = { ...ORIGINAL_ENV };
    // Reset module cache so initializedRef resets between tests
    vi.resetModules();
  });

  async function importAndRender(options?: {
    environment?: string;
    clientToken?: string;
  }) {
    const { usePaddle } = await import("@/hooks/usePaddle");
    return renderHook(() => usePaddle(options));
  }

  it("creates a script tag to load Paddle.js", async () => {
    const { result } = await importAndRender();

    expect(appendChildSpy).toHaveBeenCalled();
    const scriptEl = appendChildSpy.mock.calls[0][0] as HTMLScriptElement;
    expect(scriptEl.src).toContain("paddle.com/paddle/v2/paddle.js");
    expect(scriptEl.async).toBe(true);
  });

  it("initializes with isLoaded false and isLoading true", async () => {
    const { result } = await importAndRender();

    // Before script onload fires, isLoading should be true
    expect(result.current.isLoaded).toBe(false);
  });

  it("sets isLoaded true after script loads and Paddle exists", async () => {
    const mockPaddle = {
      Environment: { set: vi.fn() },
      Initialize: vi.fn(),
      Checkout: { open: vi.fn() },
    };

    // Capture the script element so we can fire onload
    let capturedScript: HTMLScriptElement | null = null;
    appendChildSpy.mockImplementation((node) => {
      capturedScript = node as HTMLScriptElement;
      return node;
    });

    const { result } = await importAndRender();

    // Simulate Paddle being available on window when script loads
    (window as any).Paddle = mockPaddle;

    await act(async () => {
      capturedScript?.onload?.(new Event("load"));
    });

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockPaddle.Environment.set).toHaveBeenCalledWith("sandbox");
    expect(mockPaddle.Initialize).toHaveBeenCalledWith({
      token: "test_client_token",
    });
  });

  it("uses custom environment and client token from options", async () => {
    const mockPaddle = {
      Environment: { set: vi.fn() },
      Initialize: vi.fn(),
      Checkout: { open: vi.fn() },
    };

    let capturedScript: HTMLScriptElement | null = null;
    appendChildSpy.mockImplementation((node) => {
      capturedScript = node as HTMLScriptElement;
      return node;
    });

    await importAndRender({
      environment: "production",
      clientToken: "live_token_xyz",
    });

    (window as any).Paddle = mockPaddle;

    await act(async () => {
      capturedScript?.onload?.(new Event("load"));
    });

    expect(mockPaddle.Environment.set).toHaveBeenCalledWith("production");
    expect(mockPaddle.Initialize).toHaveBeenCalledWith({
      token: "live_token_xyz",
    });
  });

  it("handles script load error gracefully", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    let capturedScript: HTMLScriptElement | null = null;
    appendChildSpy.mockImplementation((node) => {
      capturedScript = node as HTMLScriptElement;
      return node;
    });

    const { result } = await importAndRender();

    await act(async () => {
      capturedScript?.onerror?.(new Event("error"));
    });

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });

    expect(consoleSpy).toHaveBeenCalledWith("Failed to load Paddle.js");
    consoleSpy.mockRestore();
  });

  it("skips loading when Paddle is already on window", async () => {
    (window as any).Paddle = {
      Environment: { set: vi.fn() },
      Initialize: vi.fn(),
      Checkout: { open: vi.fn() },
    };

    const { result } = await importAndRender();

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    // Should not append a new script tag
    expect(appendChildSpy).not.toHaveBeenCalled();
  });

  it("skips loading when clientToken is empty", async () => {
    process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN = "";

    const { result } = await importAndRender({ clientToken: "" });

    expect(appendChildSpy).not.toHaveBeenCalled();
    expect(result.current.isLoaded).toBe(false);
  });

  it("openCheckout calls Paddle.Checkout.open with correct params", async () => {
    const mockOpen = vi.fn();
    (window as any).Paddle = {
      Environment: { set: vi.fn() },
      Initialize: vi.fn(),
      Checkout: { open: mockOpen },
    };

    const { result } = await importAndRender();

    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    act(() => {
      result.current.openCheckout({
        transactionId: "txn_123",
        successUrl: "https://example.com/success",
        locale: "ka",
      });
    });

    expect(mockOpen).toHaveBeenCalledWith({
      transactionId: "txn_123",
      settings: {
        successUrl: "https://example.com/success",
        displayMode: "overlay",
        theme: "light",
        locale: "ka",
      },
    });
  });

  it("openCheckout defaults locale to en", async () => {
    const mockOpen = vi.fn();
    (window as any).Paddle = {
      Environment: { set: vi.fn() },
      Initialize: vi.fn(),
      Checkout: { open: mockOpen },
    };

    const { result } = await importAndRender();

    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    act(() => {
      result.current.openCheckout({ transactionId: "txn_456" });
    });

    expect(mockOpen).toHaveBeenCalledWith(
      expect.objectContaining({
        settings: expect.objectContaining({
          locale: "en",
        }),
      })
    );
  });

  it("openCheckout logs error when Paddle is not loaded", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Ensure Paddle is not on window
    delete (window as any).Paddle;

    const { result } = await importAndRender({ clientToken: "" });

    act(() => {
      result.current.openCheckout({ transactionId: "txn_789" });
    });

    expect(consoleSpy).toHaveBeenCalledWith("Paddle.js not loaded");
    consoleSpy.mockRestore();
  });
});
