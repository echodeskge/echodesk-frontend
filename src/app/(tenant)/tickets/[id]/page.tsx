"use client";

/**
 * `/tickets/[id]`. Picks the screen (plan §6 feature flags): the new detail
 * (FE-09…FE-13) when `flags.detailRedesignEnabled`, otherwise the old
 * `ticket-detail/*` screen, which stays reachable until W4.
 */
import { useParams } from "next/navigation";
import { TicketDetailPage } from "@/components/ticket-detail/TicketDetailPage";
import { flags } from "../_lib/flags";
import { DetailScreen, parseTicketId } from "./_components/detail-screen";

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
