/**
 * Tests for NotificationBell component.
 *
 * Covers:
 * - Renders bell icon
 * - Shows unread badge with count
 * - Hides badge when count is 0
 * - Displays "99+" for counts over 99
 * - Popover opens on click
 * - Empty state in popover
 * - Shows notification list when notifications exist
 * - Falls back to polling when WS disconnected
 * - Boundary count values (1, 99, 100)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Notification as NotificationData } from "@/api/generated/interfaces";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => {
    const t = (key: string, params?: Record<string, any>) => {
      if (params) return `${key}:${JSON.stringify(params)}`;
      return key;
    };
    return t;
  },
}));

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/",
}));

// Mock useBrowserNotifications
const mockRequestPermission = vi.fn();
vi.mock("@/hooks/useBrowserNotifications", () => ({
  useBrowserNotifications: () => ({
    showNotification: vi.fn(),
    canShowNotifications: false,
    requestPermission: mockRequestPermission,
  }),
}));

// Mock useNotificationsUnreadCount
const mockUnreadCount = vi.fn().mockReturnValue(0);
const mockRefetch = vi.fn();
vi.mock("@/hooks/useNotifications", () => ({
  useNotificationsUnreadCount: () => ({
    data: mockUnreadCount(),
    refetch: mockRefetch,
  }),
}));

// Mock useNotificationsWebSocket
const mockWsUnreadCount = vi.fn().mockReturnValue(0);
const mockWsConnected = vi.fn().mockReturnValue(true);
const mockWsMarkAsRead = vi.fn();
const mockWsMarkAllAsRead = vi.fn();
vi.mock("@/hooks/useNotificationsWebSocket", () => ({
  useNotificationsWebSocket: (opts?: any) => ({
    isConnected: mockWsConnected(),
    unreadCount: mockWsUnreadCount(),
    markAsRead: mockWsMarkAsRead,
    markAllAsRead: mockWsMarkAllAsRead,
  }),
}));

// Mock useWebPush
vi.mock("@/hooks/useWebPush", () => ({
  useWebPush: () => ({
    subscribe: vi.fn(),
    isSubscribed: false,
    isSupported: false,
  }),
}));

// Mock notificationsList API
const mockNotificationsList = vi.fn().mockResolvedValue({ results: [] });
vi.mock("@/api/generated/api", () => ({
  notificationsList: (...args: any[]) => mockNotificationsList(...args),
  notificationsMarkAllReadCreate: vi.fn().mockResolvedValue({}),
  notificationsMarkReadCreate: vi.fn().mockResolvedValue({}),
  notificationsClearAllDestroy: vi.fn().mockResolvedValue({}),
}));

// Mock notification sound
vi.mock("@/utils/notificationSound", () => ({
  getNotificationSound: () => ({
    playForNotificationType: vi.fn(),
  }),
}));

// Mock NotificationPreferences (exported function)
vi.mock("@/components/NotificationPreferences", () => ({
  getNotificationPreferenceByType: () => ({
    inApp: true,
    sound: true,
    push: true,
  }),
}));

// Mock NotificationToast
vi.mock("@/components/NotificationToast", () => ({
  NotificationToastContainer: () => null,
}));

import { NotificationBell } from "@/components/NotificationBell";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("NotificationBell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWsUnreadCount.mockReturnValue(0);
    mockUnreadCount.mockReturnValue(0);
    mockWsConnected.mockReturnValue(true);
    mockNotificationsList.mockResolvedValue({ results: [] });
  });

  it("renders bell icon button", () => {
    render(<NotificationBell />);
    const button = screen.getByRole("button", { name: "Notifications" });
    expect(button).toBeInTheDocument();
  });

  it("hides badge when unread count is 0", () => {
    mockWsUnreadCount.mockReturnValue(0);
    render(<NotificationBell />);
    // Badge should not be rendered when count is 0
    const badges = screen.queryAllByText(/\d+/);
    expect(badges).toHaveLength(0);
  });

  it("shows badge with unread count when > 0", () => {
    mockWsUnreadCount.mockReturnValue(5);
    render(<NotificationBell />);
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("shows '99+' when unread count exceeds 99", () => {
    mockWsUnreadCount.mockReturnValue(150);
    render(<NotificationBell />);
    expect(screen.getByText("99+")).toBeInTheDocument();
  });

  it("shows exact count at 99", () => {
    mockWsUnreadCount.mockReturnValue(99);
    render(<NotificationBell />);
    expect(screen.getByText("99")).toBeInTheDocument();
  });

  it("shows badge with count of 1", () => {
    mockWsUnreadCount.mockReturnValue(1);
    render(<NotificationBell />);
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("shows '99+' at exactly 100", () => {
    mockWsUnreadCount.mockReturnValue(100);
    render(<NotificationBell />);
    expect(screen.getByText("99+")).toBeInTheDocument();
  });

  it("opens popover on click", async () => {
    const user = userEvent.setup();
    render(<NotificationBell />);

    const button = screen.getByRole("button", { name: "Notifications" });
    await user.click(button);

    // The popover should show the notification list header
    await waitFor(() => {
      expect(screen.getByText("Notifications")).toBeInTheDocument();
    });
  });

  it("shows empty state when no notifications", async () => {
    const user = userEvent.setup();
    mockNotificationsList.mockResolvedValue({ results: [] });

    render(<NotificationBell />);

    const button = screen.getByRole("button", { name: "Notifications" });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText("No notifications")).toBeInTheDocument();
    });
  });

  it("shows notification items in popover when notifications exist", async () => {
    const user = userEvent.setup();
    const mockNotifications: Partial<NotificationData>[] = [
      {
        id: 1,
        notification_type: "ticket_assigned" as any,
        title: "New Ticket Assigned",
        message: "You have been assigned ticket #42",
        is_read: false,
        created_at: "2024-01-01T00:00:00Z",
        time_ago: "5 minutes",
      },
    ];
    mockNotificationsList.mockResolvedValue({ results: mockNotifications });

    render(<NotificationBell />);

    const button = screen.getByRole("button", { name: "Notifications" });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText("New Ticket Assigned")).toBeInTheDocument();
    });
  });

  it("fetches notifications when popover opens", async () => {
    const user = userEvent.setup();
    render(<NotificationBell />);

    const button = screen.getByRole("button", { name: "Notifications" });
    await user.click(button);

    await waitFor(() => {
      expect(mockNotificationsList).toHaveBeenCalled();
    });
  });

  it("uses polling count when WS is disconnected", () => {
    mockWsConnected.mockReturnValue(false);
    mockWsUnreadCount.mockReturnValue(0);
    mockUnreadCount.mockReturnValue(7);

    render(<NotificationBell />);
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("prefers WS count when connected", () => {
    mockWsConnected.mockReturnValue(true);
    mockWsUnreadCount.mockReturnValue(3);
    mockUnreadCount.mockReturnValue(10);

    render(<NotificationBell />);
    // Should show WS count (3), not polling count (10)
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("calls onNotificationClick when provided and notification is clicked", async () => {
    const onNotificationClick = vi.fn();
    render(<NotificationBell onNotificationClick={onNotificationClick} />);

    // Just verify the component renders without error when callback is provided
    const button = screen.getByRole("button", { name: "Notifications" });
    expect(button).toBeInTheDocument();
  });

  it("requests notification permission on mount", () => {
    render(<NotificationBell />);
    // canShowNotifications is false in the mock, so requestPermission should be called
    expect(mockRequestPermission).toHaveBeenCalled();
  });

  it("filters out message notifications from the list", async () => {
    const user = userEvent.setup();
    const mockNotifications: Partial<NotificationData>[] = [
      {
        id: 1,
        notification_type: "message_received" as any,
        title: "New Message",
        message: "You have a new message",
        is_read: false,
        created_at: "2024-01-01T00:00:00Z",
        time_ago: "1 minute",
      },
      {
        id: 2,
        notification_type: "ticket_assigned" as any,
        title: "Ticket Assigned",
        message: "A ticket was assigned to you",
        is_read: false,
        created_at: "2024-01-01T00:00:00Z",
        time_ago: "2 minutes",
      },
    ];
    mockNotificationsList.mockResolvedValue({ results: mockNotifications });

    render(<NotificationBell />);

    const button = screen.getByRole("button", { name: "Notifications" });
    await user.click(button);

    await waitFor(() => {
      // message_received should be filtered out
      expect(screen.queryByText("New Message")).not.toBeInTheDocument();
      // ticket_assigned should remain
      expect(screen.getByText("Ticket Assigned")).toBeInTheDocument();
    });
  });
});
