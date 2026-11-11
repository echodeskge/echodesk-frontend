/**
 * Shared loader for auth-proxied WhatsApp media (Sentry "N+1 API call
 * /api/social/whatsapp-media/*" on /social/messages/:id): one request per
 * media id, shared blob URLs, and tiles that only load once they scroll
 * near the viewport.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";

vi.mock("@/api/axios", () => ({ default: { get: vi.fn() } }));

import axios from "@/api/axios";
import {
  authenticatedMediaKey,
  clearAuthenticatedMediaCache,
  loadAuthenticatedMedia,
  needsAuthFetch,
  peekAuthenticatedMedia,
  useAuthenticatedMedia,
} from "@/lib/authenticated-media";
import { MediaGrid } from "@/components/ui/media-grid";

const mockGet = vi.mocked(axios.get);
const SRC_A = "https://demo.api.echodesk.ge/api/social/whatsapp-media/111/?waba_id=9";
const SRC_A_OTHER_HOST = "/api/social/whatsapp-media/111/?waba_id=10";
const SRC_B = "/api/social/whatsapp-media/222/?waba_id=9";

let blobCounter = 0;

beforeEach(() => {
  vi.clearAllMocks();
  clearAuthenticatedMediaCache();
  blobCounter = 0;
  URL.createObjectURL = vi.fn(() => `blob:mock-${++blobCounter}`);
  URL.revokeObjectURL = vi.fn();
  mockGet.mockImplementation(async () => ({ data: new Blob(["bytes"]) }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("authenticatedMediaKey / needsAuthFetch", () => {
  it("keys WhatsApp proxy URLs by media id, other URLs by themselves", () => {
    expect(authenticatedMediaKey(SRC_A)).toBe("whatsapp:111");
    expect(authenticatedMediaKey(SRC_A_OTHER_HOST)).toBe("whatsapp:111");
    expect(authenticatedMediaKey(SRC_B)).toBe("whatsapp:222");
    expect(authenticatedMediaKey("https://cdn.example.com/a.png")).toBe("https://cdn.example.com/a.png");
  });

  it("only proxy URLs need the authenticated fetch", () => {
    expect(needsAuthFetch(SRC_A)).toBe(true);
    expect(needsAuthFetch("https://cdn.example.com/a.png")).toBe(false);
    expect(needsAuthFetch(undefined)).toBe(false);
  });
});

describe("loadAuthenticatedMedia", () => {
  it("dedupes concurrent and later loads of the same media id", async () => {
    const [a1, a2, a3] = await Promise.all([
      loadAuthenticatedMedia(SRC_A),
      loadAuthenticatedMedia(SRC_A),
      loadAuthenticatedMedia(SRC_A_OTHER_HOST),
    ]);
    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledWith(SRC_A, { responseType: "blob" });
    expect(a1).toBe("blob:mock-1");
    expect(a2).toBe(a1);
    expect(a3).toBe(a1);

    await loadAuthenticatedMedia(SRC_A);
    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(peekAuthenticatedMedia(SRC_A)).toBe("blob:mock-1");

    await loadAuthenticatedMedia(SRC_B);
    expect(mockGet).toHaveBeenCalledTimes(2);
  });

  it("does not cache a failure, so the next load retries", async () => {
    mockGet.mockRejectedValueOnce(new Error("401"));
    await expect(loadAuthenticatedMedia(SRC_A)).rejects.toThrow("401");
    expect(peekAuthenticatedMedia(SRC_A)).toBeNull();
    await expect(loadAuthenticatedMedia(SRC_A)).resolves.toBe("blob:mock-1");
    expect(mockGet).toHaveBeenCalledTimes(2);
  });
});

function Tile({ src }: { src: string }) {
  const { blobUrl, error, ref } = useAuthenticatedMedia(src);
  if (error) return <div data-testid="error" />;
  if (!blobUrl) return <div ref={ref} data-testid="placeholder" />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img alt="" src={blobUrl} data-testid="img" />;
}

type IOCallback = (entries: Array<{ isIntersecting: boolean }>) => void;

describe("useAuthenticatedMedia", () => {
  it("defers the request until the element enters the viewport", async () => {
    const observed: Array<{ el: Element; cb: IOCallback }> = [];
    class FakeIO {
      cb: IOCallback;
      constructor(cb: IOCallback) {
        this.cb = cb;
      }
      observe(el: Element) {
        observed.push({ el, cb: this.cb });
      }
      disconnect() {}
      unobserve() {}
    }
    vi.stubGlobal("IntersectionObserver", FakeIO);

    render(
      <>
        <Tile src={SRC_A} />
        <Tile src={SRC_B} />
      </>,
    );
    expect(screen.getAllByTestId("placeholder")).toHaveLength(2);
    expect(observed).toHaveLength(2);
    expect(mockGet).not.toHaveBeenCalled();

    // Only the first tile scrolls into view.
    await act(async () => {
      observed[0].cb([{ isIntersecting: true }]);
    });
    await waitFor(() => expect(screen.getAllByTestId("img")).toHaveLength(1));
    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledWith(SRC_A, { responseType: "blob" });
    expect(screen.getAllByTestId("placeholder")).toHaveLength(1);
  });

  it("loads immediately without IntersectionObserver and shares one request per media id", async () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    render(
      <>
        <Tile src={SRC_A} />
        <Tile src={SRC_A_OTHER_HOST} />
        <Tile src={SRC_A} />
      </>,
    );
    await waitFor(() => expect(screen.getAllByTestId("img")).toHaveLength(3));
    expect(mockGet).toHaveBeenCalledTimes(1);
    for (const img of screen.getAllByTestId("img")) expect(img).toHaveAttribute("src", "blob:mock-1");
  });

  it("renders a cache hit synchronously and surfaces failures", async () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    await loadAuthenticatedMedia(SRC_A);
    mockGet.mockClear();

    render(<Tile src={SRC_A} />);
    expect(screen.getByTestId("img")).toHaveAttribute("src", "blob:mock-1");
    expect(mockGet).not.toHaveBeenCalled();

    mockGet.mockRejectedValueOnce(new Error("404"));
    render(<Tile src={SRC_B} />);
    await waitFor(() => expect(screen.getByTestId("error")).toBeInTheDocument());
  });
});

describe("MediaGrid with proxy media", () => {
  it("fetches each attachment once across tiles and never revokes the shared blob on unmount", async () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const { unmount } = render(
      <MediaGrid
        data={[
          { src: SRC_A, alt: "one" },
          { src: SRC_A_OTHER_HOST, alt: "one again" },
          { src: SRC_B, alt: "two" },
        ]}
      />,
    );
    await waitFor(() => expect(document.querySelectorAll("img")).toHaveLength(3));
    expect(mockGet).toHaveBeenCalledTimes(2);
    unmount();
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    expect(peekAuthenticatedMedia(SRC_A)).toBe("blob:mock-1");
  });
});
