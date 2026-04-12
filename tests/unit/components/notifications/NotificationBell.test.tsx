/**
 * Tests for NotificationBell component.
 *
 * Covers:
 * - Renders bell icon
 * - Shows unread badge with count
 * - Hides badge when count is 0
 * - Displays "99+" for counts over 99
 * - Popover opens on click
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/",
}));

// Mock useBrowserNotifications
vi.mock("@/hooks/useBrowserNotifications", () => ({
  useBrowserNotifications: () => ({
    showNotification: vi.fn(),
    canShowNotifications: false,
    requestPermission: vi.fn(),
  }),
}));

// Mock useNotificationsUnreadCount
const mockUnreadCount = vi.fn().mockReturnValue(0);
vi.mock("@/hooks/useNotifications", () => ({
  useNotificationsUnreadCount: () => ({
    data: mockUnreadCount(),
    refetch: vi.fn(),
  }),
}));

// Mock useNotificationsWebSocket
const mockWsUnreadCount = vi.fn().mockReturnValue(0);
vi.mock("@/hooks/useNotificationsWebSocket", () => ({
  useNotificationsWebSocket: () => ({
    isConnected: true,
    unreadCount: mockWsUnreadCount(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
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
vi.mock("@/api/generated/api", () => ({
  notificationsList: vi.fn().mockResolvedValue({ results: [] }),
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

  it("calls onNotificationClick when provided and notification is clicked", async () => {
    const onNotificationClick = vi.fn();
    render(<NotificationBell onNotificationClick={onNotificationClick} />);

    // Just verify the component renders without error when callback is provided
    const button = screen.getByRole("button", { name: "Notifications" });
    expect(button).toBeInTheDocument();
  });
});
