/**
 * Clients screen redesign: header CTA, stats strip, tabs / channel chips /
 * search driving the list query, pagination, the detail rail (contact,
 * custom fields, activity, ticket, delete) and the helpers.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import React from "react";

import en from "@/i18n/messages/en.json";
import ka from "@/i18n/messages/ka.json";
import { HeaderActionsProvider, useHeaderSlot } from "@/contexts/HeaderActionsContext";

const mockUseSocialClients = vi.fn();
const mockClientDetail = vi.fn();
const mockDelete = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockCreateTicket = vi.fn();
const mockClientTickets = vi.fn();
const mockProfile = vi.fn();
const mockAccess = vi.fn();
const mockPush = vi.fn();
const mockToast = vi.hoisted(() => ({ success: vi.fn(), info: vi.fn(), error: vi.fn() }));

vi.mock("sonner", () => ({ toast: mockToast }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush }) }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@/hooks/useMyAccess", () => ({ useMyAccess: () => mockAccess() }));
vi.mock("@/hooks/useUserProfile", () => ({ useUserProfile: () => ({ data: mockProfile() }) }));
vi.mock("@/hooks/api/useSocialClients", () => ({
  useSocialClients: (filters: unknown) => mockUseSocialClients(filters),
  useSocialClient: (id: number) => ({ data: mockClientDetail(id), isLoading: false }),
  useSocialClientCustomFields: () => ({ data: { results: [{ name: "city", label: "City" }] } }),
  useCreateSocialClient: () => ({ mutateAsync: mockCreate, isPending: false }),
  useUpdateSocialClient: () => ({ mutateAsync: mockUpdate, isPending: false }),
  useDeleteSocialClient: () => ({ mutateAsync: mockDelete, isPending: false }),
  usePatchSocialClient: () => ({ mutate: vi.fn() }),
}));
vi.mock("@/hooks/api/useConversationTickets", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks/api/useConversationTickets")>();
  return {
    ...actual,
    useClientTickets: () => ({ data: mockClientTickets(), isLoading: false }),
    useCreateConversationTicket: () => ({ mutate: mockCreateTicket, isPending: false }),
  };
});

import { ClientsScreen, CLIENTS_PAGE_SIZE } from "@/app/(tenant)/social/clients/_components/clients-screen";
import {
  clientInitials,
  clientPageStats,
  clientPlatforms,
  pageRange,
  shortDate,
} from "@/app/(tenant)/social/clients/_components/clients-utils";

const rows = [
  {
    id: 1,
    name: "Nino Beridze",
    email: "nino@example.ge",
    phone: "+995555000111",
    tags: ["VIP"],
    platforms: ["whatsapp", "facebook"],
    social_accounts: [{ id: 11, platform: "whatsapp", display_name: "Nino", chat_id: "wa_waba1_995555000111" }],
    is_booking_enabled: true,
    is_verified: true,
    booking_count: 3,
    created_at: "2026-10-05T10:00:00Z",
  },
  {
    id: 2,
    name: "Levan",
    email: null,
    phone: null,
    tags: [],
    platforms: [],
    social_accounts: [],
    is_booking_enabled: false,
    created_at: "2026-11-01T10:00:00Z",
  },
];

const detail = {
  id: 1,
  name: "Nino Beridze",
  email: "nino@example.ge",
  phone: "+995555000111",
  notes: "Prefers mornings",
  tags: ["VIP"],
  custom_fields: { city: "Tbilisi" },
  social_accounts: [
    { id: 11, platform: "whatsapp", platform_id: "995555000111", account_connection_id: "waba1", display_name: "Nino" },
  ],
  is_booking_enabled: true,
  created_at: "2026-10-05T10:00:00Z",
};

function Header() {
  const slot = useHeaderSlot();
  return <div data-testid="header">{slot?.primary}</div>;
}

function renderScreen(messages: Record<string, unknown> = en, locale = "en") {
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <HeaderActionsProvider>
        <Header />
        <ClientsScreen />
      </HeaderActionsProvider>
    </NextIntlClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUseSocialClients.mockReturnValue({
    data: { count: 120, next: "?page=2", results: rows },
    isLoading: false,
    isFetching: false,
  });
  mockClientDetail.mockReturnValue(detail);
  mockClientTickets.mockReturnValue([{ id: 77, title: "Order issue" }]);
  mockProfile.mockReturnValue({ is_staff: true, feature_keys: ["ticket_management"] });
  mockAccess.mockReturnValue({ canManageSocialSettings: true });
});

describe("ClientsScreen", () => {
  it("puts the Create client CTA in the header and opens the form", () => {
    renderScreen();
    const cta = within(screen.getByTestId("header")).getByTestId("clients-create");
    fireEvent.click(cta);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText(/Name/)).toBeInTheDocument();
  });

  it("shows the stats strip, rows and the page range", () => {
    renderScreen();
    const stats = screen.getByTestId("clients-stats");
    expect(within(stats).getByText("120")).toBeInTheDocument();
    expect(screen.getAllByTestId("client-row")).toHaveLength(2);
    expect(screen.getByText("VIP")).toBeInTheDocument();
    expect(screen.getByText("Verified")).toBeInTheDocument();
    expect(screen.getByTestId("clients-range")).toHaveTextContent("1–50 of 120");
  });

  it("sends tab, channel and page filters to the list query", async () => {
    renderScreen();
    fireEvent.click(screen.getByRole("tab", { name: "Booking Enabled" }));
    fireEvent.click(screen.getByRole("button", { name: "WhatsApp" }));
    await waitFor(() =>
      expect(mockUseSocialClients).toHaveBeenLastCalledWith(
        expect.objectContaining({ client_type: "booking", platform: "whatsapp", page: 1, page_size: CLIENTS_PAGE_SIZE })
      )
    );
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    await waitFor(() => expect(mockUseSocialClients).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })));
  });

  it("debounces the search", async () => {
    vi.useFakeTimers();
    try {
      renderScreen();
      fireEvent.change(screen.getByRole("searchbox"), { target: { value: "nino" } });
      await act(async () => {
        vi.advanceTimersByTime(450);
      });
      expect(mockUseSocialClients).toHaveBeenLastCalledWith(expect.objectContaining({ search: "nino" }));
    } finally {
      vi.useRealTimers();
    }
  });

  it("opens the detail rail with contact, custom fields, activity and tickets", () => {
    renderScreen();
    fireEvent.click(screen.getAllByTestId("client-row")[0]);
    const rail = screen.getByTestId("client-detail-rail");
    expect(within(rail).getByText("Client details")).toBeInTheDocument();
    expect(within(rail).getByText("City")).toBeInTheDocument();
    expect(within(rail).getByText("Tbilisi")).toBeInTheDocument();
    expect(within(rail).getByText("Order issue").closest("a")).toHaveAttribute("href", "/tickets/77");
    expect(within(rail).getByText("Call").closest("a")).toHaveAttribute("href", "tel:+995555000111");
    fireEvent.click(within(rail).getByText("Open chat"));
    expect(mockPush).toHaveBeenCalledWith("/social/messages/wa_waba1_995555000111");
  });

  it("creates a ticket from the client's conversation", () => {
    renderScreen();
    fireEvent.click(screen.getAllByTestId("client-row")[0]);
    fireEvent.click(within(screen.getByTestId("client-detail-rail")).getByText("Ticket"));
    expect(mockCreateTicket).toHaveBeenCalledWith(
      { platform: "whatsapp", conversation_id: "995555000111", account_id: "waba1" },
      expect.any(Object)
    );
  });

  it("hides Ticket without the feature and Delete without the permission", () => {
    mockProfile.mockReturnValue({ is_staff: false, feature_keys: [] });
    mockAccess.mockReturnValue({ canManageSocialSettings: false });
    renderScreen();
    fireEvent.click(screen.getAllByTestId("client-row")[0]);
    const rail = screen.getByTestId("client-detail-rail");
    expect(within(rail).queryByText("Ticket")).toBeNull();
    expect(within(rail).queryByText("Delete client")).toBeNull();
  });

  it("deletes after confirming in a dialog and closes the rail", async () => {
    mockDelete.mockResolvedValue(undefined);
    renderScreen();
    fireEvent.click(screen.getAllByTestId("client-row")[0]);
    fireEvent.click(within(screen.getByTestId("client-detail-rail")).getByText("Delete client"));
    const confirm = await screen.findByRole("alertdialog");
    fireEvent.click(within(confirm).getByRole("button", { name: "Delete client" }));
    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith(1));
    await waitFor(() => expect(screen.queryByTestId("client-detail-rail")).toBeNull());
    expect(mockToast.success).toHaveBeenCalledWith("Client deleted");
  });

  it("edits from the rail without wiping notes", async () => {
    mockUpdate.mockResolvedValue({});
    renderScreen();
    fireEvent.click(screen.getAllByTestId("client-row")[0]);
    fireEvent.click(within(screen.getByTestId("client-detail-rail")).getByText("Edit"));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText(/Name/), { target: { value: "Nino B." } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save Changes" }));
    await waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith({
        id: 1,
        data: expect.objectContaining({ name: "Nino B.", notes: "Prefers mornings" }),
      })
    );
  });

  it("shows the empty state", () => {
    mockUseSocialClients.mockReturnValue({ data: { count: 0, results: [] }, isLoading: false, isFetching: false });
    renderScreen();
    expect(screen.getByTestId("clients-empty")).toBeInTheDocument();
  });

  it("renders in Georgian", () => {
    renderScreen(ka as Record<string, unknown>, "ka");
    expect(screen.getByRole("searchbox")).toHaveAttribute("placeholder", "ძებნა სახელით, ელფოსტით ან ტელეფონით…");
  });
});

describe("clients-utils", () => {
  it("computes initials, platforms, stats and ranges", () => {
    expect(clientInitials("ნინო ბერიძე")).toBe("ნბ");
    expect(clientInitials("")).toBe("?");
    expect(clientPlatforms(["whatsapp", "whatsapp", "nope"])).toEqual(["whatsapp"]);
    expect(clientPageStats(rows)).toEqual({ linked: 1, booking: 1, verified: 1, whatsapp: 1, facebook: 1 });
    expect(pageRange(2, 50, 120)).toEqual({ from: 51, to: 100 });
    expect(pageRange(1, 50, 0)).toEqual({ from: 0, to: 0 });
    expect(shortDate("2026-10-05T10:00:00Z")).toBe("05.10.2026");
    expect(shortDate(null)).toBe("—");
  });
});
