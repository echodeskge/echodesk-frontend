/**
 * Kanban card (plan FE-07: U3, E25/RM7, W38–W42, DC16).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TicketCard } from "@/app/(tenant)/tickets/_components/board/ticket-card";
import { renderIntl } from "../primitives/render";
import { makeCard } from "./fixtures";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
}));

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

beforeEach(() => push.mockReset());

function card(overrides = {}) {
  return makeCard(42, 10, 0, {
    title: "Customer can't log in",
    priority: "high",
    tags: [{ id: 1, name: "Login", color: "#8b5cf6" }],
    assignees: [{ id: 3, name: "Giorgi Kapanadze" }],
    comments_count: 2,
    attachments_count: 1,
    created_at: "2026-11-05T09:00:00Z",
    ...overrides,
  });
}

describe("TicketCard rows", () => {
  it("renders id, translated priority, labels, title, avatars, comments, attachments and date", () => {
    renderIntl(<TicketCard card={card()} />);
    const el = screen.getByTestId("ticket-card");
    expect(el).toHaveAttribute("data-ticket-id", "42");
    expect(within(el).getByText("#42")).toBeInTheDocument();
    // W38: the label, not the raw value.
    expect(el.querySelector('[data-slot="priority-pill"]')).toHaveTextContent("High");
    expect(within(el).getByText("Login")).toBeInTheDocument();
    expect(within(el).getByTestId("card-title")).toHaveTextContent("Customer can't log in");
    expect(within(el).getByRole("img", { name: "Giorgi Kapanadze" })).toBeInTheDocument();
    expect(within(el).getByTestId("card-comments")).toHaveAccessibleName("2 comments");
    expect(within(el).getByTestId("card-attachments")).toHaveAccessibleName("1 attachment");
    expect(within(el).getByTestId("card-date")).toHaveTextContent("Nov 5");
  });

  it("translates critical (not grey, not raw)", () => {
    renderIntl(<TicketCard card={card({ priority: "critical" })} />);
    const pill = screen.getByTestId("ticket-card").querySelector('[data-slot="priority-pill"]');
    expect(pill).toHaveTextContent("Critical");
    expect(pill).toHaveStyle({ color: "#dc3545" });
  });

  it("shows overdue with an icon and the word, not colour alone", () => {
    renderIntl(<TicketCard card={card({ due_date: "2026-11-01", is_overdue_task: true })} />);
    const chip = screen.getByTestId("ticket-card").querySelector('[data-slot="due-chip"]')!;
    expect(chip).toHaveAttribute("data-overdue", "true");
    expect(chip).toHaveTextContent("Overdue");
    expect(chip.querySelector("svg")).not.toBeNull();
  });

  describe("date-only due string in a negative-offset timezone", () => {
    const originalTz = process.env.TZ;
    afterEach(() => {
      process.env.TZ = originalTz;
    });
    it("renders the same calendar day", () => {
      process.env.TZ = "America/Los_Angeles";
      expect(new Date("2026-11-12").getDate()).toBe(11); // the trap the formatter avoids
      renderIntl(<TicketCard card={card({ due_date: "2026-11-12", is_overdue_task: false })} />);
      const chip = screen.getByTestId("ticket-card").querySelector('[data-slot="due-chip"]')!;
      expect(chip).toHaveTextContent("Nov 12");
      expect(chip).toHaveAttribute("data-overdue", "false");
    });
  });

  it("shows checklist n/m only when the ticket has a checklist", () => {
    const { unmount } = renderIntl(
      <TicketCard card={card({ checklist_items_count: 5, completed_checklist_items_count: 2 })} />,
    );
    expect(screen.getByTestId("ticket-card").querySelector('[data-slot="checklist-count"]')).toHaveTextContent("2/5");
    unmount();
    renderIntl(<TicketCard card={card({ checklist_items_count: 0, completed_checklist_items_count: 0 })} />);
    expect(screen.getByTestId("ticket-card").querySelector('[data-slot="checklist-count"]')).toBeNull();
  });

  it("always shows the comment count (0 too) and the attachment count only when > 0", () => {
    renderIntl(<TicketCard card={card({ comments_count: 0, attachments_count: 0 })} />);
    expect(screen.getByTestId("card-comments")).toHaveTextContent("0");
    expect(screen.queryByTestId("card-attachments")).toBeNull();
  });

  it("formats the date in Georgian", () => {
    renderIntl(<TicketCard card={card()} />, "ka");
    expect(screen.getByTestId("card-date")).toHaveTextContent("5 ნოე");
    expect(screen.getByTestId("ticket-card").querySelector('[data-slot="priority-pill"]')).toHaveTextContent("მაღალი");
  });

  it("caps labels at 3 and collapses the rest into +n", () => {
    const tags = [1, 2, 3, 4, 5].map((i) => ({ id: i, name: `L${i}`, color: "#000000" }));
    renderIntl(<TicketCard card={card({ tags })} />);
    const el = screen.getByTestId("ticket-card");
    expect(el.querySelectorAll('[data-slot="label-chip"]')).toHaveLength(3);
    expect(el.querySelector('[data-slot="label-chips-more"]')).toHaveTextContent("+2");
  });

  it("shows the dashed unassigned circle without assignees", () => {
    renderIntl(<TicketCard card={card({ assignees: [] })} />);
    expect(screen.getByRole("img", { name: "Unassigned" })).toHaveAttribute("data-slot", "avatar-empty");
  });

  it("shows a presence ring with a tooltip when someone edits or moves the card", () => {
    const { unmount } = renderIntl(<TicketCard card={card()} presence={{ kind: "editing", userName: "Nino Beridze" }} />);
    expect(screen.getByTestId("ticket-card")).toHaveAttribute("data-presence", "editing");
    expect(screen.getByTestId("card-presence")).toHaveAccessibleName("Nino Beridze is editing");
    unmount();
    renderIntl(<TicketCard card={card()} presence={{ kind: "moving", userName: "Nino Beridze" }} />);
    expect(screen.getByTestId("card-presence")).toHaveAccessibleName("Nino Beridze is moving");
  });

  it("opens the description preview after 300ms of hover", async () => {
    const user = userEvent.setup();
    renderIntl(<TicketCard card={card({ description_preview: "Steps: reset password, then sign in." })} />);
    await user.hover(screen.getByTestId("card-title"));
    expect(screen.queryByTestId("card-preview")).toBeNull();
    expect(await screen.findByTestId("card-preview", {}, { timeout: 1500 })).toHaveTextContent(
      "Steps: reset password, then sign in.",
    );
  });
});

describe("TicketCard actions (RM7)", () => {
  it("the ⋮ button is reachable by Tab and opens Open / Copy link", async () => {
    const user = userEvent.setup();
    renderIntl(<TicketCard card={card()} tabIndex={0} />);
    await user.tab(); // the card itself
    expect(screen.getByTestId("ticket-card")).toHaveFocus();
    await user.tab();
    const trigger = screen.getByTestId("card-menu-trigger");
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAccessibleName("Ticket actions");
    await user.keyboard("{Enter}");
    expect(await screen.findByTestId("card-menu-open")).toHaveTextContent("Open");
    expect(screen.getByTestId("card-menu-copy")).toHaveTextContent("Copy link");
    expect(screen.queryByTestId("card-menu-delete")).toBeNull();
  });

  it("Shift+F10 on a focused card opens the menu", async () => {
    renderIntl(<TicketCard card={card()} tabIndex={0} canDelete />);
    const el = screen.getByTestId("ticket-card");
    el.focus();
    fireEvent.keyDown(el, { key: "F10", shiftKey: true });
    expect(await screen.findByTestId("card-menu-delete")).toHaveTextContent("Delete");
  });

  it("the ContextMenu key opens the menu too", async () => {
    renderIntl(<TicketCard card={card()} tabIndex={0} />);
    const el = screen.getByTestId("ticket-card");
    el.focus();
    fireEvent.keyDown(el, { key: "ContextMenu" });
    expect(await screen.findByTestId("card-menu-open")).toBeInTheDocument();
  });

  it("right-click opens the context menu with the same actions", async () => {
    renderIntl(<TicketCard card={card()} canDelete />);
    fireEvent.contextMenu(screen.getByTestId("ticket-card"));
    const menu = await screen.findByTestId("card-context-menu");
    expect(within(menu).getByText("Open")).toBeInTheDocument();
    expect(within(menu).getByText("Copy link")).toBeInTheDocument();
    expect(within(menu).getByText("Delete")).toBeInTheDocument();
  });

  it("Delete is gated and calls onDelete", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    renderIntl(<TicketCard card={card()} canDelete onDelete={onDelete} />);
    await user.click(screen.getByTestId("card-menu-trigger"));
    await user.click(await screen.findByTestId("card-menu-delete"));
    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 42 }));
    expect(push).not.toHaveBeenCalled();
  });

  it("Copy link writes the ticket URL and toasts", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    renderIntl(<TicketCard card={card()} />);
    await user.click(screen.getByTestId("card-menu-trigger"));
    await user.click(await screen.findByTestId("card-menu-copy"));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("http://tenant.test.com/tickets/42"));
    expect(toast.success).toHaveBeenCalledWith("Link copied");
  });
});

describe("TicketCard open (W41)", () => {
  it("a click opens /tickets/{id}?<filters>", () => {
    renderIntl(<TicketCard card={card()} query="board=1&priority=high" />);
    fireEvent.click(screen.getByTestId("card-title"));
    expect(push).toHaveBeenCalledWith("/tickets/42?board=1&priority=high");
  });

  it("without filters the URL has no query", () => {
    renderIntl(<TicketCard card={card()} />);
    fireEvent.click(screen.getByTestId("ticket-card"));
    expect(push).toHaveBeenCalledWith("/tickets/42");
  });

  it("ignores clicks on the ⋮ button and on menu items", async () => {
    const user = userEvent.setup();
    renderIntl(<TicketCard card={card()} query="board=1" />);
    await user.click(screen.getByTestId("card-menu-trigger"));
    expect(push).not.toHaveBeenCalled();
    await user.click(await screen.findByTestId("card-menu-open"));
    expect(push).toHaveBeenCalledTimes(1); // the Open item itself, not a second card click
    expect(push).toHaveBeenCalledWith("/tickets/42?board=1");
  });

  it("Enter on a focused card opens it", () => {
    renderIntl(<TicketCard card={card()} tabIndex={0} />);
    const el = screen.getByTestId("ticket-card");
    el.focus();
    fireEvent.keyDown(el, { key: "Enter" });
    expect(push).toHaveBeenCalledWith("/tickets/42");
  });
});
