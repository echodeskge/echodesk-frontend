"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ticketsRetrieve } from "@/api/generated/api";
import type { Ticket } from "@/api/generated/interfaces";
import { TicketDetailView } from "@/components/TicketDetailView";
import { TicketDetailSkeleton } from "@/components/TicketDetailSkeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const ticketId = params.id as string;

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        setLoading(true);
        const data = await ticketsRetrieve(ticketId);
        setTicket(data);
      } catch (err) {
        console.error("Error fetching ticket:", err);
        setError("Failed to load ticket");
      } finally {
        setLoading(false);
      }
    };

    if (ticketId) {
      fetchTicket();
    }
  }, [ticketId]);

  if (loading) {
    return <TicketDetailSkeleton />;
  }

  if (error || !ticket) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <p className="text-sm text-destructive">{error || "Ticket not found"}</p>
          <Button onClick={() => router.back()} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background w-full">
      <div className="border-b">
        <div className="w-full max-w-7xl mx-auto flex h-14 items-center gap-4 px-4">
          <Button onClick={() => router.back()} variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-lg font-semibold">Ticket Detail</h1>
        </div>
      </div>

      <TicketDetailView ticket={ticket} onUpdate={setTicket} />
    </div>
  );
}
