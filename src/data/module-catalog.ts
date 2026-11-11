import type { LucideIcon } from 'lucide-react';
import {
  Bot,
  CalendarCheck,
  ClipboardList,
  FileText,
  Inbox,
  Phone,
  Plane,
  ShoppingBag,
} from 'lucide-react';

/**
 * Presentation metadata for the sellable modules, keyed by the backend
 * `Feature.key`. Prices NEVER live here — they come from `GET /api/features/`
 * (edited in Django admin) and are joined by key at render time.
 *
 * - A key listed here but missing from the API is not rendered.
 * - A sellable key returned by the API but missing here still renders as a
 *   plain card with the API name/description (never drop a sellable feature).
 */
export interface ModuleMeta {
  /** Display order in the builder / comparison table. */
  order: number;
  icon: LucideIcon;
  /** Modules that must be on for this one to work (auto-enabled). */
  requires?: readonly string[];
  /** Zero-price stubs that ride along in the registration payload. */
  attaches?: readonly string[];
}

export const MODULE_CATALOG: Record<string, ModuleMeta> = {
  ticket_management: { order: 1, icon: ClipboardList },
  social_integrations: { order: 2, icon: Inbox },
  ai_companion: { order: 3, icon: Bot, requires: ['social_integrations'] },
  ip_calling: { order: 4, icon: Phone, attaches: ['sip_calling'] },
  booking_management: { order: 5, icon: CalendarCheck },
  ecommerce_crm: { order: 6, icon: ShoppingBag, attaches: ['order_management'] },
  invoice_management: { order: 7, icon: FileText },
  leave_management: { order: 8, icon: Plane },
};

/**
 * "Workspace": what the backend forces into every subscription
 * (`user_management` 1 ₾ + `settings` 0 ₾) plus the free analytics stub.
 * Shown as a strip, never as a toggle.
 */
export const WORKSPACE_KEYS: readonly string[] = ['user_management', 'settings', 'advanced_analytics'];

/** Zero-price stubs hidden from the page; auto-attached via WORKSPACE_KEYS / `attaches`. */
export const HIDDEN_ZERO_PRICE_KEYS: readonly string[] = [
  'settings',
  'advanced_analytics',
  'order_management',
  'sip_calling',
];

/** Preselected in the calculator (decision D5: tickets is the first module). */
export const DEFAULT_MODULE_KEYS: readonly string[] = ['ticket_management'];
