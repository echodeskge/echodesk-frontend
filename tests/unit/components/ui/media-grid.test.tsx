/**
 * Tests for MediaGrid video rendering.
 *
 * Regression guard for the WhatsApp chat bug where videos served through the
 * auth-protected media proxy (/api/social/whatsapp-media/...) never played:
 * a bare <video src> can't send the axios auth token, so the request 401s.
 * Proxy-hosted videos must be fetched via authenticated axios and rendered
 * from a blob URL (same as images via AuthenticatedImage). Direct/CDN video
 * URLs must keep using a plain <video src> with no extra fetch.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import React from "react";

vi.mock("@/api/axios", () => ({
  default: {
    get: vi.fn(),
  },
}));

import { MediaGrid } from "@/components/ui/media-grid";
import axios from "@/api/axios";

const mockAxiosGet = vi.mocked(axios.get);

const PROXY_SRC = "/api/social/whatsapp-media/123/?waba_id=99";
const DIRECT_SRC = "https://cdn.example.com/clip.mp4";

beforeEach(() => {
  vi.clearAllMocks();
  // jsdom has no real object-URL support
  URL.createObjectURL = vi.fn(() => "blob:mock-url");
  URL.revokeObjectURL = vi.fn();
});

describe("MediaGrid video", () => {
  it("fetches proxy-hosted video via authenticated axios and renders a blob URL", async () => {
    mockAxiosGet.mockResolvedValue({
      data: new Blob(["video-bytes"], { type: "video/mp4" }),
    });

    const { container } = render(
      <MediaGrid data={[{ src: PROXY_SRC, alt: "video", type: "VIDEO" }]} />
    );

    // The proxy URL is fetched with authentication (axios), as a blob.
    await waitFor(() =>
      expect(mockAxiosGet).toHaveBeenCalledWith(PROXY_SRC, {
        responseType: "blob",
      })
    );

    // Once resolved, a <video> renders from the blob URL — never the raw proxy URL.
    await waitFor(() => {
      const video = container.querySelector("video");
      expect(video).not.toBeNull();
      expect(video?.getAttribute("src")).toBe("blob:mock-url");
    });
  });

  it("renders a direct (non-proxy) video URL inline without an extra fetch", async () => {
    const { container } = render(
      <MediaGrid data={[{ src: DIRECT_SRC, alt: "video", type: "VIDEO" }]} />
    );

    await waitFor(() => {
      const video = container.querySelector("video");
      expect(video).not.toBeNull();
      expect(video?.getAttribute("src")).toBe(DIRECT_SRC);
    });

    expect(mockAxiosGet).not.toHaveBeenCalled();
  });
});
