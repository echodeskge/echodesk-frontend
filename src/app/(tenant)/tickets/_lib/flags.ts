/**
 * Tickets redesign rollout flags. FE-INT flips these, one commit per flag,
 * so a wave can be turned off without a revert.
 *
 * - listViewEnabled: shows the Board/List segment and the sidebar views (W2).
 * - detailRedesignEnabled: `/tickets/[id]` renders the new detail screen (W3);
 *   while false the old `ticket-detail/*` screen stays.
 */
export interface TicketsFlags {
  listViewEnabled: boolean;
  detailRedesignEnabled: boolean;
}

export const flags: TicketsFlags = {
  listViewEnabled: true,
  detailRedesignEnabled: false,
};
