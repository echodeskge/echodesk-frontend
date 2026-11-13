import type { Feature } from "@/types/package";

/**
 * A catalogue shaped like `GET /api/features/` but with prices that differ
 * from the 2026-11-11 snapshot, so a test that passes proves the page
 * computes from the API and not from anything hard-coded.
 */
export function mockFeature(
  id: number,
  key: string,
  name: string,
  price: string,
  extra: Partial<Feature> = {},
): Feature {
  return {
    id,
    key,
    name,
    description: `${name} description from API`,
    category: "core",
    category_display: "Core Features",
    icon: "",
    price_per_user_gel: price,
    sort_order: id,
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...extra,
  };
}

/** Live-like prices (2026-11-11): bookings/shop 44, call centre 47, builders 62, everything 100. */
export const LIVE_LIKE: Feature[] = [
  mockFeature(44, "advanced_analytics", "Advanced Analytics", "0.00"),
  mockFeature(8, "ip_calling", "IP Calling", "9.00"),
  mockFeature(46, "sip_calling", "SIP Calling", "0.00"),
  mockFeature(6, "leave_management", "Leave Management", "4.00"),
  mockFeature(1, "ticket_management", "Ticket management", "9.00"),
  mockFeature(2, "user_management", "User management", "1.00"),
  mockFeature(3, "ecommerce_crm", "E-commerce CRM", "19.00"),
  mockFeature(9, "invoice_management", "Invoice Management", "5.00"),
  mockFeature(5, "booking_management", "Booking Management", "19.00"),
  mockFeature(4, "settings", "Settings", "0.00"),
  mockFeature(45, "order_management", "Order Management", "0.00"),
  mockFeature(7, "social_integrations", "Social Media Integrations", "19.00"),
  mockFeature(43, "ai_companion", "AI Companion", "15.00"),
];

/**
 * Admin raised bookings to 20 and the workspace to 2: bookings pack = 2+20+19+5 = 46,
 * shop = 2+19+19+5 = 45, call centre = 2+9+19+9+5+4 = 48, builders = 2+19+20+9+9+5 = 64,
 * everything = 2+9+19+15+9+20+19+5+4 = 102.
 */
export const EDITED: Feature[] = LIVE_LIKE.map((f) => {
  if (f.key === "booking_management") return { ...f, price_per_user_gel: "20.00" };
  if (f.key === "user_management") return { ...f, price_per_user_gel: "2.00" };
  return f;
});
