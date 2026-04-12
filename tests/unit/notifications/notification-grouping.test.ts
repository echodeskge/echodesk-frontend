/**
 * Tests for notification grouping logic extracted from NotificationList.tsx.
 *
 * Covers:
 * - Same ticket_id within hour -> grouped
 * - Different ticket_ids -> separate
 * - Group count badge calculation
 * - Empty array -> empty result
 * - Single notification -> no grouping
 */

import { describe, it, expect } from "vitest";
import type { Notification } from "@/api/generated/interfaces";

// ---------------------------------------------------------------------------
// Extract the grouping logic from NotificationList.tsx
// (duplicated here for unit testing since it's a module-scoped function)
// ---------------------------------------------------------------------------

interface GroupedNotification extends Notification {
  _groupCount?: number;
  _groupItems?: Notification[];
}

function groupNotifications(notifications: Notification[]): GroupedNotification[] {
  const groups: Map<string, Notification[]> = new Map();

  for (const notif of notifications) {
    const key = notif.ticket_id
      ? `ticket-${notif.ticket_id}`
      : `${notif.notification_type}-${Math.floor(new Date(notif.created_at).getTime() / 3600000)}`;

    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(notif);
  }

  return Array.from(groups.values()).map((group) => {
    if (group.length === 1) return group[0];
    const sorted = [...group].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    return { ...sorted[0], _groupCount: group.length, _groupItems: sorted };
  });
}

// ---------------------------------------------------------------------------
// Factory helper
// ---------------------------------------------------------------------------

let idCounter = 1;

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  const id = idCounter++;
  return {
    id,
    user: 1,
    user_name: "Test User",
    notification_type: {} as Notification["notification_type"],
    title: `Notification ${id}`,
    message: `Message for ${id}`,
    is_read: false,
    read_at: "",
    created_at: "2024-06-01T10:00:00Z",
    time_ago: "1m",
    ...overrides,
  };
}

// Reset counter before each describe block
beforeEach(() => {
  idCounter = 1;
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Notification Grouping - Empty and single", () => {
  it("returns empty array for empty input", () => {
    const result = groupNotifications([]);
    expect(result).toEqual([]);
  });

  it("returns single notification without grouping metadata", () => {
    const notif = makeNotification({ ticket_id: 42 });
    const result = groupNotifications([notif]);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(notif.id);
    expect(result[0]._groupCount).toBeUndefined();
    expect(result[0]._groupItems).toBeUndefined();
  });
});

describe("Notification Grouping - Same ticket_id", () => {
  it("groups notifications with the same ticket_id", () => {
    const n1 = makeNotification({
      ticket_id: 42,
      created_at: "2024-06-01T10:00:00Z",
    });
    const n2 = makeNotification({
      ticket_id: 42,
      created_at: "2024-06-01T10:30:00Z",
    });
    const n3 = makeNotification({
      ticket_id: 42,
      created_at: "2024-06-01T11:30:00Z",
    });

    const result = groupNotifications([n1, n2, n3]);

    // All three share ticket_id=42, so they form one group
    expect(result).toHaveLength(1);
    expect(result[0]._groupCount).toBe(3);
    expect(result[0]._groupItems).toHaveLength(3);
  });

  it("returns the most recent notification as the group representative", () => {
    const older = makeNotification({
      ticket_id: 42,
      title: "Older",
      created_at: "2024-06-01T10:00:00Z",
    });
    const newer = makeNotification({
      ticket_id: 42,
      title: "Newer",
      created_at: "2024-06-01T12:00:00Z",
    });

    const result = groupNotifications([older, newer]);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Newer");
    expect(result[0]._groupCount).toBe(2);
  });

  it("sorts _groupItems by most recent first", () => {
    const n1 = makeNotification({ ticket_id: 5, created_at: "2024-06-01T08:00:00Z" });
    const n2 = makeNotification({ ticket_id: 5, created_at: "2024-06-01T12:00:00Z" });
    const n3 = makeNotification({ ticket_id: 5, created_at: "2024-06-01T10:00:00Z" });

    const result = groupNotifications([n1, n2, n3]);

    expect(result[0]._groupItems![0].created_at).toBe("2024-06-01T12:00:00Z");
    expect(result[0]._groupItems![1].created_at).toBe("2024-06-01T10:00:00Z");
    expect(result[0]._groupItems![2].created_at).toBe("2024-06-01T08:00:00Z");
  });
});

