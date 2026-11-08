/**
 * Reading-pane Assign dropdown and Create ticket button.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import type { EmailMessage } from "@/hooks/api/useSocial";

const assignMutate = vi.fn();
const createMutate = vi.fn();
const toast = vi.fn();
const sonnerSuccess = vi.fn();
const users = [
  { id: 1, name: "Nino Beridze", initials: "NB", email: "nino@x.ge" },
  { id: 2, name: "Giorgi K", initials: "GK", email: "g@x.ge" },
];
let featureKeys: unknown = ["ticket_management"];
let permissions: string[] = ["create_tickets"];
const assignableEnabled = vi.fn();

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) =>
    params ? `${key}:${JSON.stringify(params)}` : key,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));
vi.mock("sonner", () => ({ toast: { success: (...a: unknown[]) => sonnerSuccess(...a) } }));
vi.mock("@/hooks/useUserProfile", () => ({
  useUserProfile: () => ({ data: { feature_keys: featureKeys, permissions_list: permissions } }),
}));
vi.mock("@/hooks/api/useSocial", () => ({
  useAssignEmailThread: () => ({ mutate: assignMutate, isPending: false }),
  useEmailAssignableUsers: (_id: number, opts?: { enabled?: boolean }) => {
    assignableEnabled(opts?.enabled);
    return { data: opts?.enabled ? users : [], isLoading: false };
  },
  useCreateTicketFromEmail: () => ({ mutate: createMutate, isPending: false }),
}));

import { EmailAssignMenu } from "@/app/(tenant)/email/_components/email-assign-menu";
import {
  EmailCreateTicketButton,
  hasFeatureKey,
} from "@/app/(tenant)/email/_components/email-create-ticket-button";

function email(overrides: Partial<EmailMessage> = {}): EmailMessage {
  return { id: 7, thread_id: "t-1", connection_id: 4, ...overrides } as EmailMessage;
}

describe("EmailAssignMenu", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads the agent list only once the dropdown opens", async () => {
    const user = userEvent.setup();
    render(<EmailAssignMenu email={email()} />);
    expect(assignableEnabled).toHaveBeenLastCalledWith(false);
    await user.click(screen.getByTestId("email-assign"));
    expect(assignableEnabled).toHaveBeenLastCalledWith(true);
  });

  it("assigns the conversation to the picked agent", async () => {
    assignMutate.mockImplementation((_v, opts) => opts.onSuccess({ assignee: users[1] }));
    const user = userEvent.setup();
    render(<EmailAssignMenu email={email()} />);

    await user.click(screen.getByTestId("email-assign"));
    await user.click(screen.getByRole("menuitem", { name: /Giorgi K/ }));

    expect(assignMutate).toHaveBeenCalledWith(
      { connection_id: 4, thread_id: "t-1", user_id: 2 },
      expect.any(Object)
    );
    expect(toast).toHaveBeenCalledWith({ title: 'assignedToToast:{"name":"Giorgi K"}' });
  });

  it("shows the current assignee and can unassign", async () => {
    assignMutate.mockImplementation((_v, opts) => opts.onSuccess({ assignee: null }));
    const user = userEvent.setup();
    render(<EmailAssignMenu email={email({ assignee: users[0] })} />);

    expect(screen.getByText("Nino Beridze")).toBeInTheDocument();
    await user.click(screen.getByTestId("email-assign"));
    await user.click(screen.getByRole("menuitem", { name: "unassign" }));
    expect(assignMutate).toHaveBeenCalledWith(
      { connection_id: 4, thread_id: "t-1", user_id: null },
      expect.any(Object)
    );
  });

  it("reports a failure with the server's message", async () => {
    assignMutate.mockImplementation((_v, opts) =>
      opts.onError({ isAxiosError: true, response: { data: { error: "Assignment mode is not enabled" } } })
    );
    const user = userEvent.setup();
    render(<EmailAssignMenu email={email()} />);
    await user.click(screen.getByTestId("email-assign"));
    await user.click(screen.getByRole("menuitem", { name: /Nino/ }));
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "assignFailed", variant: "destructive" })
    );
  });
});

describe("EmailCreateTicketButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    featureKeys = ["ticket_management"];
    permissions = ["create_tickets"];
  });

  it("creates a ticket from the conversation", () => {
    createMutate.mockImplementation((_v, opts) => opts.onSuccess({ ticket: { id: 55, title: "Hi" } }));
    render(<EmailCreateTicketButton email={email()} />);

    fireEvent.click(screen.getByTestId("email-create-ticket"));
    expect(createMutate).toHaveBeenCalledWith({ connection_id: 4, thread_id: "t-1" }, expect.any(Object));
    expect(sonnerSuccess).toHaveBeenCalledWith('ticketCreated:{"id":55}', expect.any(Object));
  });

  it("says 'already linked' when the thread already had a ticket", () => {
    createMutate.mockImplementation((_v, opts) =>
      opts.onSuccess({ ticket: { id: 9, title: "Hi" }, created: false })
    );
    render(<EmailCreateTicketButton email={email()} />);
    fireEvent.click(screen.getByTestId("email-create-ticket"));
    expect(sonnerSuccess).toHaveBeenCalledWith('ticketAlreadyLinked:{"id":9}', expect.any(Object));
  });

  it("is hidden without the create_tickets permission", () => {
    permissions = ["view_all_tickets"];
    render(<EmailCreateTicketButton email={email()} />);
    expect(screen.queryByTestId("email-create-ticket")).toBeNull();
  });

  it("shows the linked ticket instead of the button", () => {
    render(<EmailCreateTicketButton email={email({ ticket: { id: 12, title: "Printer" } })} />);
    expect(screen.queryByTestId("email-create-ticket")).toBeNull();
    expect(screen.getByRole("link", { name: /#12/ })).toHaveAttribute("href", "/tickets/12");
  });

  it("is hidden without the ticket_management feature", () => {
    featureKeys = JSON.stringify(["social_integrations"]);
    render(<EmailCreateTicketButton email={email()} />);
    expect(screen.queryByTestId("email-create-ticket")).toBeNull();
  });

  it("reads feature keys from arrays and JSON strings", () => {
    expect(hasFeatureKey(["a", "ticket_management"], "ticket_management")).toBe(true);
    expect(hasFeatureKey('["ticket_management"]', "ticket_management")).toBe(true);
    expect(hasFeatureKey("not json", "ticket_management")).toBe(false);
    expect(hasFeatureKey(undefined, "ticket_management")).toBe(false);
  });
});
