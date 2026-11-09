import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));

const post = vi.fn();
vi.mock("@/api/axios", () => ({
  default: { post: (...args: unknown[]) => post(...args), get: vi.fn() },
  getApiUrl: () => "http://api.test",
}));

import { MessageBubbleContentImages } from "@/components/chat/message-bubble-content-images";
import {
  __resetAttachmentRefreshCache,
  buildUrlReplacements,
} from "@/services/socialAttachmentRefresh";

const EXPIRED = "https://scontent.xx.fbcdn.net/v/t1/a.jpg?oe=1";
const MIRRORED = "https://spaces.test/media/social/amanati/facebook/2026/06/abc.jpg";

function renderImages(platform = "facebook", mid = "m_1") {
  return render(
    <MessageBubbleContentImages
      images={[{ name: "image", url: EXPIRED, size: 0, type: "image" }]}
      message={{ platformMessageId: mid, platform: platform as "facebook" }}
      platform={platform}
    />
  );
}

beforeEach(() => {
  __resetAttachmentRefreshCache();
  post.mockReset();
});

describe("chat image expired-link refresh", () => {
  it("refreshes once on error and swaps in the mirrored URL", async () => {
    post.mockResolvedValue({
      data: {
        id: 7,
        message_id: "m_1",
        platform: "facebook",
        mirrored: 1,
        attachments: [{ type: "image", url: MIRRORED, source_url: EXPIRED }],
        attachment_url: MIRRORED,
        attachment_type: "image",
      },
    });
    renderImages();
    const img = screen.getByRole("img", { name: "image" });
    await act(async () => {
      fireEvent.error(img);
      fireEvent.error(img); // a second error event must not trigger another call
    });

    await waitFor(() => expect(screen.getByRole("img", { name: "image" })).toHaveAttribute("src", MIRRORED));
    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith("/api/social/attachments/refresh/", {
      platform: "facebook",
      message_id: "m_1",
    });
    expect(screen.queryByText("imageUnavailable")).not.toBeInTheDocument();
  });

  it("shows the placeholder when the refreshed copy also fails", async () => {
    post.mockResolvedValue({
      data: { attachments: [{ type: "image", url: MIRRORED, source_url: EXPIRED }], attachment_url: MIRRORED },
    });
    renderImages();
    await act(async () => {
      fireEvent.error(screen.getByRole("img", { name: "image" }));
    });
    const swapped = await screen.findByRole("img", { name: "image" });
    await waitFor(() => expect(swapped).toHaveAttribute("src", MIRRORED));
    await act(async () => {
      fireEvent.error(screen.getByRole("img", { name: "image" }));
    });

    expect(await screen.findByText("imageUnavailable")).toBeInTheDocument();
    expect(post).toHaveBeenCalledTimes(1);
  });

  it("shows the placeholder when the refresh fails, and never retries", async () => {
    post.mockRejectedValue({ response: { status: 410 } });
    const { unmount } = renderImages();
    await act(async () => {
      fireEvent.error(screen.getByRole("img", { name: "image" }));
    });
    expect(await screen.findByText("imageUnavailable")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "View image" })).not.toBeInTheDocument();

    // Re-mounting the same message (scroll / chat switch) reuses the outcome.
    unmount();
    renderImages();
    await act(async () => {
      fireEvent.error(screen.getByRole("img", { name: "image" }));
    });
    expect(await screen.findByText("imageUnavailable")).toBeInTheDocument();
    expect(post).toHaveBeenCalledTimes(1);
  });

  it("does not call the endpoint for non-Meta platforms", async () => {
    renderImages("telegram");
    await act(async () => {
      fireEvent.error(screen.getByRole("img", { name: "image" }));
    });
    expect(await screen.findByText("imageUnavailable")).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });

  it("caps a lone tall image instead of stretching it", () => {
    renderImages();
    const img = screen.getByRole("img", { name: "image" });
    expect(img.className).toContain("max-h-80");
    expect(img.className).toContain("object-contain");
  });
});

describe("buildUrlReplacements", () => {
  it("matches by source_url, then by position", () => {
    const out = buildUrlReplacements(["a", "b"], {
      id: 1, message_id: "m", platform: "instagram", mirrored: 2, attachment_type: "image",
      attachment_url: "A",
      attachments: [
        { type: "image", url: "B", source_url: "b" },
        { type: "image", url: "A2" },
      ],
    });
    expect(out).toEqual({ b: "B", a: "A2" });
  });
});
