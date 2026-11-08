/**
 * Notification deep links (W12): a ticket notification opens /tickets/{id};
 * anything else falls back to the notification's own link_url.
 */
import { describe, it, expect } from "vitest";
import { notificationRoute, webRouteForNotificationLink } from "@/lib/notificationLinks";

describe("notificationRoute", () => {
  it("sends ticket notifications to the ticket detail", () => {
    expect(notificationRoute({ ticket_id: 42 })).toBe("/tickets/42");
    expect(notificationRoute({ ticket_id: "7", link_url: "/bookings/3" })).toBe("/tickets/7");
  });

  it("falls back to link_url when there is no ticket", () => {
    expect(notificationRoute({ ticket_id: null, link_url: "/bookings/3" })).toBe("/bookings/3");
    expect(notificationRoute({ link_url: "/social/messages/abc" })).toBe("/social/messages/abc");
  });

  it("maps the low-stock product link through webRouteForNotificationLink", () => {
    expect(notificationRoute({ link_url: "/ecommerce/products/12" })).toBe("/ecommerce/products?edit=12");
  });

  it("returns null when there is nowhere to go", () => {
    expect(notificationRoute({})).toBeNull();
    expect(notificationRoute({ ticket_id: 0, link_url: "" })).toBeNull();
    expect(notificationRoute({ link_url: "https://evil.example/x" })).toBeNull();
  });
});

describe("webRouteForNotificationLink", () => {
  it("rewrites a single-product link to the products list edit sheet", () => {
    expect(webRouteForNotificationLink("/ecommerce/products/5/")).toBe("/ecommerce/products?edit=5");
    expect(webRouteForNotificationLink("/ecommerce/products/5?x=1")).toBe("/ecommerce/products?edit=5");
  });

  it("leaves other links unchanged", () => {
    expect(webRouteForNotificationLink("/tickets/9")).toBe("/tickets/9");
    expect(webRouteForNotificationLink("/ecommerce/products")).toBe("/ecommerce/products");
  });
});
