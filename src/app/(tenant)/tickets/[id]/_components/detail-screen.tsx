"use client";

/**
 * The new ticket detail screen (plan FE-09, §3 Detail). FIRST-COMMIT SHELL:
 * the panes and section mounts are final (see `section-contracts.ts`); the
 * header bridge, status track, ⋮ menu and realtime land in later FE-09 commits.
 */
import { useTicket } from "../../_hooks/use-ticket";
import { DetailSkeleton } from "../../_components/primitives/skeletons";
import { useTicketsRealtime } from "../../_contexts/tickets-realtime-context";
import { ActivityFeed } from "./activity/activity-feed";
import { Composer } from "./composer/composer";
import { DetailMain } from "./main/detail-main";
import { PropertiesRail } from "./rail/properties-rail";
import { viewerPermissionsOf } from "./section-contracts";

/** `/tickets/[id]` param → a positive integer id, or null. */
export function parseTicketId(raw: string | string[] | undefined): number | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value || !/^\d+$/.test(value)) return null;
  const n = Number(value);
  return n > 0 ? n : null;
}

export function DetailScreen({ ticketId }: { ticketId: number }) {
  const { wsReady } = useTicketsRealtime();
  const query = useTicket(ticketId);
  const ticket = query.data;

  if (!ticket) {
    return (
      <div data-testid="ticket-detail" data-ws-ready={wsReady} className="flex min-h-0 flex-1 flex-col">
        <DetailSkeleton />
      </div>
    );
  }
  const perms = viewerPermissionsOf(ticket);
  return (
    <div data-testid="ticket-detail" data-ws-ready={wsReady} className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
        <div data-slot="detail-main-pane" className="flex min-w-0 flex-col lg:min-h-0 lg:flex-1">
          <div className="p-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:px-10 lg:pb-8 lg:pt-6">
            <div data-slot="detail-column" className="flex max-w-[780px] flex-col gap-[22px]">
              <DetailMain ticket={ticket} perms={perms} />
              <ActivityFeed ticketId={ticket.id} perms={perms} />
            </div>
          </div>
          <div data-slot="detail-composer" className="sticky bottom-0 z-10 shrink-0 bg-background lg:static">
            <Composer ticket={ticket} perms={perms} />
          </div>
        </div>
        <aside
          data-slot="detail-rail"
          className="w-full shrink-0 border-t lg:w-[300px] lg:overflow-y-auto lg:border-l lg:border-t-0"
        >
          <PropertiesRail ticket={ticket} perms={perms} />
        </aside>
      </div>
    </div>
  );
}
