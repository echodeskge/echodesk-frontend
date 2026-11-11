import type { Feature } from "@/types/package";

/**
 * Fallback feature list used when the server-side fetch to the Django API
 * fails during page rendering (network blip, API deploy, etc.). Better to
 * ship a stale-but-real GEL catalogue in the HTML than a spinner to
 * crawlers.
 *
 * Snapshot of `GET https://api.echodesk.ge/api/features/` taken 2026-11-11
 * (keys, names, categories, prices and ids as served). Prices are edited in
 * Django admin, so re-snapshot when they change. The landing CTAs carry
 * feature KEYS (never ids), so a stale id here cannot break signup.
 */
const SNAPSHOT_AT = "2026-11-11T00:00:00Z";

function feature(
  id: number,
  key: string,
  name: string,
  category: string,
  category_display: string,
  price: string,
  sort_order: number,
  description = "",
  icon = "",
): Feature {
  return {
    id,
    key,
    name,
    description,
    category,
    category_display,
    icon,
    price_per_user_gel: price,
    sort_order,
    is_active: true,
    created_at: SNAPSHOT_AT,
    updated_at: SNAPSHOT_AT,
  };
}

export const FALLBACK_FEATURES: Feature[] = [
  feature(44, "advanced_analytics", "Advanced Analytics", "analytics", "Analytics & Reporting", "0.00", 103),
  feature(
    8,
    "ip_calling",
    "IP Calling",
    "communication",
    "Communication",
    "9.00",
    40,
    "VoIP calling functionality with SIP configuration and call management",
  ),
  feature(46, "sip_calling", "SIP Calling", "communication", "Communication", "0.00", 111),
  feature(
    6,
    "leave_management",
    "Leave Management",
    "core",
    "Core Features",
    "4.00",
    0,
    "Employee leave and absence management system with multi-level approvals",
  ),
  feature(
    1,
    "ticket_management",
    "Ticket management",
    "core",
    "Core Features",
    "9.00",
    0,
    "Ticket management boards, permissions and so on.",
  ),
  feature(2, "user_management", "User management", "core", "Core Features", "1.00", 1),
  feature(
    3,
    "ecommerce_crm",
    "E-commerce CRM",
    "core",
    "Core Features",
    "19.00",
    50,
    "Complete product management system with multilanguage support, dynamic attributes, inventory tracking, and variants",
  ),
  feature(
    9,
    "invoice_management",
    "Invoice Management",
    "core",
    "Core Features",
    "5.00",
    50,
    "Create, manage, and track invoices with payment tracking, PDF generation, and email sending. Includes support for e-commerce products, custom materials, and manual line items.",
  ),
  feature(
    5,
    "booking_management",
    "Booking Management",
    "core",
    "Core Features",
    "19.00",
    60,
    "Complete booking system for service-based businesses with staff scheduling, client portal, payments, and recurring bookings",
  ),
  feature(
    4,
    "settings",
    "Settings",
    "core",
    "Core Features",
    "0.00",
    100,
    "Access to system settings including tenant configuration, item lists, ticket forms, and subscription management",
  ),
  feature(45, "order_management", "Order Management", "core", "Core Features", "0.00", 105),
  feature(
    7,
    "social_integrations",
    "Social Media Integrations",
    "integration",
    "Integrations",
    "19.00",
    30,
    "Connect and manage social media accounts (Facebook, Instagram) for messaging and customer engagement",
  ),
  feature(
    43,
    "ai_companion",
    "AI Companion",
    "integration",
    "Integrations",
    "15.00",
    35,
    "AI assistant for social chats: automatic customer replies guided by your instructions, human handoff, and on-demand conversation summaries",
    "🤖",
  ),
];
