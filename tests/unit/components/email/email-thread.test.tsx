/**
 * Conversation view in the reading pane: every message of the thread,
 * oldest → newest, earlier ones collapsed, the latest expanded.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { EmailMessage } from "@/hooks/api/useSocial";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));
// Each expanded message renders its full content — stub it to a marker.
vi.mock("@/app/(tenant)/email/_components/email-view-content", () => ({
  EmailViewContent: ({ email }: { email: EmailMessage }) => (
    <div data-testid={`expanded-${email.id}`}>{email.subject}</div>
  ),
}));

import { EmailThread } from "@/app/(tenant)/email/_components/email-thread";
import { sortThreadMessages } from "@/lib/email-reading";

function msg(id: number, timestamp: string, overrides: Partial<EmailMessage> = {}): EmailMessage {
  return {
    id,
    timestamp,
    subject: `Subject ${id}`,
    from_name: `Sender ${id}`,
    from_email: `s${id}@x.com`,
    body_text: `Body ${id}`,
    body_html: "",
    folder: "INBOX",
    is_read: true,
    attachments: [],
    to_emails: [],
    ...overrides,
  } as EmailMessage;
}

describe("EmailThread", () => {
  const received = msg(1, "2026-01-01T09:00:00Z");
  const ourReply = msg(2, "2026-01-01T10:00:00Z", {
    folder: "Sent",
    is_from_business: true,
    from_name: "Us",
  });
  const followUp = msg(3, "2026-01-02T09:00:00Z");

  it("renders oldest → newest with only the latest expanded", () => {
    const messages = sortThreadMessages([followUp, received, ourReply]);
    render(<EmailThread messages={messages} openedId={3} filter="INBOX" />);

    const items = screen.getAllByTestId(/^thread-message-/);
    expect(items.map((el) => el.getAttribute("data-testid"))).toEqual([
      "thread-message-1",
      "thread-message-2",
      "thread-message-3",
    ]);
    expect(screen.getByTestId("expanded-3")).toBeInTheDocument();
    expect(screen.queryByTestId("expanded-1")).toBeNull();
    expect(screen.queryByTestId("expanded-2")).toBeNull();
    // Collapsed rows show sender + snippet; our Sent reply is labelled with its folder.
    expect(screen.getByText("Body 1")).toBeInTheDocument();
    expect(screen.getByText("Us")).toBeInTheDocument();
    expect(screen.getByText("sentItems")).toBeInTheDocument();
  });

  it("also expands the message that was opened", () => {
    const messages = sortThreadMessages([received, ourReply, followUp]);
    render(<EmailThread messages={messages} openedId={1} filter="INBOX" />);
    expect(screen.getByTestId("expanded-1")).toBeInTheDocument();
    expect(screen.getByTestId("expanded-3")).toBeInTheDocument();
    expect(screen.queryByTestId("expanded-2")).toBeNull();
  });

  it("expands a collapsed message on click and collapses it again", () => {
    const messages = sortThreadMessages([received, followUp]);
    render(<EmailThread messages={messages} openedId={3} filter="INBOX" />);

    fireEvent.click(screen.getByTestId("thread-message-1"));
    expect(screen.getByTestId("expanded-1")).toBeInTheDocument();

    fireEvent.click(screen.getAllByText("collapse")[0]);
    expect(screen.queryByTestId("expanded-1")).toBeNull();
  });

  it("renders a single message expanded without collapse controls", () => {
    render(<EmailThread messages={[received]} openedId={1} filter="INBOX" />);
    expect(screen.getByTestId("expanded-1")).toBeInTheDocument();
    expect(screen.queryByText("collapse")).toBeNull();
  });
});
