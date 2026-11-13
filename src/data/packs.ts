/**
 * Ready-made packs shown as cards on the landing page. A pack is only a
 * preset of module keys; its price is the live sum of those modules (plus
 * the workspace) at render time, so an admin price edit never leaves a
 * stale number on the page. Hard-coding 44 / 47 / 100 anywhere is forbidden.
 */
/** `everything` is no longer a card (replaced by `builders`, 2026-11-13) but
 * stays a valid slug so older /registration?pack=everything links keep working. */
export type PackSlug = 'bookings' | 'shop' | 'callcentre' | 'builders' | 'everything';

export interface PackDef {
  slug: PackSlug;
  /** Module keys (workspace keys are implied and added by the pricing lib). */
  keys: readonly string[];
  /** "Popular add-ons" chips printed under the card. */
  addonKeys: readonly string[];
  /** Gets the ring + "Most popular" badge. */
  highlight?: boolean;
}

export const PACKS: readonly PackDef[] = [
  {
    slug: 'bookings',
    keys: ['booking_management', 'social_integrations', 'invoice_management'],
    addonKeys: ['ai_companion', 'ip_calling', 'ticket_management'],
  },
  {
    slug: 'shop',
    keys: ['ecommerce_crm', 'social_integrations', 'invoice_management'],
    addonKeys: ['ai_companion', 'ticket_management', 'leave_management'],
  },
  {
    slug: 'callcentre',
    keys: [
      'ticket_management',
      'social_integrations',
      'ip_calling',
      'invoice_management',
      'leave_management',
    ],
    addonKeys: ['ai_companion', 'booking_management', 'ecommerce_crm'],
    highlight: true,
  },
  {
    // Construction / real-estate developers (the builders sales deck):
    // leads from Facebook/Instagram/WhatsApp in one inbox, site visits
    // booked online, every request a task, calls, invoices.
    slug: 'builders',
    keys: [
      'social_integrations',
      'booking_management',
      'ticket_management',
      'ip_calling',
      'invoice_management',
    ],
    addonKeys: ['ai_companion', 'leave_management', 'ecommerce_crm'],
  },
];

/** "Everything" = every sellable module the API returns. Not shown as a card
 * any more; kept for deep links and the registration flow. */
export const EVERYTHING_SLUG: PackSlug = 'everything';

export const PACK_SLUGS: readonly PackSlug[] = [...PACKS.map((p) => p.slug), EVERYTHING_SLUG];

export function isPackSlug(value: string | null | undefined): value is PackSlug {
  return !!value && (PACK_SLUGS as readonly string[]).includes(value);
}