describe("Notification Grouping - Different ticket_ids", () => {
  it("keeps notifications with different ticket_ids separate", () => {
    const n1 = makeNotification({ ticket_id: 42 });
    const n2 = makeNotification({ ticket_id: 43 });

    const result = groupNotifications([n1, n2]);

    expect(result).toHaveLength(2);
    expect(result[0]._groupCount).toBeUndefined();
    expect(result[1]._groupCount).toBeUndefined();
  });

  it("groups per ticket_id independently", () => {
    const a1 = makeNotification({ ticket_id: 10, created_at: "2024-06-01T10:00:00Z" });
    const a2 = makeNotification({ ticket_id: 10, created_at: "2024-06-01T10:30:00Z" });
    const b1 = makeNotification({ ticket_id: 20, created_at: "2024-06-01T10:00:00Z" });

    const result = groupNotifications([a1, a2, b1]);

    expect(result).toHaveLength(2);

    const groupA = result.find((r) => r.ticket_id === 10);
    const groupB = result.find((r) => r.ticket_id === 20);

    expect(groupA!._groupCount).toBe(2);
    expect(groupB!._groupCount).toBeUndefined();
  });
});

describe("Notification Grouping - No ticket_id (type + time bucket)", () => {
  it("groups by notification_type and 1-hour time bucket when no ticket_id", () => {
    const notifType = "system_alert" as unknown as Notification["notification_type"];
    const n1 = makeNotification({
      notification_type: notifType,
      created_at: "2024-06-01T10:00:00Z",
    });
    const n2 = makeNotification({
      notification_type: notifType,
      created_at: "2024-06-01T10:45:00Z",
    });

    const result = groupNotifications([n1, n2]);

    // Both are in the same hour bucket (10:xx UTC)
    expect(result).toHaveLength(1);
    expect(result[0]._groupCount).toBe(2);
  });

  it("separates same-type notifications in different hour buckets", () => {
    const notifType = "system_alert" as unknown as Notification["notification_type"];
    const n1 = makeNotification({
      notification_type: notifType,
      created_at: "2024-06-01T10:00:00Z",
    });
    const n2 = makeNotification({
      notification_type: notifType,
      created_at: "2024-06-01T11:30:00Z",
    });

    const result = groupNotifications([n1, n2]);

    // Different hour buckets -> separate groups
    expect(result).toHaveLength(2);
  });

  it("separates different types in same hour bucket", () => {
    const typeA = "type_a" as unknown as Notification["notification_type"];
    const typeB = "type_b" as unknown as Notification["notification_type"];

    const n1 = makeNotification({
      notification_type: typeA,
      created_at: "2024-06-01T10:00:00Z",
    });
    const n2 = makeNotification({
      notification_type: typeB,
      created_at: "2024-06-01T10:30:00Z",
    });

    const result = groupNotifications([n1, n2]);

    expect(result).toHaveLength(2);
  });
});

describe("Notification Grouping - Group count badge calculation", () => {
  it("group count equals the number of notifications in the group", () => {
    const notifications = [
      makeNotification({ ticket_id: 1, created_at: "2024-06-01T10:00:00Z" }),
      makeNotification({ ticket_id: 1, created_at: "2024-06-01T10:10:00Z" }),
      makeNotification({ ticket_id: 1, created_at: "2024-06-01T10:20:00Z" }),
      makeNotification({ ticket_id: 1, created_at: "2024-06-01T10:30:00Z" }),
      makeNotification({ ticket_id: 1, created_at: "2024-06-01T10:40:00Z" }),
    ];

    const result = groupNotifications(notifications);

    expect(result).toHaveLength(1);
    expect(result[0]._groupCount).toBe(5);
  });

  it("no _groupCount property on single notifications", () => {
    const notif = makeNotification({ ticket_id: 99 });
    const result = groupNotifications([notif]);

    expect(result[0]).not.toHaveProperty("_groupCount");
  });
});

describe("Notification Grouping - Mixed scenarios", () => {
  it("handles mix of ticket-based and type-based grouping", () => {
    const sysType = "system" as unknown as Notification["notification_type"];
    const notifications = [
      // Two notifications for ticket 42
      makeNotification({ ticket_id: 42, created_at: "2024-06-01T10:00:00Z" }),
      makeNotification({ ticket_id: 42, created_at: "2024-06-01T10:30:00Z" }),
      // One standalone notification for ticket 43
      makeNotification({ ticket_id: 43, created_at: "2024-06-01T10:00:00Z" }),
      // Two system notifications in same hour (no ticket_id)
      makeNotification({ notification_type: sysType, created_at: "2024-06-01T10:00:00Z" }),
      makeNotification({ notification_type: sysType, created_at: "2024-06-01T10:15:00Z" }),
    ];

    const result = groupNotifications(notifications);

    // 3 groups: ticket-42 (2), ticket-43 (1), system-same-hour (2)
    expect(result).toHaveLength(3);

    const ticket42Group = result.find((r) => r.ticket_id === 42);
    expect(ticket42Group!._groupCount).toBe(2);

    const ticket43Group = result.find((r) => r.ticket_id === 43);
    expect(ticket43Group!._groupCount).toBeUndefined();
  });
});
