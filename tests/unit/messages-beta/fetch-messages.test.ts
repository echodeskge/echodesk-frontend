/**
 * Tests for fetchMessagesForChat's per-platform attribution remap.
 *
 * Regression guard: the /facebook-messages/ endpoint returns FB's native
 * `is_from_page`, but the chat adapter reads `is_from_business`. Without a
 * remap, agent-sent FB messages render as INCOMING (customer side) for
 * every viewer — reported live: amanatillc sent to a customer, gordogordel
 * saw it as an incoming message.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

import { fetchMessagesForChat } from "@/components/messages-beta/store/rest-bootstrap";

const getMock = vi.hoisted(() => vi.fn());

vi.mock("@/api/axios", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/axios")>();
  return {
    ...actual,
    default: { get: getMock },
  };
});

beforeEach(() => {
  getMock.mockReset();
});

describe("fetchMessagesForChat – facebook attribution", () => {
  it("maps is_from_page → business sender so agent messages render outgoing", async () => {
    getMock.mockResolvedValue({
      data: {
        results: [
          {
            id: "1",
            platform: "facebook",
            message_text: "agent reply",
            sender_id: "cust_1", // FB stores the customer as sender_id even on agent sends
            is_from_page: true, // the real signal that this is business-sent
            timestamp: "2024-06-01T10:00:00Z",
          },
          {
            id: "2",
            platform: "facebook",
            message_text: "customer question",
            sender_id: "cust_1",
            is_from_page: false,
            timestamp: "2024-06-01T10:01:00Z",
          },
        ],
      },
    });

    const msgs = await fetchMessagesForChat("fb_pageA_cust_1", "facebook");

    const agentMsg = msgs.find((m) => m.text === "agent reply");
    const customerMsg = msgs.find((m) => m.text === "customer question");
    // Agent message must resolve to the "business" sender so the thread
    // renders it on the outgoing side for every viewer.
    expect(agentMsg?.senderId).toBe("business");
    // Customer message stays attributed to the customer.
    expect(customerMsg?.senderId).not.toBe("business");
  });
});

describe("fetchConversationsPage – archived (History) list", () => {
  it("sends ?archived=true when archived flag is set", async () => {
    getMock.mockResolvedValue({ data: { results: [], next: null } });
    const { fetchConversationsPage } = await import(
      "@/components/messages-beta/store/rest-bootstrap"
    );
    await fetchConversationsPage({ platforms: ["facebook"], archived: true, pageSize: 100 });
    const [, opts] = getMock.mock.calls[getMock.mock.calls.length - 1];
    expect(opts.params.archived).toBe("true");
    expect(opts.params.page_size).toBe(100);
  });

  it("omits archived param for the normal active list", async () => {
    getMock.mockResolvedValue({ data: { results: [], next: null } });
    const { fetchConversationsPage } = await import(
      "@/components/messages-beta/store/rest-bootstrap"
    );
    await fetchConversationsPage({ platforms: ["facebook"] });
    const [, opts] = getMock.mock.calls[getMock.mock.calls.length - 1];
    expect(opts.params.archived).toBeUndefined();
  });
});
