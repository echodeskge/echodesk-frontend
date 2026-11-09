/**
 * Detail page section contracts (plan §4.5, FE-09).
 *
 * FE-09 owns the shell (`detail-screen.tsx`): the header bridge, the status
 * track, the two panes and where each section is mounted. The sections are
 * stubs in FE-09's first commit and are replaced by their owners, who keep the
 * exported component names and these props:
 *
 * | Component        | File                                          | Owner |
 * |------------------|-----------------------------------------------|-------|
 * | `DetailMain`     | `[id]/_components/main/detail-main.tsx`       | FE-10 |
 * | `ActivityFeed`   | `[id]/_components/activity/activity-feed.tsx` | FE-11 |
 * | `Composer`       | `[id]/_components/composer/composer.tsx`      | FE-11 |
 * | `PropertiesRail` | `[id]/_components/rail/properties-rail.tsx`   | FE-12 |
 * | `TimerButton`    | `tickets/_components/timer/timer-button.tsx`  | FE-13 |
 * | `TimeTab`        | `tickets/_components/timer/time-tab.tsx`      | FE-13 |
 * | `TimeRow`        | `tickets/_components/timer/time-row.tsx`      | FE-13 |
 *
 * Where the shell mounts them (desktop ≥ lg; below lg the panes stack and the
 * page scrolls as one):
 *
 * ```
 * header slots   back / #id · x of n            ↑ ↓ | <TimerButton/> 🔗 ⋮
 * status track   (FE-09)
 * ┌ main (flex-1, scrolls; padding 24/40/32/40, 16 on mobile) ─┬ rail 300 ┐
 * │ ┌ column: max-width 780, flex-col, gap 22 ─────────────┐   │ <Properties│
 * │ │ <DetailMain/>     ← meta, title, description,         │   │  Rail/>    │
 * │ │                     checklist, attachments            │   │ (scrolls)  │
 * │ │ <ActivityFeed/>   ← tabs, timeline (renders <TimeTab/>)│   │ (renders   │
 * │ └───────────────────────────────────────────────────────┘   │ <TimeRow/>)│
 * │ <Composer/>  ← bottom of the main pane (sticky on mobile)    │            │
 * └──────────────────────────────────────────────────────────────┴───────────┘
 * ```
 *
 * Rules for section owners:
 * - `DetailMain` and `ActivityFeed` are direct children of the 22px-gap
 *   column. Return a Fragment of blocks (each block becomes a gap item) or a
 *   single block; don't add outer padding or a max-width.
 * - `Composer` owns its whole bar (border-top, background, the 12/40/14/40
 *   padding and the reduced mobile padding). The shell only positions it.
 * - `PropertiesRail` owns the rail's inner padding (8px 12px) and its
 *   sections; the shell provides the 300px `<aside>` with the left border
 *   (top border when stacked) and the scrolling.
 * - `TimerButton` renders inside the app header slot, which sits outside the
 *   route layout. The shell re-provides the route's intl messages around the
 *   slot, and react-query is global, so `useTranslations("ticketsScreen…")`
 *   and query hooks work there; the tickets realtime context does NOT (it is
 *   inert in the slot). Keep it 28px high (D104).
 * - Per-ticket rights come from `perms` (= `ticket.viewer_permissions`), never
 *   from re-implemented rules (WS10). Screen-level gates (create, delete
 *   boards, …) come from `useTicketPermissions()`.
 * - Data comes from the react-query hooks in `tickets/_hooks` and the keys in
 *   `tk` (§4.4). The shell keeps `tk.ticket(id)`, `tk.activity(id)`,
 *   `tk.history(id)`, `tk.timer(id)` and `tk.timerCurrent()` fresh from the
 *   board socket (`use-detail-realtime`), so sections don't subscribe to
 *   ticket-level board events themselves.
 * - New strings go to `src/i18n/pending/<wp>.json` (en + ka).
 */
import type { TicketDetail, ViewerPermissions } from "../../_lib/types";

/** Props of the sections that need the whole ticket. */
export interface DetailSectionProps {
  ticket: TicketDetail;
  perms: ViewerPermissions;
}

export type DetailMainProps = DetailSectionProps;
export type ComposerProps = DetailSectionProps;
export type PropertiesRailProps = DetailSectionProps;

export interface ActivityFeedProps {
  ticketId: number;
  perms: ViewerPermissions;
}

export interface TimerSectionProps {
  ticketId: number;
}

/** Everything off: used while a backend without `viewer_permissions` answers. */
export const NO_VIEWER_PERMISSIONS: ViewerPermissions = {
  can_edit: false,
  can_delete: false,
  can_move_to_closed: false,
  can_assign: false,
  can_change_groups: false,
  can_transfer: false,
  can_manage_payments: false,
  can_view_customer: false,
};

/** The viewer's rights on a ticket (B2's `viewer_permissions`, or nothing). */
export function viewerPermissionsOf(ticket: Pick<TicketDetail, "viewer_permissions"> | null | undefined): ViewerPermissions {
  return { ...NO_VIEWER_PERMISSIONS, ...(ticket?.viewer_permissions ?? {}) };
}
