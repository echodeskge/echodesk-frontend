"use client";

/**
 * `/tickets/[id]`. Picks the screen (plan §6 feature flags): the new detail
 * (FE-09…FE-13) when `flags.detailRedesignEnabled`, otherwise the old
 * `ticket-detail/*` screen, which stays reachable until W4.
 */
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { flags } from "../_lib/flags";
import { DetailScreen, parseTicketId } from "./_components/detail-screen";

// The old screen is loaded only when the flag is off, so it stays out of the
// new detail's first-load bundle (W3 bundle delta).
const TicketDetailPage = dynamic(() => import("@/components/ticket-detail/TicketDetailPage").then((m) => m.TicketDetailPage));

export default function TicketPage() {
  const params = useParams<{ id: string }>();
  if (!flags.detailRedesignEnabled) {
    return (
      <div className="min-h-screen bg-background w-full">
        <TicketDetailPage />
      </div>
    );
  }
  return <DetailScreen ticketId={parseTicketId(params?.id) ?? 0} />;
}
